<?php
/**
 * Plugin Name: Contributor Event Store
 * Plugin URI: https://thecontributor.org
 * Description: ActivityStreams event sourcing with direct REST API - no middleware needed
 * Version: 2.0.0
 * Author: The Contributor
 * Author URI: https://thecontributor.org
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: contributor-events
 *
 * SIMPLIFIED ARCHITECTURE:
 * - WordPress MySQL Database (backend storage with events table)
 * - WordPress REST API (built-in, no middleware)
 * - React App (frontend - static hosting anywhere)
 * - Authentication via WordPress Application Passwords (built-in WP 5.6+)
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('CONTRIBUTOR_VERSION', '2.0.0');
define('CONTRIBUTOR_EVENTS_TABLE', 'contributor_events');

// =============================================================================
// DATABASE SETUP
// =============================================================================

/**
 * Create events table on plugin activation
 */
function contributor_install_db() {
    global $wpdb;
    $table = $wpdb->prefix . CONTRIBUTOR_EVENTS_TABLE;
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        event_id varchar(255) NOT NULL UNIQUE,
        event_type varchar(50) NOT NULL,
        actor_id bigint(20),
        object_type varchar(50),
        object_id bigint(20),
        activity_json longtext NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_object_id (object_id),
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
    ) $charset_collate ENGINE=InnoDB;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);

    // Initialize homepage layout option
    if (!get_option('contributor_homepage_layout')) {
        update_option('contributor_homepage_layout', [
            'hero' => null,
            'sections' => []
        ]);
    }

    update_option('contributor_db_version', CONTRIBUTOR_VERSION);
}
register_activation_hook(__FILE__, 'contributor_install_db');

// =============================================================================
// EVENT LOGGING (ActivityStreams)
// =============================================================================

/**
 * Log all post changes as ActivityStreams events
 */
add_action('save_post', 'contributor_log_post_event', 10, 3);

function contributor_log_post_event($post_id, $post, $update) {
    global $wpdb;

    // Skip revisions and autosaves
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return;
    }

    // Only log supported post types
    $supported_types = apply_filters('contributor_supported_post_types', ['post', 'page']);
    if (!in_array($post->post_type, $supported_types)) {
        return;
    }

    $user = wp_get_current_user();
    $activity = [
        '@context' => 'https://www.w3.org/ns/activitystreams',
        'type' => $update ? 'Update' : 'Create',
        'id' => home_url('/activity/' . uniqid()),
        'actor' => [
            'type' => 'Person',
            'id' => get_author_posts_url($user->ID),
            'name' => $user->display_name
        ],
        'object' => [
            'type' => 'Article',
            'id' => get_permalink($post_id),
            'name' => $post->post_title,
            'content' => $post->post_content,
            'summary' => $post->post_excerpt,
            'published' => $post->post_date,
            'updated' => $post->post_modified,
            'status' => $post->post_status
        ],
        'published' => current_time('c')
    ];

    $wpdb->insert(
        $wpdb->prefix . CONTRIBUTOR_EVENTS_TABLE,
        [
            'event_id' => $activity['id'],
            'event_type' => $activity['type'],
            'actor_id' => get_current_user_id(),
            'object_type' => 'Article',
            'object_id' => $post_id,
            'activity_json' => wp_json_encode($activity),
            'created_at' => current_time('mysql')
        ]
    );
}

/**
 * Log post status transitions
 */
add_action('transition_post_status', 'contributor_log_status_change', 10, 3);

function contributor_log_status_change($new_status, $old_status, $post) {
    global $wpdb;

    if ($new_status === $old_status) {
        return;
    }

    $supported_types = apply_filters('contributor_supported_post_types', ['post', 'page']);
    if (!in_array($post->post_type, $supported_types)) {
        return;
    }

    $status_events = [
        'publish' => 'Publish',
        'draft' => 'Retract',
        'trash' => 'Delete'
    ];

    $event_type = isset($status_events[$new_status]) ? $status_events[$new_status] : 'Update';
    $user = wp_get_current_user();

    $activity = [
        '@context' => 'https://www.w3.org/ns/activitystreams',
        'type' => $event_type,
        'id' => home_url('/activity/' . uniqid()),
        'actor' => [
            'type' => 'Person',
            'id' => get_author_posts_url($user->ID),
            'name' => $user->display_name
        ],
        'object' => [
            'type' => 'Article',
            'id' => get_permalink($post->ID),
            'name' => $post->post_title,
            'previousStatus' => $old_status,
            'status' => $new_status
        ],
        'summary' => sprintf('Status changed from %s to %s', $old_status, $new_status),
        'published' => current_time('c')
    ];

    $wpdb->insert(
        $wpdb->prefix . CONTRIBUTOR_EVENTS_TABLE,
        [
            'event_id' => $activity['id'],
            'event_type' => $event_type,
            'actor_id' => get_current_user_id(),
            'object_type' => 'Article',
            'object_id' => $post->ID,
            'activity_json' => wp_json_encode($activity),
            'created_at' => current_time('mysql')
        ]
    );
}

