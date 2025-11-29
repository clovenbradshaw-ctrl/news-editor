<?php
/**
 * Plugin Name: Contributor ActivityStreams Event Store
 * Plugin URI: https://thecontributor.org
 * Description: Stores all content changes as ActivityStreams events for event sourcing architecture
 * Version: 1.0.0
 * Author: The Contributor
 * Author URI: https://thecontributor.org
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: contributor-activitystreams
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('CONTRIBUTOR_AS_VERSION', '1.0.0');
define('CONTRIBUTOR_AS_TABLE', 'activitystreams_events');

/**
 * Create custom database table for ActivityStreams events
 */
function contributor_create_event_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . CONTRIBUTOR_AS_TABLE;
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        event_id varchar(255) NOT NULL,
        event_type varchar(50) NOT NULL,
        actor_id bigint(20) NOT NULL,
        object_type varchar(50) NOT NULL,
        object_id bigint(20) NOT NULL,
        object_version int(11) DEFAULT 1,
        activity_data longtext NOT NULL,
        published_at datetime NOT NULL,
        sequence_number bigint(20) NOT NULL,
        checksum varchar(64) DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY event_id (event_id),
        KEY object_id (object_id),
        KEY event_type (event_type),
        KEY published_at (published_at),
        KEY sequence_number (sequence_number),
        KEY actor_id (actor_id)
    ) $charset_collate ENGINE=InnoDB;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);

    // Store version for future migrations
    update_option('contributor_as_db_version', CONTRIBUTOR_AS_VERSION);
}
register_activation_hook(__FILE__, 'contributor_create_event_table');

/**
 * Get next sequence number (atomic operation)
 */
function contributor_get_next_sequence() {
    global $wpdb;
    $table_name = $wpdb->prefix . CONTRIBUTOR_AS_TABLE;

    $wpdb->query("LOCK TABLES $table_name WRITE");
    $max = $wpdb->get_var("SELECT MAX(sequence_number) FROM $table_name");
    $next = ($max ? $max : 0) + 1;
    $wpdb->query("UNLOCK TABLES");

    return $next;
}

/**
 * Generate unique event ID
 */
function contributor_generate_event_id($type, $object_id) {
    return home_url('/activities/' . $type . '/' . $object_id . '/' . uniqid('', true));
}

/**
 * Build ActivityStreams actor object
 */
function contributor_build_actor($user_id) {
    $user = get_userdata($user_id);
    if (!$user) {
        return [
            'type' => 'Application',
            'id' => home_url('/system'),
            'name' => 'System'
        ];
    }

    return [
        'type' => 'Person',
        'id' => home_url('/users/' . $user_id),
        'name' => $user->display_name,
        'email' => $user->user_email,
        'url' => get_author_posts_url($user_id)
    ];
}

/**
 * Build ActivityStreams article object from post
 */
function contributor_build_article_object($post) {
    $featured_image = null;
    if (has_post_thumbnail($post->ID)) {
        $image_id = get_post_thumbnail_id($post->ID);
        $image_data = wp_get_attachment_image_src($image_id, 'full');
        if ($image_data) {
            $featured_image = [
                'type' => 'Image',
                'url' => $image_data[0],
                'width' => $image_data[1],
                'height' => $image_data[2]
            ];
        }
    }

    // Get categories
    $categories = [];
    $cats = get_the_category($post->ID);
    foreach ($cats as $cat) {
        $categories[] = [
            'type' => 'Category',
            'id' => get_category_link($cat->term_id),
            'name' => $cat->name,
            'slug' => $cat->slug
        ];
    }

    // Get tags
    $tags = [];
    $post_tags = get_the_tags($post->ID);
    if ($post_tags) {
        foreach ($post_tags as $tag) {
            $tags[] = [
                'type' => 'Tag',
                'id' => get_tag_link($tag->term_id),
                'name' => $tag->name,
                'slug' => $tag->slug
            ];
        }
    }

    // Get custom fields (ACF support)
    $custom_fields = [];
    if (function_exists('get_fields')) {
        $acf_fields = get_fields($post->ID);
        if ($acf_fields) {
            $custom_fields = $acf_fields;
        }
    }

    // Get Yoast SEO data if available
    $seo = [];
    if (function_exists('YoastSEO')) {
        $seo = [
            'metaDescription' => get_post_meta($post->ID, '_yoast_wpseo_metadesc', true),
            'focusKeyword' => get_post_meta($post->ID, '_yoast_wpseo_focuskw', true),
            'canonicalUrl' => get_post_meta($post->ID, '_yoast_wpseo_canonical', true)
        ];
    }

    return [
        'type' => 'Article',
        'id' => get_permalink($post->ID),
        'name' => $post->post_title,
        'content' => $post->post_content,
        'summary' => $post->post_excerpt,
        'published' => get_post_time('c', true, $post),
        'updated' => get_post_modified_time('c', true, $post),
        'attributedTo' => contributor_build_actor($post->post_author),
        'status' => $post->post_status,
        'image' => $featured_image,
        'tag' => array_merge($categories, $tags),
        'attachment' => [],
        'customFields' => $custom_fields,
        'seo' => $seo,
        'wordCount' => str_word_count(strip_tags($post->post_content)),
        'readingTime' => ceil(str_word_count(strip_tags($post->post_content)) / 200)
    ];
}

