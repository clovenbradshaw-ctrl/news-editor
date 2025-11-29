/**
 * WordPress Direct API Client
 *
 * Simple, direct access to WordPress REST API - no middleware needed!
 * Uses WordPress Application Passwords for authentication (built-in WP 5.6+)
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────┐
 * │  PUBLIC USERS (no login needed)                 │
 * │  → GET requests to WordPress API                │
 * │  → Read articles, view homepage, etc.           │
 * └───────────────┬─────────────────────────────────┘
 *                 │
 *                 ↓
 * ┌─────────────────────────────────────────────────┐
 * │     WORDPRESS REST API                          │
 * │  • GET /wp-json/contributor/v1/articles (public)│
 * │  • POST requires authentication                 │
 * │  • MySQL Database (events table)                │
 * └───────────────┬─────────────────────────────────┘
 *                 ↑
 *                 │ Authenticated requests
 *                 │
 * ┌───────────────┴─────────────────────────────────┐
 * │  EDITORS (login required)                       │
 * │  • React admin interface                        │
 * │  • POST/PUT to WordPress API                    │
 * │  • Application Password authentication          │
 * └─────────────────────────────────────────────────┘
 */

// Configuration - set this to your WordPress URL
const WP_API_URL = import.meta.env.VITE_WP_API_URL || 'https://thecontributor.org/wp-json';

// Storage keys
const AUTH_STORAGE_KEY = 'wp_auth_token';
const USER_STORAGE_KEY = 'wp_user';

/**
 * Get stored authentication token
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

/**
 * Get stored user data
 */
