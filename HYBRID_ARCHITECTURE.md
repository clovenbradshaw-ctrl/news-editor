# Direct WordPress Architecture (Simplified)

This guide explains the simplified architecture that uses WordPress's REST API directly with no middleware. Just WordPress + React.

## Architecture Overview

```
┌────────────────────────────────────────┐
│  PUBLIC USERS (no login needed)        │
│  → GET requests to WordPress API       │
│  → Read articles, view homepage, etc.  │
└───────────────┬────────────────────────┘
                │
                ↓
┌────────────────────────────────────────┐
│     WORDPRESS REST API                 │
│  • GET /wp-json/contributor/v1/articles│
│  • GET /wp-json/contributor/v1/events  │
│  • MySQL Database (events table)       │
│  • Authentication: App Passwords       │
└───────────────┬────────────────────────┘
                ↑
                │ Authenticated requests
                │
┌───────────────┴────────────────────────┐
│  EDITORS (login required)              │
│  • React admin interface               │
│  • POST/PUT to WordPress API           │
│  • Application Password auth           │
└────────────────────────────────────────┘
```

## Why This Architecture?

- **No middleware complexity** - Direct WordPress API access
- **No Workers costs** - Just static hosting for React
- **Familiar WordPress admin** - Option to use it OR custom React admin
- **Event sourcing** - Full history in MySQL
- **Public transparency** - Anyone can see edit history
- **Free hosting** - Netlify/Vercel free tier for frontend
- **Simple auth** - WordPress Application Passwords (built-in)
- **Easy migration** - Existing data stays in WordPress

## Cost Breakdown

| Component | Cost |
|-----------|------|
| WordPress Hosting | $0-20/month (existing) |
| React App Hosting | **$0** (Netlify/Vercel/GitHub Pages free tier) |
| **Total** | **$0-20/month** |

## Components

### 1. WordPress Plugin: `contributor-events`

Located in: `wordpress-plugin/contributor-activitystreams/`

**Features:**
- Logs all content changes as ActivityStreams events
- Custom `contributor_events` database table
- Public REST API endpoints (no auth needed for reading)
- Authenticated endpoints for editing
- CORS support for React frontends
- Admin interface for viewing events
- Homepage layout management

**Installation:**
```bash
# Copy plugin to WordPress
cp -r wordpress-plugin/contributor-activitystreams wp-content/plugins/

# Activate via WP-CLI
wp plugin activate contributor-activitystreams

# Or activate via WordPress Admin → Plugins
```

**Public REST API Endpoints:**
```
GET /wp-json/contributor/v1/articles          # List published articles
GET /wp-json/contributor/v1/articles/{id}     # Single article
GET /wp-json/contributor/v1/articles/{id}/history  # Article version history
GET /wp-json/contributor/v1/homepage          # Homepage layout
GET /wp-json/contributor/v1/collections       # Article collections
GET /wp-json/contributor/v1/categories        # Categories
```

**Authenticated Endpoints (requires login):**
```
POST /wp-json/contributor/v1/homepage         # Update homepage layout
GET  /wp-json/contributor/v1/events           # List all events (audit trail)
POST /wp-json/contributor/v1/collections      # Create collection
PUT  /wp-json/contributor/v1/collections/{id} # Update collection
GET  /wp-json/contributor/v1/me               # Current user info
```

### 2. WordPress API Client

Located in: `src/api/wordpress.js`

Simple JavaScript client for WordPress API access.

```javascript
import * as wordpress from './api/wordpress';

// PUBLIC - No auth required
const articles = await wordpress.getArticles({ per_page: 10 });
const article = await wordpress.getArticle(123);
const history = await wordpress.getArticleHistory(123);
const homepage = await wordpress.getHomepage();

// AUTHENTICATED - Login required
await wordpress.login('username', 'application-password');
await wordpress.updateHomepage({ hero: 123, sections: [...] });
await wordpress.updatePost(123, { title: 'New Title' });
```

### 3. Authentication Hook

Located in: `src/hooks/useAuth.js`

React hook for managing authentication state.

```jsx
import { AuthProvider, useAuth } from './hooks/useAuth';

// Wrap your app
function App() {
  return (
    <AuthProvider>
      <YourRoutes />
    </AuthProvider>
  );
}

// In components
function LoginButton() {
  const { user, isAuthenticated, login, logout, loading, error } = useAuth();

  if (isAuthenticated) {
    return <button onClick={logout}>Logout ({user.name})</button>;
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await login(username, appPassword);
    }}>
      {/* Login form */}
    </form>
  );
}
```

### 4. React Hooks for Data Fetching

Located in: `src/hooks/useActivityEvents.js`