// =============================================================================
// REST API ENDPOINTS
// =============================================================================

add_action('rest_api_init', function() {

    // -------------------------------------------------------------------------
    // PUBLIC ENDPOINTS (No Authentication Required)
    // -------------------------------------------------------------------------

    // GET /wp-json/contributor/v1/articles - List published articles
    register_rest_route('contributor/v1', '/articles', [
        'methods' => 'GET',
        'callback' => 'contributor_get_articles',
        'permission_callback' => '__return_true' // PUBLIC
    ]);

    // GET /wp-json/contributor/v1/articles/{id} - Get single article
    register_rest_route('contributor/v1', '/articles/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'contributor_get_article',
        'permission_callback' => '__return_true' // PUBLIC
    ]);

    // GET /wp-json/contributor/v1/articles/{id}/history - Get article event history
    register_rest_route('contributor/v1', '/articles/(?P<id>\d+)/history', [
        'methods' => 'GET',
        'callback' => 'contributor_get_article_history',
        'permission_callback' => '__return_true' // PUBLIC - transparency!
    ]);

    // GET /wp-json/contributor/v1/homepage - Get homepage layout
    register_rest_route('contributor/v1', '/homepage', [
        'methods' => 'GET',
        'callback' => 'contributor_get_homepage',
        'permission_callback' => '__return_true' // PUBLIC
    ]);

    // GET /wp-json/contributor/v1/collections - Get all collections
    register_rest_route('contributor/v1', '/collections', [
        'methods' => 'GET',
        'callback' => 'contributor_get_collections',
        'permission_callback' => '__return_true' // PUBLIC
    ]);

    // GET /wp-json/contributor/v1/categories - Get categories
    register_rest_route('contributor/v1', '/categories', [
        'methods' => 'GET',
        'callback' => 'contributor_get_categories',
        'permission_callback' => '__return_true' // PUBLIC
    ]);

    // -------------------------------------------------------------------------
    // AUTHENTICATED ENDPOINTS (Editor/Admin Required)
    // -------------------------------------------------------------------------

    // POST /wp-json/contributor/v1/homepage - Update homepage layout
    register_rest_route('contributor/v1', '/homepage', [
        'methods' => 'POST',
        'callback' => 'contributor_update_homepage',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // GET /wp-json/contributor/v1/events - List all events (admin view)
    register_rest_route('contributor/v1', '/events', [
        'methods' => 'GET',
        'callback' => 'contributor_get_all_events',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // POST /wp-json/contributor/v1/collections - Create collection
    register_rest_route('contributor/v1', '/collections', [
        'methods' => 'POST',
        'callback' => 'contributor_create_collection',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // PUT /wp-json/contributor/v1/collections/{id} - Update collection
    register_rest_route('contributor/v1', '/collections/(?P<id>\d+)', [
        'methods' => ['PUT', 'PATCH'],
        'callback' => 'contributor_update_collection',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // GET /wp-json/contributor/v1/me - Get current user info
    register_rest_route('contributor/v1', '/me', [
        'methods' => 'GET',
        'callback' => 'contributor_get_current_user',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ]);
});

// =============================================================================
// PUBLIC ENDPOINT HANDLERS
// =============================================================================

/**
 * Get published articles with pagination
 */
function contributor_get_articles($request) {
    $args = [
        'post_type' => 'post',
        'post_status' => 'publish',
        'posts_per_page' => $request->get_param('per_page') ?: 10,
        'paged' => $request->get_param('page') ?: 1,
        'orderby' => $request->get_param('orderby') ?: 'date',
        'order' => $request->get_param('order') ?: 'DESC'
    ];

    // Category filter
    if ($request->get_param('category')) {
        $args['category_name'] = $request->get_param('category');
    }

    // Tag filter
    if ($request->get_param('tag')) {
        $args['tag'] = $request->get_param('tag');
    }

    // Search
    if ($request->get_param('search')) {
        $args['s'] = $request->get_param('search');
    }

    $query = new WP_Query($args);
    $articles = [];

    foreach ($query->posts as $post) {
        $articles[] = contributor_format_article($post);
    }

    return new WP_REST_Response([
        'articles' => $articles,
        'total' => $query->found_posts,
        'pages' => $query->max_num_pages,
        'page' => intval($args['paged']),
        'per_page' => intval($args['posts_per_page'])
    ], 200);
}

/**
 * Get single article by ID
 */
function contributor_get_article($request) {
    $post_id = intval($request['id']);
    $post = get_post($post_id);

    if (!$post || $post->post_status !== 'publish') {
        return new WP_Error('not_found', 'Article not found', ['status' => 404]);
    }

    return new WP_REST_Response(contributor_format_article($post, true), 200);
}

/**
 * Format article for API response
 */
function contributor_format_article($post, $full = false) {
    $article = [
        'id' => $post->ID,
        'title' => $post->post_title,
        'slug' => $post->post_name,
        'excerpt' => $post->post_excerpt ?: wp_trim_words($post->post_content, 30),
        'published' => $post->post_date,
        'modified' => $post->post_modified,
        'author' => [
            'id' => $post->post_author,
            'name' => get_the_author_meta('display_name', $post->post_author),
            'avatar' => get_avatar_url($post->post_author)
        ],
        'featured_image' => get_the_post_thumbnail_url($post->ID, 'large'),
        'featured_image_caption' => get_the_post_thumbnail_caption($post->ID),
        'url' => get_permalink($post->ID),
        'categories' => wp_get_post_categories($post->ID, ['fields' => 'all']),
        'tags' => wp_get_post_tags($post->ID, ['fields' => 'all'])
    ];

    // Include full content only when requested
    if ($full) {
        $article['content'] = apply_filters('the_content', $post->post_content);
        $article['content_raw'] = $post->post_content;
        $article['word_count'] = str_word_count(strip_tags($post->post_content));
        $article['reading_time'] = ceil($article['word_count'] / 200);
    }

    return $article;
}

/**
 * Get article version history (PUBLIC - for transparency)
 */
function contributor_get_article_history($request) {
    global $wpdb;
    $post_id = intval($request['id']);

    // Verify article exists and is published
    $post = get_post($post_id);
    if (!$post || $post->post_status !== 'publish') {
        return new WP_Error('not_found', 'Article not found', ['status' => 404]);
    }

    $events = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_EVENTS_TABLE . "
         WHERE object_id = %d
         ORDER BY created_at ASC",
        $post_id
    ));

    $history = array_map(function($event) {
        $activity = json_decode($event->activity_json, true);
        return [
            'id' => $event->event_id,
            'type' => $activity['type'],
            'actor' => $activity['actor'],
            'published' => $activity['published'],
            'summary' => $activity['summary'] ?? null
        ];
    }, $events);

    return new WP_REST_Response([
        'article_id' => $post_id,
        'article_title' => $post->post_title,
        'total_events' => count($history),
        'history' => $history
    ], 200);
}

/**
 * Get homepage layout
 */
function contributor_get_homepage($request) {
    $layout = get_option('contributor_homepage_layout', [
        'hero' => null,
        'sections' => []
    ]);

    // Populate hero article if set
    if ($layout['hero']) {
        $hero_post = get_post($layout['hero']);
        if ($hero_post && $hero_post->post_status === 'publish') {
            $layout['hero_article'] = contributor_format_article($hero_post);
        }
    }

    // Populate section articles
    if (!empty($layout['sections'])) {
        foreach ($layout['sections'] as &$section) {
            if (!empty($section['article_ids'])) {
                $section['articles'] = [];
                foreach ($section['article_ids'] as $article_id) {
                    $post = get_post($article_id);
                    if ($post && $post->post_status === 'publish') {
                        $section['articles'][] = contributor_format_article($post);
                    }
                }
            }
        }
    }

    return new WP_REST_Response($layout, 200);
}

/**
 * Get all collections
 */
function contributor_get_collections($request) {
    // Using custom post type for collections
    $collections = get_posts([
        'post_type' => 'contributor_collection',
        'post_status' => 'publish',
        'posts_per_page' => -1
    ]);

    // If no custom post type, fall back to options
    if (empty($collections)) {
        $collections_data = get_option('contributor_collections', []);
        return new WP_REST_Response($collections_data, 200);
    }

    $result = array_map(function($collection) {
        $article_ids = get_post_meta($collection->ID, 'article_ids', true) ?: [];
        $articles = [];

        foreach ($article_ids as $article_id) {
            $post = get_post($article_id);
            if ($post && $post->post_status === 'publish') {
                $articles[] = contributor_format_article($post);
            }
        }

        return [
            'id' => $collection->ID,
            'name' => $collection->post_title,
            'slug' => $collection->post_name,
            'description' => $collection->post_excerpt,
            'article_ids' => $article_ids,
            'articles' => $articles
        ];
    }, $collections);

    return new WP_REST_Response($result, 200);
}

/**
 * Get categories
 */
function contributor_get_categories($request) {
    $categories = get_categories([
        'hide_empty' => $request->get_param('hide_empty') !== 'false'
    ]);

    $result = array_map(function($cat) {
        return [
            'id' => $cat->term_id,
            'name' => $cat->name,
            'slug' => $cat->slug,
            'description' => $cat->description,
            'count' => $cat->count,
            'url' => get_category_link($cat->term_id)
        ];
    }, $categories);

    return new WP_REST_Response($result, 200);
}

// =============================================================================
// AUTHENTICATED ENDPOINT HANDLERS
// =============================================================================

/**
 * Update homepage layout (requires authentication)
 */
function contributor_update_homepage($request) {
    global $wpdb;

    $layout = $request->get_json_params();

    // Validate layout structure
    if (!is_array($layout)) {
        return new WP_Error('invalid_data', 'Invalid layout data', ['status' => 400]);
    }

    // Log as ActivityStreams event
    $user = wp_get_current_user();
    $activity = [
        '@context' => 'https://www.w3.org/ns/activitystreams',
        'type' => 'Update',
        'id' => home_url('/activity/' . uniqid()),
        'actor' => [
            'type' => 'Person',
            'id' => get_author_posts_url($user->ID),
            'name' => $user->display_name
        ],
        'object' => [
            'type' => 'Collection',
            'name' => 'Homepage Layout',
            'content' => $layout
        ],
        'published' => current_time('c')
    ];

    $wpdb->insert(
        $wpdb->prefix . CONTRIBUTOR_EVENTS_TABLE,
        [
            'event_id' => $activity['id'],
            'event_type' => 'Update',
            'actor_id' => $user->ID,
            'object_type' => 'Collection',
            'object_id' => 0,
            'activity_json' => wp_json_encode($activity),
            'created_at' => current_time('mysql')
        ]
    );

    // Update the layout
    update_option('contributor_homepage_layout', $layout);

    return new WP_REST_Response([
        'success' => true,
        'message' => 'Homepage layout updated',
        'layout' => $layout
    ], 200);
}

/**
 * Get all events (admin view)
 */
function contributor_get_all_events($request) {
    global $wpdb;

    $limit = intval($request->get_param('limit') ?: 100);
    $offset = intval($request->get_param('offset') ?: 0);
    $event_type = $request->get_param('event_type');
    $object_type = $request->get_param('object_type');

    $where_clauses = ['1=1'];
    $where_values = [];

    if ($event_type) {
        $where_clauses[] = 'event_type = %s';
        $where_values[] = $event_type;
    }

    if ($object_type) {
        $where_clauses[] = 'object_type = %s';
        $where_values[] = $object_type;
    }

    $where_sql = implode(' AND ', $where_clauses);

    // Get total count
    $count_query = "SELECT COUNT(*) FROM {$wpdb->prefix}" . CONTRIBUTOR_EVENTS_TABLE . " WHERE $where_sql";
    $total = empty($where_values)
        ? $wpdb->get_var($count_query)
        : $wpdb->get_var($wpdb->prepare($count_query, ...$where_values));

    // Get events
    $where_values[] = $limit;
    $where_values[] = $offset;

    $query = "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_EVENTS_TABLE . "
              WHERE $where_sql
              ORDER BY created_at DESC
              LIMIT %d OFFSET %d";

    $events = $wpdb->get_results($wpdb->prepare($query, ...$where_values));

    $result = array_map(function($event) {
        $activity = json_decode($event->activity_json, true);
        return [
            'id' => $event->id,
            'event_id' => $event->event_id,
            'type' => $activity['type'],
            'actor' => $activity['actor'],
            'object' => [
                'type' => $event->object_type,
                'id' => $event->object_id,
                'name' => $activity['object']['name'] ?? null
            ],
            'published' => $activity['published'],
            'summary' => $activity['summary'] ?? null
        ];
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
 * Create collection
 */
function contributor_create_collection($request) {
    $data = $request->get_json_params();

    // Store in options for simplicity (no custom post type needed)
    $collections = get_option('contributor_collections', []);

    $new_collection = [
        'id' => uniqid('col_'),
        'name' => sanitize_text_field($data['name'] ?? 'Untitled Collection'),
        'slug' => sanitize_title($data['name'] ?? 'untitled'),
        'description' => sanitize_textarea_field($data['description'] ?? ''),
        'article_ids' => array_map('intval', $data['article_ids'] ?? []),
        'created_at' => current_time('c'),
        'created_by' => get_current_user_id()
    ];

    $collections[] = $new_collection;
    update_option('contributor_collections', $collections);

    // Log event
    global $wpdb;
    $user = wp_get_current_user();
    $activity = [
        '@context' => 'https://www.w3.org/ns/activitystreams',
        'type' => 'Create',
        'id' => home_url('/activity/' . uniqid()),
        'actor' => [
            'type' => 'Person',
            'id' => get_author_posts_url($user->ID),
            'name' => $user->display_name
        ],
        'object' => [
            'type' => 'Collection',
            'name' => $new_collection['name']
        ],
        'published' => current_time('c')
    ];

    $wpdb->insert(
        $wpdb->prefix . CONTRIBUTOR_EVENTS_TABLE,
        [
            'event_id' => $activity['id'],
            'event_type' => 'Create',
            'actor_id' => $user->ID,
            'object_type' => 'Collection',
            'object_id' => 0,
            'activity_json' => wp_json_encode($activity),
            'created_at' => current_time('mysql')
        ]
    );

    return new WP_REST_Response([
        'success' => true,
        'collection' => $new_collection
    ], 201);
}

/**
 * Update collection
 */
function contributor_update_collection($request) {
    $collection_id = $request['id'];
    $data = $request->get_json_params();

    $collections = get_option('contributor_collections', []);
    $updated = false;

    foreach ($collections as &$collection) {
        if ($collection['id'] === $collection_id) {
            if (isset($data['name'])) {
                $collection['name'] = sanitize_text_field($data['name']);
                $collection['slug'] = sanitize_title($data['name']);
            }
            if (isset($data['description'])) {
                $collection['description'] = sanitize_textarea_field($data['description']);
            }
            if (isset($data['article_ids'])) {
                $collection['article_ids'] = array_map('intval', $data['article_ids']);
            }
            $collection['modified_at'] = current_time('c');
            $collection['modified_by'] = get_current_user_id();
            $updated = true;
            break;
        }
    }

    if (!$updated) {
        return new WP_Error('not_found', 'Collection not found', ['status' => 404]);
    }

    update_option('contributor_collections', $collections);

    return new WP_REST_Response([
        'success' => true,
        'collection' => $collection
    ], 200);
}

/**
 * Get current user info
 */
function contributor_get_current_user($request) {
    $user = wp_get_current_user();

    return new WP_REST_Response([
        'id' => $user->ID,
        'username' => $user->user_login,
        'email' => $user->user_email,
        'name' => $user->display_name,
        'avatar' => get_avatar_url($user->ID),
        'roles' => $user->roles,
        'capabilities' => [
            'can_edit_posts' => current_user_can('edit_posts'),
            'can_publish_posts' => current_user_can('publish_posts'),
            'can_edit_others_posts' => current_user_can('edit_others_posts'),
            'can_manage_options' => current_user_can('manage_options')
        ]
    ], 200);
}

// =============================================================================
// CORS SUPPORT FOR REACT FRONTEND
// =============================================================================

add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origin = get_http_origin();

        // Allow configured origins or localhost for development
        $allowed_origins = apply_filters('contributor_allowed_origins', [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://thecontributor.org',
            'https://www.thecontributor.org'
        ]);

        if ($origin && in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        }

        return $value;
    });
}, 15);

// Handle preflight OPTIONS requests
add_action('init', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        header('Access-Control-Max-Age: 86400');
        status_header(200);
        exit;
    }
});

// =============================================================================
// ADMIN INTERFACE
// =============================================================================

/**
 * Add admin menu for viewing events
 */
function contributor_add_admin_menu() {
    add_menu_page(
        'Contributor Events',
        'Events',
        'edit_posts',
        'contributor-events',
        'contributor_admin_page',
        'dashicons-backup',
        30
    );

    add_submenu_page(
        'contributor-events',
        'Homepage Layout',
        'Homepage',
        'edit_posts',
        'contributor-homepage',
        'contributor_homepage_admin_page'
    );
}
add_action('admin_menu', 'contributor_add_admin_menu');

/**
 * Events admin page
 */
function contributor_admin_page() {
    global $wpdb;

    $per_page = 50;
    $page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset = ($page - 1) * $per_page;

    $total = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}" . CONTRIBUTOR_EVENTS_TABLE);
    $events = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}" . CONTRIBUTOR_EVENTS_TABLE . "
         ORDER BY created_at DESC
         LIMIT %d OFFSET %d",
        $per_page, $offset
    ));

    ?>
    <div class="wrap">
        <h1>ActivityStreams Events</h1>
        <p>Total events: <?php echo number_format($total); ?></p>
        <p><em>These events provide a complete audit trail of all content changes.</em></p>

        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th style="width: 60px;">ID</th>
                    <th style="width: 80px;">Type</th>
                    <th>Object</th>
                    <th style="width: 150px;">Actor</th>
                    <th style="width: 160px;">Date</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($events as $event):
                    $data = json_decode($event->activity_json, true);
                ?>
                <tr>
                    <td><?php echo $event->id; ?></td>
                    <td><code><?php echo esc_html($event->event_type); ?></code></td>
                    <td>
                        <?php if ($event->object_id > 0): ?>
                            <a href="<?php echo get_edit_post_link($event->object_id); ?>">
                                <?php echo esc_html($data['object']['name'] ?? 'ID: ' . $event->object_id); ?>
                            </a>
                        <?php else: ?>
                            <?php echo esc_html($data['object']['name'] ?? $event->object_type); ?>
                        <?php endif; ?>
                    </td>
                    <td><?php echo esc_html($data['actor']['name'] ?? 'System'); ?></td>
                    <td><?php echo esc_html($event->created_at); ?></td>
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
 * Homepage layout admin page
 */