/**
 * Log an ActivityStreams event
 */
function contributor_log_event($event_type, $object_type, $object_id, $object_data, $actor_id = null, $extra_data = []) {
    global $wpdb;

    if (!$actor_id) {
        $actor_id = get_current_user_id();
    }

    $event_id = contributor_generate_event_id($event_type, $object_id);
    $published = current_time('mysql', true);
    $sequence = contributor_get_next_sequence();

    // Build full ActivityStreams activity
    $activity = array_merge([
        '@context' => [
            'https://www.w3.org/ns/activitystreams',
            'https://thecontributor.org/ns/editorial'
        ],
        'type' => $event_type,
        'id' => $event_id,
        'actor' => contributor_build_actor($actor_id),
        'object' => $object_data,
        'published' => gmdate('c', strtotime($published)),
        'sequence' => $sequence
    ], $extra_data);

    // Calculate checksum for data integrity
    $checksum = hash('sha256', wp_json_encode($activity));

    // Insert into events table
    $result = $wpdb->insert(
        $wpdb->prefix . CONTRIBUTOR_AS_TABLE,
        [
            'event_id' => $event_id,
            'event_type' => $event_type,
            'actor_id' => $actor_id,
            'object_type' => $object_type,
            'object_id' => $object_id,
            'activity_data' => wp_json_encode($activity),
            'published_at' => $published,
            'sequence_number' => $sequence,
            'checksum' => $checksum
        ],
        ['%s', '%s', '%d', '%s', '%d', '%s', '%s', '%d', '%s']
    );

    if ($result) {
        // Fire action for external integrations (cache invalidation, webhooks, etc.)
        do_action('contributor_event_logged', $activity, $event_type, $object_id);
    }

    return $result ? $event_id : false;
}

/**
 * Hook into WordPress save_post action
 */
function contributor_handle_save_post($post_id, $post, $update) {
    // Don't log autosaves or revisions
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return;
    }

    // Only log for supported post types
    $supported_types = apply_filters('contributor_supported_post_types', ['post', 'page', 'article']);
    if (!in_array($post->post_type, $supported_types)) {
        return;
    }

    // Prevent infinite loops
    if (defined('CONTRIBUTOR_SAVING_EVENT')) {
        return;
    }
    define('CONTRIBUTOR_SAVING_EVENT', true);

    $event_type = $update ? 'Update' : 'Create';
    $object_data = contributor_build_article_object($post);

    // Get version number
    global $wpdb;
    $version = $wpdb->get_var($wpdb->prepare(
        "SELECT MAX(object_version) FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . " WHERE object_id = %d",
        $post_id
    ));
    $version = ($version ? $version : 0) + 1;

    contributor_log_event(
        $event_type,
        'Article',
        $post_id,
        $object_data,
        get_current_user_id(),
        ['version' => $version]
    );

    // Fire cache invalidation action
    do_action('contributor_invalidate_cache', $post_id, $post);
}
add_action('save_post', 'contributor_handle_save_post', 10, 3);

