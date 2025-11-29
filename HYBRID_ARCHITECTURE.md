# Hybrid WordPress + Serverless Architecture

This guide explains how to set up a hybrid architecture that uses WordPress's MySQL database as an event store while having a custom serverless React frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         WORDPRESS (Backend Only)                │
│  • MySQL Database (event store)                 │
│  • WordPress Admin (editors use this)           │
│  • ActivityStreams plugin for events            │
│  • REST API / GraphQL endpoint                  │
└─────────────────┬───────────────────────────────┘
                  │
                  │ API calls
                  ↓
┌─────────────────────────────────────────────────┐
│      CLOUDFLARE WORKERS (Middleware)            │
│  • Caches WordPress API responses in KV         │
│  • Handles image optimization (R2)              │
│  • Serverless edge functions                    │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Delivers to
                  ↓
┌─────────────────────────────────────────────────┐
│         REACT FRONTEND (Cloudflare Pages)       │
│  • Custom editor UI                             │
│  • Homepage layout manager                      │
│  • Version history viewer                       │
│  • Scheduling interface                         │
└─────────────────────────────────────────────────┘
```

## Components

### 1. WordPress Plugin: `contributor-activitystreams`

Located in: `wordpress-plugin/contributor-activitystreams/`

This plugin logs all content changes as ActivityStreams events:

**Features:**
- Stores events in a custom `activitystreams_events` table
- Captures Create, Update, Delete, Publish, Retract events
- Includes full article data with each event
- ACF (Advanced Custom Fields) support
- Yoast SEO metadata support
- WPGraphQL integration
- REST API endpoints for event queries
- Admin interface for viewing events
- Cache invalidation webhooks

**Installation:**
```bash
# Copy plugin to WordPress
cp -r wordpress-plugin/contributor-activitystreams wp-content/plugins/

# Activate via WP-CLI
wp plugin activate contributor-activitystreams

# Or activate via WordPress Admin
```

**REST API Endpoints:**
- `GET /wp-json/contributor/v1/events/post/{id}` - Get events for a post
- `GET /wp-json/contributor/v1/events` - List all events (paginated)
- `GET /wp-json/contributor/v1/events/stream` - Real-time event stream
- `GET /wp-json/contributor/v1/events/replay/{id}` - Rebuild state at version

### 2. Cloudflare Workers Middleware

Located in: `cloudflare-workers/wordpress-proxy/`

Provides caching and optimization layer between frontend and WordPress.

**Features:**
- KV-based response caching
- Automatic cache invalidation
- Image optimization via R2
- CORS handling
- Health monitoring

**Setup:**
```bash
cd cloudflare-workers/wordpress-proxy

# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create CACHE_KV
# Update wrangler.toml with the namespace ID

# Set secrets
wrangler secret put WEBHOOK_SECRET

# Deploy
wrangler deploy
```

**Configuration (wrangler.toml):**
```toml
[vars]
WORDPRESS_URL = "https://your-site.com"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

### 3. React Hooks for Event Sourcing

Located in: `src/hooks/useActivityEvents.js`

Custom React hooks for working with ActivityStreams events.

**Available Hooks:**

```javascript
// Basic event fetching
const { events, loading, error, refetch } = useArticleEvents(articleId);

// Real-time event stream
const { events, startStreaming, stopStreaming } = useEventStream();

// State management with event sourcing
const { article, applyChange, saveChanges } = useEventSourcedArticle(articleId);

// Version comparison
const { compareVersions, getDiff } = useVersionComparison(articleId);

// Audit trail
const { activities, loadMore } = useAuditTrail();
```

### 4. Version History Component

Located in: `src/components/VersionHistory.jsx`

Visual component for displaying and managing article versions.

**Features:**
- Timeline view of all events
- Filter by event type
- Preview any version
- Compare two versions
- Restore previous versions
- Shows contributors

**Usage:**
```jsx
import { VersionHistory } from './components/VersionHistory';

function ArticleEditor({ articleId }) {
  return (
    <VersionHistory
      articleId={articleId}
      onRestore={(version) => handleRestore(version)}
    />
  );
}
```

### 5. GraphQL Integration

Located in: `src/graphql/`

Apollo Client setup and queries for WPGraphQL.

**Requirements:**
- WPGraphQL plugin installed in WordPress
- The ActivityStreams plugin (adds GraphQL types automatically)

