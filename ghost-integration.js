/**
 * Ghost CMS Integration Example
 * 
 * Ghost is recommended for independent journalists because:
 * - $29-199/month for Ghost Pro (or $5-20/month self-hosted)
 * - Zero platform fees (only Stripe's 2.9% + 30¢)
 * - Built-in newsletter + website + memberships
 * - REST API for publishing
 * - Used by 404 Media, Hell Gate, Platformer, The Lever
 * 
 * Installation:
 * npm install @tryghost/admin-api
 */

import GhostAdminAPI from '@tryghost/admin-api';

// Initialize Ghost Admin API
const api = new GhostAdminAPI({
  url: 'https://your-site.ghost.io', // Your Ghost site URL
  key: 'YOUR_ADMIN_API_KEY',         // Get from Ghost Admin → Integrations
  version: 'v5.0'
});

/**
 * Publish article to Ghost
 */
export async function publishToGhost(article) {
  try {
    const post = await api.posts.add({
      title: article.title,
      html: article.body,
      
      // Optional metadata
      custom_excerpt: article.subtitle || article.metadata.seo.metaDescription,
      meta_title: article.title,
      meta_description: article.metadata.seo.metaDescription,
      og_title: article.title,
      og_description: article.metadata.seo.metaDescription,
      
      // Authors (by email or ID)
      authors: [{
        email: article.byline.replace('By ', '') // Or use author ID
      }],
      
      // Tags
      tags: article.metadata.tags.map(tag => ({ name: tag })),
      
      // Publishing
      status: article.status === 'published' ? 'published' : 'draft',
      published_at: article.status === 'published' ? new Date().toISOString() : null,
      
      // Featured
      feature_image: extractFirstImage(article.body), // Extract from content
      
      // Newsletter options (Ghost 5.0+)
      newsletter: {
        name: 'Your Newsletter Name', // Optional: specify newsletter
      }
    }, {
      source: 'html' // We're providing HTML directly
    });
    
    console.log('✅ Published to Ghost:', post.url);
    return { success: true, url: post.url, id: post.id };
    
  } catch (error) {
    console.error('❌ Ghost publishing error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update existing Ghost post
 */
export async function updateGhostPost(postId, article) {
  try {
    const post = await api.posts.edit({
      id: postId,
      title: article.title,
      html: article.body,
      custom_excerpt: article.subtitle,
      tags: article.metadata.tags.map(tag => ({ name: tag })),
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ Updated Ghost post:', post.url);
    return { success: true, url: post.url };
    
  } catch (error) {
    console.error('❌ Ghost update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create draft and get preview URL
 */
export async function createDraft(article) {
  const result = await publishToGhost({
    ...article,
    status: 'draft'
  });
  
  if (result.success) {
    // Ghost draft URL format
    const previewUrl = `${api.url}/p/${result.id}/`;
    return { ...result, previewUrl };
  }
  
  return result;
}

/**
 * Schedule post for future publication
 */
export async function schedulePost(article, publishDate) {
  try {
    const post = await api.posts.add({
      title: article.title,
      html: article.body,
      status: 'scheduled',
      published_at: publishDate.toISOString(),
      tags: article.metadata.tags.map(tag => ({ name: tag }))
    });
    
    console.log('✅ Scheduled for:', publishDate);
    return { success: true, scheduledFor: publishDate };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Upload image to Ghost
 */
export async function uploadImage(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${api.url}/ghost/api/admin/images/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${api.key}`
      },
      body: formData
    });
    
    const data = await response.json();
    return { success: true, url: data.images[0].url };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all posts (for editing)
 */
export async function listPosts(limit = 15) {
  try {
    const posts = await api.posts.browse({
      limit: limit,
      include: 'tags,authors',
      order: 'published_at DESC'
    });
    
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

/**
 * Helper: Extract first image from HTML
 */
function extractFirstImage(html) {
  const match = html.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

/**
 * React Component: Ghost Publishing Panel
 */
import React, { useState } from 'react';
import { Send, Clock, Save, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

export function GhostPublisher({ article, onPublished }) {
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');

  const handlePublish = async () => {
    setPublishing(true);
    const res = await publishToGhost({ ...article, status: 'published' });
    setResult(res);
    setPublishing(false);
    if (res.success && onPublished) onPublished(res);
  };

  const handleDraft = async () => {
    setPublishing(true);
    const res = await createDraft(article);
    setResult(res);
    setPublishing(false);
    if (res.success && onPublished) onPublished(res);
  };

  const handleSchedule = async () => {
    if (!scheduleDate) {
      alert('Please select a date and time');
      return;
    }
    setPublishing(true);
    const res = await schedulePost(article, new Date(scheduleDate));
    setResult(res);
    setPublishing(false);
    if (res.success && onPublished) onPublished(res);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Publish to Ghost</h3>
      
      {/* Publishing Options */}
      <div className="space-y-3 mb-4">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={18} />
          Publish Now
        </button>

        <button
          onClick={handleDraft}
          disabled={publishing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <Save size={18} />
          Save as Draft
        </button>

        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={handleSchedule}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Clock size={18} />
            Schedule
          </button>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <>
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Published successfully!</p>
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:underline flex items-center gap-1 mt-1"
                    >
                      View article <ExternalLink size={14} />
                    </a>
                  )}
                  {result.previewUrl && (
                    <a
                      href={result.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:underline flex items-center gap-1 mt-1"
                    >
                      Preview draft <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Publishing failed</p>
                  <p className="text-sm text-red-700 mt-1">{result.error}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ghost Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
        <p className="font-medium mb-1">Ghost Benefits:</p>
        <ul className="space-y-0.5 text-xs">
          <li>• Automatic newsletter distribution</li>
          <li>• Built-in membership management</li>
          <li>• SEO optimization</li>
          <li>• Mobile apps support</li>
          <li>• Zero platform fees</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * SETUP INSTRUCTIONS
 * 
 * 1. Create Ghost site:
 *    - Ghost Pro: https://ghost.org/pricing/ ($29-199/month)
 *    - Self-hosted: https://ghost.org/docs/install/
 * 
 * 2. Get Admin API key:
 *    - Go to Ghost Admin → Settings → Integrations
 *    - Click "Add custom integration"
 *    - Name it "News Editor"
 *    - Copy the Admin API Key
 * 
 * 3. Configure in your app:
 *    const api = new GhostAdminAPI({
 *      url: 'https://your-site.ghost.io',
 *      key: 'PASTE_YOUR_API_KEY_HERE',
 *      version: 'v5.0'
 *    });
 * 
 * 4. Test with a draft:
 *    const result = await createDraft(yourArticle);
 *    console.log(result.previewUrl);
 * 
 * 5. When ready, publish:
 *    await publishToGhost(yourArticle);
 */

/**
 * ADVANCED: Newsletter-specific publishing
 */
export async function publishAsNewsletterOnly(article) {
  try {
    const post = await api.posts.add({
      title: article.title,
      html: article.body,
      status: 'published',
      visibility: 'members', // Only for members
      newsletter: {
        name: 'Weekly Investigative Report',
        // Optional: segment by tag
        // filter: 'tag:premium'
      }
    });
    
    return { success: true, url: post.url };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * ADVANCED: Multi-newsletter support (Ghost 5.0+)
 */
export async function publishToMultipleNewsletters(article, newsletters) {
  const results = [];
  
  for (const newsletter of newsletters) {
    const result = await publishToGhost({
      ...article,
      newsletter: { name: newsletter }
    });
    results.push({ newsletter, ...result });
  }
  
  return results;
}

/**
 * Example: Complete publishing workflow
 */
export async function completePublishingWorkflow(article, options = {}) {
  // Step 1: Create draft
  console.log('📝 Creating draft...');
  const draft = await createDraft(article);
  
  if (!draft.success) {
    return { step: 'draft', error: draft.error };
  }
  
  // Step 2: Upload featured image if provided
  if (options.featuredImage) {
    console.log('🖼️ Uploading featured image...');
    const imageResult = await uploadImage(options.featuredImage);
    if (imageResult.success) {
      article.featuredImage = imageResult.url;
    }
  }
  
  // Step 3: If review period, stop here
  if (options.requireReview) {
    console.log('👀 Draft created, awaiting review');
    return { step: 'draft', previewUrl: draft.previewUrl };
  }
  
  // Step 4: Publish or schedule
  if (options.scheduleDate) {
    console.log('⏰ Scheduling post...');
    return await schedulePost(article, new Date(options.scheduleDate));
  } else {
    console.log('🚀 Publishing now...');
    return await publishToGhost({ ...article, status: 'published' });
  }
}

/**
 * Example usage in your editor:
 * 
 * // Simple publish
 * const result = await publishToGhost(article);
 * 
 * // Complete workflow
 * const result = await completePublishingWorkflow(article, {
 *   featuredImage: file,
 *   requireReview: true
 * });
 * 
 * // Schedule for tomorrow 9am
 * const tomorrow = new Date();
 * tomorrow.setDate(tomorrow.getDate() + 1);
 * tomorrow.setHours(9, 0, 0);
 * const result = await schedulePost(article, tomorrow);
 */