/**
 * Hook into post status transitions
 */
function contributor_handle_status_change($new_status, $old_status, $post) {
    if ($new_status === $old_status) {
        return;
    }

    $supported_types = apply_filters('contributor_supported_post_types', ['post', 'page', 'article']);
    if (!in_array($post->post_type, $supported_types)) {
        return;
    }

    // Map status changes to ActivityStreams verbs
    $status_events = [
        'publish' => 'Publish',
        'draft' => 'Retract',
        'pending' => 'Submit',
        'private' => 'Hide',
        'trash' => 'Delete'
    ];

    $event_type = isset($status_events[$new_status]) ? $status_events[$new_status] : 'Update';

    $object_data = contributor_build_article_object($post);
    $object_data['previousStatus'] = $old_status;

    contributor_log_event(
        $event_type,
        'Article',
        $post->ID,
        $object_data,
        get_current_user_id(),
        [
            'summary' => sprintf('Status changed from %s to %s', $old_status, $new_status)
        ]
    );
}
add_action('transition_post_status', 'contributor_handle_status_change', 10, 3);

/**
 * Hook into post deletion
 */
function contributor_handle_delete_post($post_id) {
    $post = get_post($post_id);
    if (!$post) {
        return;
    }

    $supported_types = apply_filters('contributor_supported_post_types', ['post', 'page', 'article']);
    if (!in_array($post->post_type, $supported_types)) {
        return;
    }

    contributor_log_event(
        'Delete',
        'Article',
        $post_id,
        [
            'type' => 'Article',
            'id' => get_permalink($post_id),
            'name' => $post->post_title,
            'formerType' => 'Article'
        ],
        get_current_user_id()
    );
}
add_action('before_delete_post', 'contributor_handle_delete_post');

/**
 * Register REST API endpoints
 */
function contributor_register_rest_routes() {
    // Get events for a specific post
    register_rest_route('contributor/v1', '/events/post/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'contributor_get_post_events',
        'permission_callback' => '__return_true',
        'args' => [
            'id' => [
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            ]
        ]
    ]);

    // Get all events (paginated)
    register_rest_route('contributor/v1', '/events', [
        'methods' => 'GET',
        'callback' => 'contributor_get_all_events',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        },
        'args' => [
            'limit' => [
                'default' => 100,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param <= 1000;
                }
            ],
            'offset' => [
                'default' => 0,
                'validate_callback' => 'is_numeric'
            ],
            'since_sequence' => [
                'default' => 0,
                'validate_callback' => 'is_numeric'
            ],
            'event_type' => [
                'default' => null
            ],
            'object_type' => [
                'default' => null
            ]
        ]
    ]);

    // Get event stream (for real-time sync)
    register_rest_route('contributor/v1', '/events/stream', [
        'methods' => 'GET',
        'callback' => 'contributor_get_event_stream',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // Replay events to rebuild state
    register_rest_route('contributor/v1', '/events/replay/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'contributor_replay_events',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // Get specific event by ID
    register_rest_route('contributor/v1', '/events/(?P<event_id>[a-zA-Z0-9\-_\/]+)', [
        'methods' => 'GET',
        'callback' => 'contributor_get_event_by_id',
        'permission_callback' => '__return_true'
    ]);
}
add_action('rest_api_init', 'contributor_register_rest_routes');

/**
 * REST: Get events for a specific post
 */
function contributor_get_post_events($request) {
    global $wpdb;
    $post_id = intval($request['id']);

    $events = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
         WHERE object_id = %d
         ORDER BY sequence_number ASC",
        $post_id
    ));

    $result = array_map(function($event) {
        $data = json_decode($event->activity_data, true);
        $data['_meta'] = [
            'db_id' => $event->id,
            'sequence' => $event->sequence_number,
            'checksum' => $event->checksum
        ];
        return $data;
    }, $events);

    return new WP_REST_Response([
        'total' => count($result),
        'events' => $result
    ], 200);
}

