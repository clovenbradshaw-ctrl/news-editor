/**
 * Cloudflare Worker: WordPress Proxy & Cache Layer
 *
 * This worker acts as a middleware between the React frontend and WordPress backend,
 * providing caching, image optimization, and API transformation.
 */

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WP-Nonce',
  'Access-Control-Max-Age': '86400',
};

// Cache TTL configurations (in seconds)
const CACHE_CONFIG = {
  posts: 300,           // 5 minutes for posts
  pages: 600,           // 10 minutes for pages
  events: 60,           // 1 minute for events
  media: 86400,         // 24 hours for media
  categories: 3600,     // 1 hour for categories
  tags: 3600,           // 1 hour for tags
  users: 3600,          // 1 hour for users
  default: 300,         // 5 minutes default
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route handlers
    if (url.pathname.startsWith('/wp-json/')) {
      return handleWordPressAPI(request, env, ctx, url);
    }

    if (url.pathname === '/api/invalidate-cache') {
      return handleCacheInvalidation(request, env);
    }

    if (url.pathname.startsWith('/api/events')) {
      return handleEventsAPI(request, env, ctx, url);
    }

    if (url.pathname.startsWith('/api/images')) {
      return handleImageOptimization(request, env, ctx, url);
    }

    if (url.pathname === '/api/health') {
      return handleHealthCheck(env);
    }

    // Default: proxy to WordPress
    return proxyToWordPress(request, env);
  }
};

/**
 * Handle WordPress REST API requests with caching
 */