export function getStoredUser() {
  const userData = localStorage.getItem(USER_STORAGE_KEY);
  return userData ? JSON.parse(userData) : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Create Basic Auth token from username and app password
 * WordPress Application Passwords: Users > Your Profile > Application Passwords
 */
export function createAuthToken(username, appPassword) {
  // Application passwords have spaces - remove them
  const cleanPassword = appPassword.replace(/\s/g, '');
  return btoa(`${username}:${cleanPassword}`);
}

/**
 * Login with WordPress credentials
 * Uses Application Passwords (built-in WordPress 5.6+)
 */
export async function login(username, appPassword) {
  const token = createAuthToken(username, appPassword);

  try {
    // Verify credentials by fetching current user
    const response = await fetch(`${WP_API_URL}/contributor/v1/me`, {
      headers: {
        'Authorization': `Basic ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid username or application password');
      }
      throw new Error('Login failed');
    }

    const user = await response.json();

    // Store auth token and user data
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    return user;
  } catch (error) {
    // Clear any partial state
    logout();
    throw error;
  }
}

/**
 * Logout - clear stored credentials
 */
export function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Make an API request to WordPress
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${WP_API_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth header if authenticated
  if (token) {
    headers['Authorization'] = `Basic ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle 401 - clear auth and redirect
  if (response.status === 401 && token) {
    logout();
    window.dispatchEvent(new CustomEvent('wp-auth-expired'));
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// PUBLIC API (No authentication required)
// =============================================================================

/**
 * Get list of published articles
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.per_page - Items per page (default: 10)
 * @param {string} params.category - Filter by category slug
 * @param {string} params.tag - Filter by tag slug
 * @param {string} params.search - Search query
 * @param {string} params.orderby - Order by field (date, title, etc.)
 * @param {string} params.order - Order direction (ASC, DESC)
 */
export async function getArticles(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiRequest(`/contributor/v1/articles${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get single article by ID
 * @param {number} id - Article ID
 */
export async function getArticle(id) {
  return apiRequest(`/contributor/v1/articles/${id}`);
}

/**
 * Get article version history (PUBLIC - for transparency!)
 * @param {number} id - Article ID
 */
export async function getArticleHistory(id) {
  return apiRequest(`/contributor/v1/articles/${id}/history`);
}

/**
 * Get homepage layout with populated articles
 */
export async function getHomepage() {
  return apiRequest('/contributor/v1/homepage');
}

/**
 * Get all collections
 */
export async function getCollections() {
  return apiRequest('/contributor/v1/collections');
}

/**
 * Get all categories
 * @param {boolean} hideEmpty - Hide categories with no posts (default: true)
 */
export async function getCategories(hideEmpty = true) {
  return apiRequest(`/contributor/v1/categories?hide_empty=${hideEmpty}`);
}

// =============================================================================
// AUTHENTICATED API (Login required)
// =============================================================================

/**
 * Get current user info (requires authentication)
 */
export async function getCurrentUser() {
  return apiRequest('/contributor/v1/me');
}

/**
 * Update homepage layout (requires authentication)
 * @param {Object} layout - Homepage layout object
 * @param {number|null} layout.hero - Hero article ID
 * @param {Array} layout.sections - Section configurations
 */
export async function updateHomepage(layout) {
  return apiRequest('/contributor/v1/homepage', {
    method: 'POST',
    body: JSON.stringify(layout)
  });
}

/**
 * Get all events (requires authentication)
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of events (default: 100)
 * @param {number} params.offset - Offset for pagination
 * @param {string} params.event_type - Filter by event type (Create, Update, etc.)
 * @param {string} params.object_type - Filter by object type (Article, Collection, etc.)
 */
export async function getEvents(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiRequest(`/contributor/v1/events${queryString ? `?${queryString}` : ''}`);
}

/**
 * Create a new collection (requires authentication)
 * @param {Object} data - Collection data
 * @param {string} data.name - Collection name
 * @param {string} data.description - Collection description
 * @param {Array<number>} data.article_ids - Array of article IDs
 */
export async function createCollection(data) {
  return apiRequest('/contributor/v1/collections', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Update a collection (requires authentication)
 * @param {string} id - Collection ID
 * @param {Object} data - Updated collection data
 */
export async function updateCollection(id, data) {
  return apiRequest(`/contributor/v1/collections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// =============================================================================
// WORDPRESS STANDARD ENDPOINTS (for creating/editing posts)
// These use the built-in WordPress REST API
// =============================================================================

/**
 * Create a new post (requires authentication)
 * @param {Object} data - Post data
 * @param {string} data.title - Post title
 * @param {string} data.content - Post content (HTML)
 * @param {string} data.excerpt - Post excerpt
 * @param {string} data.status - Post status (draft, publish, etc.)
 * @param {Array<number>} data.categories - Category IDs
 * @param {Array<number>} data.tags - Tag IDs
 * @param {number} data.featured_media - Featured image ID
 */
export async function createPost(data) {
  return apiRequest('/wp/v2/posts', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Update a post (requires authentication)
 * @param {number} id - Post ID
 * @param {Object} data - Updated post data
 */
export async function updatePost(id, data) {
  return apiRequest(`/wp/v2/posts/${id}`, {
    method: 'POST', // WordPress uses POST for updates
    body: JSON.stringify(data)
  });
}

/**
 * Delete a post (requires authentication)
 * @param {number} id - Post ID
 * @param {boolean} force - Force delete (skip trash)
 */
export async function deletePost(id, force = false) {
  return apiRequest(`/wp/v2/posts/${id}?force=${force}`, {
    method: 'DELETE'
  });
}

/**
 * Upload media (requires authentication)
 * @param {File} file - File to upload
 * @param {string} title - Media title
 * @param {string} caption - Media caption
 */
export async function uploadMedia(file, title = '', caption = '') {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (caption) formData.append('caption', caption);

  const response = await fetch(`${WP_API_URL}/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${token}`
      // Don't set Content-Type - browser will set it with boundary
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Upload failed');
  }

  return response.json();
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get WordPress API URL (useful for debugging)
 */
export function getApiUrl() {
  return WP_API_URL;
}

/**
 * Set custom WordPress API URL (for different environments)
 */
export function setApiUrl(url) {
  // This would need to be stored and used, but for now we rely on env var
  console.warn('setApiUrl: Please set VITE_WP_API_URL environment variable instead');
}

// Export configuration
export const config = {
  apiUrl: WP_API_URL,
  authStorageKey: AUTH_STORAGE_KEY,
  userStorageKey: USER_STORAGE_KEY
};