/**
 * REST: Get all events (paginated)
 */
function contributor_get_all_events($request) {
    global $wpdb;

    $limit = intval($request->get_param('limit'));
    $offset = intval($request->get_param('offset'));
    $since_sequence = intval($request->get_param('since_sequence'));
    $event_type = $request->get_param('event_type');
    $object_type = $request->get_param('object_type');

    $where_clauses = [];
    $where_values = [];

    if ($since_sequence > 0) {
        $where_clauses[] = 'sequence_number > %d';
        $where_values[] = $since_sequence;
    }

    if ($event_type) {
        $where_clauses[] = 'event_type = %s';
        $where_values[] = $event_type;
    }

    if ($object_type) {
        $where_clauses[] = 'object_type = %s';
        $where_values[] = $object_type;
    }

    $where_sql = !empty($where_clauses) ? 'WHERE ' . implode(' AND ', $where_clauses) : '';

    // Get total count
    $count_sql = "SELECT COUNT(*) FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . " $where_sql";
    if (!empty($where_values)) {
        $total = $wpdb->get_var($wpdb->prepare($count_sql, ...$where_values));
    } else {
        $total = $wpdb->get_var($count_sql);
    }

    // Get events
    $query = "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
              $where_sql
              ORDER BY sequence_number ASC
              LIMIT %d OFFSET %d";

    $query_values = array_merge($where_values, [$limit, $offset]);
    $events = $wpdb->get_results($wpdb->prepare($query, ...$query_values));

    $result = array_map(function($event) {
        return json_decode($event->activity_data, true);
    }, $events);

    return new WP_REST_Response([
        'total' => intval($total),
        'limit' => $limit,
        'offset' => $offset,
        'has_more' => ($offset + $limit) < $total,
        'events' => $result
    ], 200);
}

/**
 * REST: Get event stream for real-time sync
 */
function contributor_get_event_stream($request) {
    global $wpdb;

    $since = $request->get_param('since_sequence') ?: 0;

    $events = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
         WHERE sequence_number > %d
         ORDER BY sequence_number ASC
         LIMIT 100",
        $since
    ));

    $latest_sequence = 0;
    $result = array_map(function($event) use (&$latest_sequence) {
        $latest_sequence = max($latest_sequence, $event->sequence_number);
        return json_decode($event->activity_data, true);
    }, $events);

    return new WP_REST_Response([
        'latest_sequence' => $latest_sequence,
        'events' => $result
    ], 200);
}

/**
 * REST: Replay events to rebuild state at a point in time
 */
function contributor_replay_events($request) {
    global $wpdb;
    $post_id = intval($request['id']);
    $until_sequence = $request->get_param('until_sequence');
    $until_version = $request->get_param('until_version');

    $where = 'object_id = %d';
    $values = [$post_id];

    if ($until_sequence) {
        $where .= ' AND sequence_number <= %d';
        $values[] = intval($until_sequence);
    }

    if ($until_version) {
        $where .= ' AND object_version <= %d';
        $values[] = intval($until_version);
    }

    $events = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
         WHERE $where
         ORDER BY sequence_number ASC",
        ...$values
    ));

    // Replay events to build current state
    $state = null;
    $history = [];

    foreach ($events as $event) {
        $activity = json_decode($event->activity_data, true);

        switch ($activity['type']) {
            case 'Create':
                $state = $activity['object'];
                break;
            case 'Update':
                if ($state) {
                    $state = array_merge($state, $activity['object']);
                }
                break;
            case 'Delete':
                $state = null;
                break;
        }

        $history[] = [
            'sequence' => $event->sequence_number,
            'type' => $activity['type'],
            'actor' => $activity['actor']['name'] ?? 'System',
            'published' => $activity['published'],
            'summary' => $activity['summary'] ?? null
        ];
    }

    return new WP_REST_Response([
        'current_state' => $state,
        'event_count' => count($events),
        'history' => $history
    ], 200);
}

/**
 * REST: Get specific event by ID
 */