async function handleWordPressAPI(request, env, ctx, url) {
  const cacheKey = `wp-api:${url.pathname}${url.search}`;

  // Only cache GET requests
  if (request.method === 'GET') {
    // Try cache first
    const cached = await env.CACHE_KV.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      return new Response(JSON.stringify(data.body), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Time': data.cachedAt,
        }
      });
    }
  }

  // Fetch from WordPress
  const wpUrl = `${env.WORDPRESS_URL}${url.pathname}${url.search}`;
  const headers = new Headers(request.headers);

  // Forward auth headers
  if (request.headers.has('Authorization')) {
    headers.set('Authorization', request.headers.get('Authorization'));
  }

  try {
    const response = await fetch(wpUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    const data = await response.json();

    // Cache successful GET responses
    if (request.method === 'GET' && response.ok) {
      const ttl = getCacheTTL(url.pathname);
      await env.CACHE_KV.put(cacheKey, JSON.stringify({
        body: data,
        cachedAt: new Date().toISOString()
      }), { expirationTtl: ttl });
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'WordPress API error',
      message: error.message
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle cache invalidation from WordPress webhooks
 */
async function handleCacheInvalidation(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify webhook secret
  const secret = request.headers.get('X-Webhook-Secret');
  if (secret !== env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { post_id, url, type, action } = await request.json();

    // Build list of cache keys to invalidate
    const keysToDelete = [
      `wp-api:/wp-json/wp/v2/posts/${post_id}`,
      `wp-api:/wp-json/wp/v2/posts`,
      `wp-api:/wp-json/contributor/v1/events/post/${post_id}`,
    ];

    // Delete cache entries
    const results = await Promise.allSettled(
      keysToDelete.map(key => env.CACHE_KV.delete(key))
    );

    // Also try to delete any matching list queries
    const listKeys = await env.CACHE_KV.list({ prefix: 'wp-api:/wp-json/wp/v2/posts' });
    await Promise.allSettled(
      listKeys.keys.map(key => env.CACHE_KV.delete(key.name))
    );

    return new Response(JSON.stringify({
      success: true,
      invalidated: keysToDelete.length,
      post_id,
      action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Invalidation failed',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle ActivityStreams events API with enhanced caching
 */
async function handleEventsAPI(request, env, ctx, url) {
  const path = url.pathname.replace('/api/events', '');

  // Map to WordPress Contributor API
  let wpPath = '/wp-json/contributor/v1/events';
  if (path) {
    wpPath += path;
  }

  const cacheKey = `events:${wpPath}${url.search}`;

  // Try cache for GET requests
  if (request.method === 'GET') {
    const cached = await env.CACHE_KV.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        }
      });
    }
  }

  // Forward to WordPress
  const wpUrl = `${env.WORDPRESS_URL}${wpPath}${url.search}`;
  const headers = new Headers(request.headers);

  if (request.headers.has('Authorization')) {
    headers.set('Authorization', request.headers.get('Authorization'));
  }

  try {
    const response = await fetch(wpUrl, {
      method: request.method,
      headers,
    });

    const data = await response.text();

    // Cache successful GET responses
    if (request.method === 'GET' && response.ok) {
      await env.CACHE_KV.put(cacheKey, data, {
        expirationTtl: CACHE_CONFIG.events
      });
    }

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Events API error',
      message: error.message
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle image optimization through Cloudflare
 */
async function handleImageOptimization(request, env, ctx, url) {
  const imageUrl = url.searchParams.get('url');
  const width = parseInt(url.searchParams.get('w') || '0');
  const height = parseInt(url.searchParams.get('h') || '0');
  const quality = parseInt(url.searchParams.get('q') || '80');
  const format = url.searchParams.get('format') || 'auto';

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Build cache key
  const cacheKey = `image:${imageUrl}:${width}:${height}:${quality}:${format}`;

  // Check if we have it in R2
  if (env.IMAGES_R2) {
    const cached = await env.IMAGES_R2.get(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': cached.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
          'X-Cache': 'HIT',
        }
      });
    }
  }

  // Fetch and optimize image
  try {
    // Use Cloudflare's image resizing
    const imageOptions = {
      cf: {
        image: {
          fit: 'cover',
          quality,
          format,
        }
      }
    };

    if (width) imageOptions.cf.image.width = width;
    if (height) imageOptions.cf.image.height = height;

    const response = await fetch(imageUrl, imageOptions);

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }

    const imageData = await response.arrayBuffer();

    // Store in R2 for future requests
    if (env.IMAGES_R2) {
      ctx.waitUntil(
        env.IMAGES_R2.put(cacheKey, imageData, {
          httpMetadata: {
            contentType: response.headers.get('Content-Type'),
          }
        })
      );
    }

    return new Response(imageData, {
      headers: {
        'Content-Type': response.headers.get('Content-Type'),
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'MISS',
      }
    });
  } catch (error) {
    // Fallback: return original image
    return fetch(imageUrl);
  }
}

/**
 * Health check endpoint
 */
async function handleHealthCheck(env) {
  const checks = {
    worker: 'ok',
    cache_kv: 'unknown',
    wordpress: 'unknown',
  };

  // Test KV
  try {
    await env.CACHE_KV.put('health-check', Date.now().toString(), { expirationTtl: 60 });
    const val = await env.CACHE_KV.get('health-check');
    checks.cache_kv = val ? 'ok' : 'error';
  } catch (e) {
    checks.cache_kv = 'error';
  }

  // Test WordPress
  try {
    const response = await fetch(`${env.WORDPRESS_URL}/wp-json/`, {
      method: 'HEAD',
      cf: { cacheTtl: 0 }
    });
    checks.wordpress = response.ok ? 'ok' : 'error';
  } catch (e) {
    checks.wordpress = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');

  return new Response(JSON.stringify({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }), {
    status: allOk ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Proxy requests directly to WordPress
 */
async function proxyToWordPress(request, env) {
  const url = new URL(request.url);
  const wpUrl = `${env.WORDPRESS_URL}${url.pathname}${url.search}`;

  try {
    const response = await fetch(wpUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : undefined,
    });

    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response('Proxy error', { status: 502 });
  }
}

/**
 * Get cache TTL based on endpoint
 */
function getCacheTTL(pathname) {
  if (pathname.includes('/posts/')) return CACHE_CONFIG.posts;
  if (pathname.includes('/pages/')) return CACHE_CONFIG.pages;
  if (pathname.includes('/media/')) return CACHE_CONFIG.media;
  if (pathname.includes('/categories')) return CACHE_CONFIG.categories;
  if (pathname.includes('/tags')) return CACHE_CONFIG.tags;
  if (pathname.includes('/users')) return CACHE_CONFIG.users;
  if (pathname.includes('/events')) return CACHE_CONFIG.events;
  return CACHE_CONFIG.default;
}