**Available Hooks:**

```javascript
// PUBLIC HOOKS (no auth needed)
import {
  useArticles,
  useArticle,
  useArticleEvents,
  useHomepage,
  useCollections,
  useVersionComparison,
} from './hooks/useActivityEvents';

// List articles with pagination
const { articles, loading, hasMore, loadMore } = useArticles({ per_page: 10 });

// Single article
const { article, loading, error } = useArticle(123);

// Article version history (PUBLIC - for transparency!)
const { events, contributors, latestEvent } = useArticleEvents(123);

// Homepage layout
const { layout, heroArticle, sections } = useHomepage();

// Collections
const { collections, loading } = useCollections();

// Compare versions
const { compareVersions, getDiff, versions } = useVersionComparison(123);

// AUTHENTICATED HOOKS (login required)
import {
  useHomepageEditor,
  useArticleEditor,
  useAuditTrail,
} from './hooks/useActivityEvents';

// Edit homepage layout
const { layout, updateLayout, saving } = useHomepageEditor();
await updateLayout({ hero: 456, sections: [...] });

// Edit article with optimistic updates
const { article, updateField, save, isDirty } = useArticleEditor(123);
updateField('title', 'New Title');
await save();

// Audit trail (all events)
const { activities, loadMore, activitiesByDate } = useAuditTrail();
```

### 5. Version History Component

Located in: `src/components/VersionHistory.jsx`

Visual component for displaying article version history.

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

## Quick Start

### 1. Set up WordPress

```bash
# Install the plugin
cp -r wordpress-plugin/contributor-activitystreams /path/to/wordpress/wp-content/plugins/
wp plugin activate contributor-activitystreams

# Create an Application Password for editors:
# WordPress Admin → Users → Your Profile → Application Passwords
# Name it something like "React Editor" and save the password
```

### 2. Configure React App

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your WordPress URL
VITE_WP_API_URL=https://your-site.com/wp-json
```

### 3. Build and Deploy

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Deploy to Netlify (free)
npm install -g netlify-cli
netlify deploy --prod --dir=dist

# Or deploy to Vercel (free)
npm install -g vercel
vercel --prod
```

## Authentication

WordPress Application Passwords (built-in since WordPress 5.6):

1. Go to WordPress Admin → Users → Your Profile
2. Scroll to "Application Passwords" section
3. Enter a name (e.g., "React Editor") and click "Add New"
4. **Save the generated password** - you won't see it again!
5. Use this password in the React app login

```javascript
// The password has spaces - they're automatically removed
await wordpress.login('your-username', 'xxxx xxxx xxxx xxxx xxxx xxxx');
```

## Event Schema

Events follow the ActivityStreams 2.0 specification:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Update",
  "id": "https://your-site.com/activity/abc123",
  "actor": {
    "type": "Person",
    "id": "https://your-site.com/author/jane",
    "name": "Jane Editor"
  },
  "object": {
    "type": "Article",
    "id": "https://your-site.com/2024/article-slug",
    "name": "Article Title",
    "content": "<p>Article content...</p>",
    "status": "publish"
  },
  "published": "2024-01-15T10:30:00Z"
}
```

## Files Reference

```
news-editor/
├── wordpress-plugin/
│   └── contributor-activitystreams/
│       └── contributor-activitystreams.php   # WordPress plugin
├── src/
│   ├── api/
│   │   └── wordpress.js                      # API client
│   ├── hooks/
│   │   ├── useAuth.js                        # Auth hook
│   │   └── useActivityEvents.js              # Data hooks
│   └── components/
│       └── VersionHistory.jsx                # UI component
├── .env.example                              # Environment template
└── HYBRID_ARCHITECTURE.md                    # This file
```

## Complete Flow

### For Public Users (No Login):
1. Visit your site
2. React app loads from static hosting
3. Fetches articles from WordPress REST API (public endpoints)
4. Displays content
5. Can view version history of any article (transparency!)

### For Editors (Login Required):
1. Visit /admin
2. Login with WordPress credentials (Application Password)
3. React admin interface loads
4. Make edits → POST to WordPress API with auth token
5. WordPress plugin logs event to events table
6. Public site updates instantly

## Benefits Summary

| Feature | Benefit |
|---------|---------|
| No middleware | Simpler architecture, fewer moving parts |
| Free hosting | React app on Netlify/Vercel free tier |
| WordPress admin | Editors can still use familiar WordPress |
| Custom React admin | Modern, fast editing experience |
| Event sourcing | Complete history, audit trail |
| Public history | Transparency - anyone can see edit history |
| Application Passwords | Built-in WordPress auth, no plugins needed |