**Setup:**
```javascript
// In your app entry point
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './graphql/client';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <YourApp />
    </ApolloProvider>
  );
}
```

**Available GraphQL Hooks:**
```javascript
import {
  useArticleEventsGraphQL,
  useArticleWithEvents,
  useAuditTrailGraphQL,
  useUpdateArticle,
  useCreateArticle,
} from './graphql/hooks';

// Fetch article with events
const { article, events, loading } = useArticleEventsGraphQL(articleId);

// Update article (triggers event)
const { updateArticle } = useUpdateArticle();
await updateArticle(articleId, { title: 'New Title' });
```

## Migration Strategy

### Phase 1: Plugin Installation (Week 1)
1. Install ActivityStreams plugin on WordPress
2. Events begin logging automatically
3. Existing site continues working normally

### Phase 2: Frontend Development (Weeks 2-4)
1. Build custom React frontend
2. Connect to WordPress via API
3. Test on staging subdomain

### Phase 3: Gradual Rollout (Weeks 5-8)
1. Launch new frontend for new articles
2. Old articles served by WordPress theme
3. Monitor and fix issues

### Phase 4: Full Cutover (Weeks 9-12)
1. Point domain to new frontend
2. All content via React frontend
3. WordPress admin still used for editing

## Cost Breakdown

| Component | Free Tier | Paid |
|-----------|-----------|------|
| Cloudflare Pages | 500 builds/month | $20/month unlimited |
| Cloudflare Workers | 100k requests/day | $5/month 10M requests |
| Cloudflare KV | 100k reads/day | $0.50/month |
| Cloudflare R2 | 10GB storage | $0.015/GB/month |
| WordPress Hosting | - | $20-50/month (existing) |

**Total: ~$20-50/month** (same as existing WordPress hosting)

## Event Schema

Events follow the ActivityStreams 2.0 specification:

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://thecontributor.org/ns/editorial"
  ],
  "type": "Update",
  "id": "https://thecontributor.org/activities/Update/123/abc123",
  "actor": {
    "type": "Person",
    "id": "https://thecontributor.org/users/5",
    "name": "Jane Editor",
    "email": "jane@example.com"
  },
  "object": {
    "type": "Article",
    "id": "https://thecontributor.org/2024/01/article-slug",
    "name": "Article Title",
    "content": "<p>Article content...</p>",
    "summary": "Article excerpt",
    "status": "publish",
    "wordCount": 1500,
    "readingTime": 8
  },
  "published": "2024-01-15T10:30:00Z",
  "sequence": 1234,
  "version": 5
}
```

## Security Considerations

1. **Authentication**: Use WordPress Application Passwords or JWT tokens
2. **CORS**: Configure allowed origins in Cloudflare Worker
3. **Webhooks**: Validate webhook secrets for cache invalidation
4. **Rate Limiting**: Cloudflare provides DDoS protection

## Troubleshooting

### Events not logging
- Check plugin is activated
- Verify post type is in supported list
- Check database table exists (`wp_activitystreams_events`)

### Cache not invalidating
- Verify webhook URL in WordPress settings
- Check webhook secret matches
- Test endpoint manually with curl

### GraphQL queries failing
- Ensure WPGraphQL plugin is installed
- Check authentication headers
- Verify CORS settings in Worker

## Files Reference

```
news-editor/
├── wordpress-plugin/
│   └── contributor-activitystreams/
│       └── contributor-activitystreams.php  # WordPress plugin
├── cloudflare-workers/
│   └── wordpress-proxy/
│       ├── src/index.js                     # Worker code
│       └── wrangler.toml                    # Worker config
├── src/
│   ├── hooks/
│   │   └── useActivityEvents.js             # React hooks
│   ├── components/
│   │   └── VersionHistory.jsx               # UI component
│   └── graphql/
│       ├── client.js                        # Apollo client
│       ├── eventQueries.js                  # GraphQL queries
│       └── hooks.js                         # GraphQL hooks
└── HYBRID_ARCHITECTURE.md                   # This file
```

## Benefits Summary

- **Zero disruption**: Editors keep using WordPress admin
- **Gradual migration**: Test new frontend with low risk
- **Event sourcing**: Infinite history, audit trail
- **Future-proof**: Can migrate fully off WordPress later
- **Budget-friendly**: Reuse existing hosting
- **Modern frontend**: Users get fast experience