function contributor_homepage_admin_page() {
    $layout = get_option('contributor_homepage_layout', ['hero' => null, 'sections' => []]);

    // Handle form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('contributor_homepage_save')) {
        $layout['hero'] = intval($_POST['hero_article'] ?? 0) ?: null;
        update_option('contributor_homepage_layout', $layout);
        echo '<div class="notice notice-success"><p>Homepage layout saved!</p></div>';
    }

    ?>
    <div class="wrap">
        <h1>Homepage Layout</h1>
        <p>Configure which articles appear on the homepage. For advanced layout editing, use the React admin interface.</p>

        <form method="post">
            <?php wp_nonce_field('contributor_homepage_save'); ?>

            <table class="form-table">
                <tr>
                    <th><label for="hero_article">Hero Article</label></th>
                    <td>
                        <?php
                        wp_dropdown_pages([
                            'name' => 'hero_article',
                            'show_option_none' => '-- Select Hero Article --',
                            'option_none_value' => '0',
                            'selected' => $layout['hero'] ?? 0,
                            'post_type' => 'post',
                            'post_status' => 'publish'
                        ]);
                        ?>
                        <p class="description">The main featured article at the top of the homepage.</p>
                    </td>
                </tr>
            </table>

            <?php submit_button('Save Layout'); ?>
        </form>

        <hr>
        <h2>API Endpoints</h2>
        <p>Your React frontend can use these public endpoints:</p>
        <ul>
            <li><code>GET <?php echo home_url('/wp-json/contributor/v1/articles'); ?></code> - List articles</li>
            <li><code>GET <?php echo home_url('/wp-json/contributor/v1/articles/{id}'); ?></code> - Single article</li>
            <li><code>GET <?php echo home_url('/wp-json/contributor/v1/articles/{id}/history'); ?></code> - Article history</li>
            <li><code>GET <?php echo home_url('/wp-json/contributor/v1/homepage'); ?></code> - Homepage layout</li>
            <li><code>GET <?php echo home_url('/wp-json/contributor/v1/collections'); ?></code> - Collections</li>
        </ul>
    </div>
    <?php
}