function contributor_get_event_by_id($request) {
    global $wpdb;
    $event_id = $request['event_id'];

    // The event_id is URL-encoded, decode it
    $event_id = urldecode($event_id);

    // If it doesn't look like a full URL, construct it
    if (strpos($event_id, 'http') !== 0) {
        $event_id = home_url('/activities/' . $event_id);
    }

    $event = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . " WHERE event_id LIKE %s",
        '%' . $wpdb->esc_like($event_id) . '%'
    ));

    if (!$event) {
        return new WP_Error('not_found', 'Event not found', ['status' => 404]);
    }

    return new WP_REST_Response(json_decode($event->activity_data, true), 200);
}

/**
 * Add WPGraphQL support if the plugin is active
 */
function contributor_register_graphql_types() {
    if (!function_exists('register_graphql_object_type')) {
        return;
    }

    // Register Actor type
    register_graphql_object_type('ActivityStreamActor', [
        'description' => 'An ActivityStreams actor (person or system)',
        'fields' => [
            'type' => ['type' => 'String'],
            'id' => ['type' => 'String'],
            'name' => ['type' => 'String'],
            'email' => ['type' => 'String'],
            'url' => ['type' => 'String']
        ]
    ]);

    // Register Event type
    register_graphql_object_type('ActivityStreamEvent', [
        'description' => 'An ActivityStreams event',
        'fields' => [
            'id' => ['type' => 'String'],
            'type' => ['type' => 'String'],
            'actor' => ['type' => 'ActivityStreamActor'],
            'published' => ['type' => 'String'],
            'sequence' => ['type' => 'Int'],
            'summary' => ['type' => 'String'],
            'version' => ['type' => 'Int']
        ]
    ]);

    // Add events field to Post type
    register_graphql_field('Post', 'activityEvents', [
        'type' => ['list_of' => 'ActivityStreamEvent'],
        'description' => 'All ActivityStreams events for this post',
        'resolve' => function($post) {
            global $wpdb;
            $events = $wpdb->get_results($wpdb->prepare(
                "SELECT activity_data FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
                 WHERE object_id = %d
                 ORDER BY sequence_number ASC",
                $post->ID
            ));

            return array_map(function($event) {
                return json_decode($event->activity_data, true);
            }, $events);
        }
    ]);

    // Add event count field
    register_graphql_field('Post', 'eventCount', [
        'type' => 'Int',
        'description' => 'Number of ActivityStreams events for this post',
        'resolve' => function($post) {
            global $wpdb;
            return intval($wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . " WHERE object_id = %d",
                $post->ID
            )));
        }
    ]);

    // Add latest event field
    register_graphql_field('Post', 'latestEvent', [
        'type' => 'ActivityStreamEvent',
        'description' => 'The most recent ActivityStreams event for this post',
        'resolve' => function($post) {
            global $wpdb;
            $event = $wpdb->get_row($wpdb->prepare(
                "SELECT activity_data FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
                 WHERE object_id = %d
                 ORDER BY sequence_number DESC
                 LIMIT 1",
                $post->ID
            ));

            return $event ? json_decode($event->activity_data, true) : null;
        }
    ]);

    // Add root query for events
    register_graphql_field('RootQuery', 'activityEvents', [
        'type' => ['list_of' => 'ActivityStreamEvent'],
        'description' => 'Query ActivityStreams events',
        'args' => [
            'limit' => ['type' => 'Int', 'defaultValue' => 100],
            'offset' => ['type' => 'Int', 'defaultValue' => 0],
            'sinceSequence' => ['type' => 'Int', 'defaultValue' => 0],
            'eventType' => ['type' => 'String']
        ],
        'resolve' => function($root, $args) {
            global $wpdb;

            $where = 'WHERE sequence_number > %d';
            $values = [$args['sinceSequence']];

            if (!empty($args['eventType'])) {
                $where .= ' AND event_type = %s';
                $values[] = $args['eventType'];
            }

            $values[] = $args['limit'];
            $values[] = $args['offset'];

            $events = $wpdb->get_results($wpdb->prepare(
                "SELECT activity_data FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
                 $where
                 ORDER BY sequence_number ASC
                 LIMIT %d OFFSET %d",
                ...$values
            ));

            return array_map(function($event) {
                return json_decode($event->activity_data, true);
            }, $events);
        }
    ]);
}
add_action('graphql_register_types', 'contributor_register_graphql_types');

/**
 * Admin menu for viewing events
 */
function contributor_add_admin_menu() {
    add_menu_page(
        'Activity Events',
        'Activity Events',
        'edit_posts',
        'contributor-events',
        'contributor_admin_page',
        'dashicons-backup',
        30
    );
}
add_action('admin_menu', 'contributor_add_admin_menu');

/**
 * Admin page for viewing events
 */
function contributor_admin_page() {
    global $wpdb;

    $per_page = 50;
    $page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset = ($page - 1) * $per_page;

    $total = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE);
    $events = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_AS_TABLE . "
         ORDER BY sequence_number DESC
         LIMIT %d OFFSET %d",
        $per_page, $offset
    ));

    ?>
    <div class="wrap">
        <h1>ActivityStreams Events</h1>
        <p>Total events: <?php echo number_format($total); ?></p>

        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>Seq #</th>
                    <th>Type</th>
                    <th>Object</th>
                    <th>Actor</th>
                    <th>Published</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($events as $event):
                    $data = json_decode($event->activity_data, true);
                ?>
                <tr>
                    <td><?php echo $event->sequence_number; ?></td>
                    <td><code><?php echo esc_html($event->event_type); ?></code></td>
                    <td>
                        <a href="<?php echo get_edit_post_link($event->object_id); ?>">
                            <?php echo esc_html($data['object']['name'] ?? 'ID: ' . $event->object_id); ?>
                        </a>
                    </td>
                    <td><?php echo esc_html($data['actor']['name'] ?? 'System'); ?></td>
                    <td><?php echo esc_html($event->published_at); ?></td>
                    <td>
                        <button class="button" onclick="alert(JSON.stringify(<?php echo esc_attr(wp_json_encode($data)); ?>, null, 2))">
                            View JSON
                        </button>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <?php
        $total_pages = ceil($total / $per_page);
        if ($total_pages > 1):
        ?>
        <div class="tablenav bottom">
            <div class="tablenav-pages">
                <?php
                echo paginate_links([
                    'base' => add_query_arg('paged', '%#%'),
                    'format' => '',
                    'prev_text' => '&laquo;',
                    'next_text' => '&raquo;',
                    'total' => $total_pages,
                    'current' => $page
                ]);
                ?>
            </div>
        </div>
        <?php endif; ?>
    </div>
    <?php
}

/**
 * Handle cache invalidation webhook to Cloudflare
 */
function contributor_send_cache_invalidation($post_id, $post) {
    $cloudflare_webhook = get_option('contributor_cloudflare_webhook');

    if (!$cloudflare_webhook) {
        return;
    }

    wp_remote_post($cloudflare_webhook, [
        'timeout' => 5,
        'blocking' => false,
        'body' => wp_json_encode([
            'post_id' => $post_id,
            'url' => get_permalink($post_id),
            'type' => $post->post_type,
            'action' => 'invalidate'
        ]),
        'headers' => [
            'Content-Type' => 'application/json'
        ]
    ]);
}
add_action('contributor_invalidate_cache', 'contributor_send_cache_invalidation', 10, 2);

/**
 * Settings page for plugin configuration
 */
function contributor_register_settings() {
    add_settings_section(
        'contributor_settings_section',
        'Contributor ActivityStreams Settings',
        null,
        'writing'
    );

    register_setting('writing', 'contributor_cloudflare_webhook', [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw'
    ]);

    add_settings_field(
        'contributor_cloudflare_webhook',
        'Cloudflare Cache Webhook URL',
        function() {
            $value = get_option('contributor_cloudflare_webhook');
            echo '<input type="url" name="contributor_cloudflare_webhook" value="' . esc_attr($value) . '" class="regular-text">';
            echo '<p class="description">URL to notify when content changes (for cache invalidation)</p>';
        },
        'writing',
        'contributor_settings_section'
    );
}
add_action('admin_init', 'contributor_register_settings');
