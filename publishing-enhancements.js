/**
 * News Publishing Enhancements
 *
 * Enterprise patterns adapted from major outlets:
 * - NYT Scoop/Oak patterns (A/B testing, event streaming)
 * - Washington Post Arc XP patterns (breaking news, scheduling)
 * - Guardian Fronts patterns (real-time analytics, alerts)
 * - Wire service patterns (AP/Reuters live-blogging)
 *
 * @see https://ghost.org - Primary publishing integration
 * @see https://developer.wordpress.org/rest-api/ - WordPress integration
 */

// ============================================
// BREAKING NEWS ALERT SYSTEM
// Pattern: Guardian's Fronts "Send Alert" functionality
// ============================================

/**
 * Breaking News Alert Manager
 * Prevents duplicate alerts and manages push notification queue
 */
export class BreakingNewsAlertManager {
  constructor() {
    this.sentAlerts = new Set();
    this.alertQueue = [];
  }

  /**
   * Send breaking news alert
   * Includes safeguard against duplicate alerts (Guardian pattern)
   */
  async sendAlert(article, options = {}) {
    const alertId = `${article.title}-${Date.now()}`;

    // Prevent duplicate alerts on same story
    const storyHash = this.hashStory(article.title);
    if (this.sentAlerts.has(storyHash)) {
      console.warn('Alert already sent for this story');
      return { success: false, reason: 'duplicate' };
    }

    const alert = {
      id: alertId,
      headline: options.alertHeadline || article.title,
      summary: options.alertSummary || article.metadata?.seo?.metaDescription || article.subtitle,
      url: options.articleUrl,
      urgency: options.urgency || 'breaking', // breaking, developing, update
      timestamp: new Date().toISOString(),
      channels: options.channels || ['web', 'mobile', 'email']
    };

    try {
      const results = await Promise.allSettled([
        options.channels?.includes('slack') && this.sendSlackAlert(alert, options.slackWebhook),
        options.channels?.includes('email') && this.sendEmailAlert(alert, options.emailList),
        options.pushNotifications && this.sendPushNotification(alert, options.pushConfig)
      ]);

      this.sentAlerts.add(storyHash);

      return {
        success: true,
        alertId,
        results: results.filter(r => r.status === 'fulfilled').map(r => r.value)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  hashStory(title) {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
  }

  async sendSlackAlert(alert, webhookUrl) {
    if (!webhookUrl) return null;

    const payload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `BREAKING: ${alert.headline}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.summary
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Urgency:* ${alert.urgency} | *Sent:* ${new Date(alert.timestamp).toLocaleTimeString()}`
            }
          ]
        },
        alert.url && {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Article' },
              url: alert.url,
              style: 'primary'
            }
          ]
        }
      ].filter(Boolean)
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return { channel: 'slack', success: response.ok };
  }

  async sendEmailAlert(alert, emailList) {
    // Integration point for email services (SendGrid, Postmark, etc.)
    console.log('Email alert would be sent to:', emailList);
    return { channel: 'email', success: true, recipients: emailList?.length || 0 };
  }

  async sendPushNotification(alert, config) {
    // Integration point for push services (OneSignal, Firebase, etc.)
    console.log('Push notification would be sent:', alert.headline);
    return { channel: 'push', success: true };
  }

  clearAlertHistory() {
    this.sentAlerts.clear();
  }
}


// ============================================
// SLACK INTEGRATION
// Pattern: "Slack has become the newsroom coordination backbone"
// SF Chronicle: #breaking-news, #wildfire-season channels
// Quartz: Custom bots announcing published stories
// Nine Publishing: CMS directly integrated with Slack
// ============================================

/**
 * Slack Newsroom Integration
 * Announces published stories and enables team coordination
 */
export class SlackNewsroomIntegration {
  constructor(config = {}) {
    this.defaultWebhook = config.defaultWebhook;
    this.channels = config.channels || {
      general: config.defaultWebhook,
      breaking: config.breakingWebhook,
      published: config.publishedWebhook
    };
  }

  /**
   * Announce published story (Quartz pattern)
   */
  async announcePublished(article, options = {}) {
    const webhook = this.channels.published || this.defaultWebhook;
    if (!webhook) return { success: false, reason: 'No webhook configured' };

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*New Story Published*\n<${options.url}|${article.title}>`
        }
      },
      article.subtitle && {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: article.subtitle }]
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*Author:* ${article.byline}` },
          article.metadata?.tags?.length > 0 && {
            type: 'mrkdwn',
            text: `*Tags:* ${article.metadata.tags.join(', ')}`
          }
        ].filter(Boolean)
      },
      {
        type: 'divider'
      }
    ].filter(Boolean);

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
      });
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Request editorial review via Slack
   */
  async requestReview(article, reviewer, options = {}) {
    const webhook = this.channels.general || this.defaultWebhook;
    if (!webhook) return { success: false, reason: 'No webhook configured' };

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Review Requested* ${reviewer ? `<@${reviewer}>` : ''}\n*Article:* ${article.title}`
        }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*Author:* ${article.byline}` },
          { type: 'mrkdwn', text: `*Status:* ${article.status}` },
          { type: 'mrkdwn', text: `*Word count:* ${this.getWordCount(article.body)}` }
        ]
      },
      options.notes && {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Notes:* ${options.notes}` }
      },
      options.previewUrl && {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Preview Draft' },
            url: options.previewUrl
          }
        ]
      }
    ].filter(Boolean);

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
      });
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Status update notification
   */
  async notifyStatusChange(article, oldStatus, newStatus, options = {}) {
    const webhook = this.channels.general || this.defaultWebhook;
    if (!webhook) return { success: false, reason: 'No webhook configured' };

    const statusEmoji = {
      'draft': ':memo:',
      'in-review': ':eyes:',
      'ready': ':white_check_mark:',
      'published': ':rocket:'
    };

    const blocks = [
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${statusEmoji[newStatus] || ':arrow_right:'} *${article.title}* moved from _${oldStatus}_ to _${newStatus}_`
          }
        ]
      }
    ];

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks })
      });
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getWordCount(html) {
    return html.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  }
}


// ============================================
// A/B HEADLINE TESTING (Enhanced)
// Pattern: NYT tests ~29% of articles with up to 8 variants
// Shows different versions for ~30 minutes before selecting winners
// A/B-tested articles 80% more likely to appear on "most popular"
// ============================================

/**
 * Enhanced A/B Testing System
 * Based on NYT's headline optimization practices
 */
export class HeadlineABTesting {
  constructor(config = {}) {
    this.testDuration = config.testDuration || 30 * 60 * 1000; // 30 minutes default
    this.maxVariants = config.maxVariants || 8;
    this.activeTests = new Map();
  }

  /**
   * Create A/B test for headline variants
   */
  createTest(articleId, variants) {
    if (variants.length > this.maxVariants) {
      console.warn(`Limiting to ${this.maxVariants} variants (NYT pattern)`);
      variants = variants.slice(0, this.maxVariants);
    }

    const test = {
      id: `test-${articleId}-${Date.now()}`,
      articleId,
      variants: variants.map((text, index) => ({
        id: `variant-${index}`,
        text,
        impressions: 0,
        clicks: 0,
        clickRate: 0,
        timeOnPage: [],
        scrollDepth: []
      })),
      startTime: Date.now(),
      endTime: Date.now() + this.testDuration,
      status: 'running',
      winner: null
    };

    this.activeTests.set(test.id, test);

    // Auto-complete test after duration
    setTimeout(() => this.completeTest(test.id), this.testDuration);

    return test;
  }

  /**
   * Record impression for a variant
   */
  recordImpression(testId, variantId) {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') return;

    const variant = test.variants.find(v => v.id === variantId);
    if (variant) {
      variant.impressions++;
      this.updateClickRate(variant);
    }
  }

  /**
   * Record click for a variant
   */
  recordClick(testId, variantId) {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') return;

    const variant = test.variants.find(v => v.id === variantId);
    if (variant) {
      variant.clicks++;
      this.updateClickRate(variant);
    }
  }

  /**
   * Record engagement metrics
   */
  recordEngagement(testId, variantId, metrics) {
    const test = this.activeTests.get(testId);
    if (!test) return;

    const variant = test.variants.find(v => v.id === variantId);
    if (variant) {
      if (metrics.timeOnPage) variant.timeOnPage.push(metrics.timeOnPage);
      if (metrics.scrollDepth) variant.scrollDepth.push(metrics.scrollDepth);
    }
  }

  updateClickRate(variant) {
    variant.clickRate = variant.impressions > 0
      ? (variant.clicks / variant.impressions * 100).toFixed(2)
      : 0;
  }

  /**
   * Complete test and select winner
   */
  completeTest(testId) {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') return null;

    // Calculate composite score (CTR + engagement)
    test.variants.forEach(v => {
      const avgTimeOnPage = v.timeOnPage.length > 0
        ? v.timeOnPage.reduce((a, b) => a + b, 0) / v.timeOnPage.length
        : 0;
      const avgScrollDepth = v.scrollDepth.length > 0
        ? v.scrollDepth.reduce((a, b) => a + b, 0) / v.scrollDepth.length
        : 0;

      // Weighted score: 60% CTR, 25% time on page, 15% scroll depth
      v.compositeScore = (
        parseFloat(v.clickRate) * 0.6 +
        (avgTimeOnPage / 60) * 0.25 + // Normalize to ~minutes
        (avgScrollDepth / 100) * 0.15 * 100 // Normalize percentage
      );
    });

    // Select winner
    test.winner = test.variants.reduce((best, current) =>
      current.compositeScore > best.compositeScore ? current : best
    );
    test.status = 'completed';
    test.completedAt = Date.now();

    return test;
  }

  /**
   * Get random variant for display (equal distribution)
   */
  getVariantForDisplay(testId) {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') {
      return test?.winner || null;
    }

    // Simple random selection for equal distribution
    const randomIndex = Math.floor(Math.random() * test.variants.length);
    return test.variants[randomIndex];
  }

  /**
   * Get test results
   */
  getTestResults(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * Export test data for analysis
   */
  exportTestData(testId) {
    const test = this.activeTests.get(testId);
    if (!test) return null;

    return {
      testId: test.id,
      articleId: test.articleId,
      duration: (test.completedAt || Date.now()) - test.startTime,
      status: test.status,
      variants: test.variants.map(v => ({
        headline: v.text,
        impressions: v.impressions,
        clicks: v.clicks,
        clickRate: `${v.clickRate}%`,
        avgTimeOnPage: v.timeOnPage.length > 0
          ? `${(v.timeOnPage.reduce((a, b) => a + b, 0) / v.timeOnPage.length).toFixed(1)}s`
          : 'N/A',
        compositeScore: v.compositeScore?.toFixed(2) || 'N/A'
      })),
      winner: test.winner ? {
        headline: test.winner.text,
        clickRate: `${test.winner.clickRate}%`
      } : null
    };
  }
}


// ============================================
// ARTICLE ANALYTICS
// Pattern: Guardian's Ophan real-time analytics
// "editors see performance data alongside content placement"
// ============================================

/**
 * Real-time Article Analytics
 * Based on Guardian's Ophan system
 */
export class ArticleAnalytics {
  constructor(config = {}) {
    this.analyticsProvider = config.provider || 'plausible';
    this.siteId = config.siteId;
    this.apiKey = config.apiKey;
  }

  /**
   * Calculate reading statistics
   */
  calculateReadingStats(body) {
    const text = body.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const syllables = this.countSyllables(text);

    // Word count
    const wordCount = words.length;

    // Reading time (average 200-250 WPM)
    const readingTimeMinutes = Math.ceil(wordCount / 225);

    // Flesch Reading Ease (higher = easier)
    // 90-100: Very Easy, 60-70: Standard, 0-30: Very Difficult
    const fleschScore = 206.835 -
      (1.015 * (wordCount / sentences.length)) -
      (84.6 * (syllables / wordCount));

    // Flesch-Kincaid Grade Level
    const gradeLevel = 0.39 * (wordCount / sentences.length) +
      11.8 * (syllables / wordCount) - 15.59;

    // Reading level interpretation
    let readingLevel;
    if (fleschScore >= 90) readingLevel = 'Very Easy (5th grade)';
    else if (fleschScore >= 80) readingLevel = 'Easy (6th grade)';
    else if (fleschScore >= 70) readingLevel = 'Fairly Easy (7th grade)';
    else if (fleschScore >= 60) readingLevel = 'Standard (8th-9th grade)';
    else if (fleschScore >= 50) readingLevel = 'Fairly Difficult (10th-12th grade)';
    else if (fleschScore >= 30) readingLevel = 'Difficult (College)';
    else readingLevel = 'Very Difficult (Professional)';

    return {
      wordCount,
      characterCount: text.length,
      sentenceCount: sentences.length,
      paragraphCount: body.split(/<\/p>|<br\s*\/?>/i).filter(Boolean).length,
      readingTime: {
        minutes: readingTimeMinutes,
        display: readingTimeMinutes === 1 ? '1 min read' : `${readingTimeMinutes} min read`
      },
      readability: {
        fleschScore: Math.round(fleschScore),
        gradeLevel: Math.round(gradeLevel * 10) / 10,
        readingLevel
      }
    };
  }

  countSyllables(text) {
    const words = text.toLowerCase().split(/\s+/);
    return words.reduce((total, word) => {
      word = word.replace(/[^a-z]/g, '');
      if (word.length <= 3) return total + 1;
      word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
      word = word.replace(/^y/, '');
      const matches = word.match(/[aeiouy]{1,2}/g);
      return total + (matches ? matches.length : 1);
    }, 0);
  }

  /**
   * Get engagement predictions based on content analysis
   */
  predictEngagement(article) {
    const stats = this.calculateReadingStats(article.body);
    const predictions = {
      shareability: 0,
      completionLikelihood: 0,
      factors: []
    };

    // Headline analysis
    const headlineLength = article.title.length;
    if (headlineLength >= 40 && headlineLength <= 70) {
      predictions.shareability += 20;
      predictions.factors.push({ factor: 'Optimal headline length', impact: '+20%' });
    }

    // Has numbers in headline (higher CTR)
    if (/\d/.test(article.title)) {
      predictions.shareability += 15;
      predictions.factors.push({ factor: 'Number in headline', impact: '+15%' });
    }

    // Question headlines perform well
    if (article.title.includes('?')) {
      predictions.shareability += 10;
      predictions.factors.push({ factor: 'Question headline', impact: '+10%' });
    }

    // Readability impact
    if (stats.readability.fleschScore >= 60) {
      predictions.completionLikelihood += 25;
      predictions.factors.push({ factor: 'Good readability', impact: '+25% completion' });
    }

    // Optimal article length (1000-2000 words for long-form)
    if (stats.wordCount >= 1000 && stats.wordCount <= 2000) {
      predictions.completionLikelihood += 20;
      predictions.factors.push({ factor: 'Optimal length', impact: '+20% completion' });
    }

    // Has multimedia (images in body)
    if (/<img\s/.test(article.body)) {
      predictions.shareability += 15;
      predictions.completionLikelihood += 10;
      predictions.factors.push({ factor: 'Contains images', impact: '+15% shares' });
    }

    // Has blockquotes (indicates sourced content)
    if (/<blockquote/.test(article.body)) {
      predictions.shareability += 10;
      predictions.factors.push({ factor: 'Contains quotes', impact: '+10% shares' });
    }

    return predictions;
  }

  /**
   * Fetch real-time analytics from Plausible
   */
  async fetchPlausibleStats(articlePath, period = '30d') {
    if (!this.apiKey || !this.siteId) {
      return { error: 'Plausible not configured' };
    }

    try {
      const response = await fetch(
        `https://plausible.io/api/v1/stats/aggregate?` +
        `site_id=${this.siteId}&` +
        `period=${period}&` +
        `filters=event:page==${articlePath}&` +
        `metrics=visitors,pageviews,bounce_rate,visit_duration`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );

      const data = await response.json();
      return {
        visitors: data.results?.visitors?.value || 0,
        pageviews: data.results?.pageviews?.value || 0,
        bounceRate: data.results?.bounce_rate?.value || 0,
        avgDuration: data.results?.visit_duration?.value || 0
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}


// ============================================
// WORDPRESS INTEGRATION
// Pattern: Alternative to Ghost for WordPress-based newsrooms
// Newspack ($750+/month) uses WordPress with news-optimized plugins
// ============================================

/**
 * WordPress Publishing Integration
 * For newsrooms using WordPress/Newspack
 */
export class WordPressPublisher {
  constructor(config) {
    this.siteUrl = config.siteUrl;
    this.username = config.username;
    this.appPassword = config.appPassword; // Application password, not user password
  }

  getAuthHeader() {
    const credentials = btoa(`${this.username}:${this.appPassword}`);
    return `Basic ${credentials}`;
  }

  /**
   * Publish article to WordPress
   */
  async publish(article, options = {}) {
    try {
      const postData = {
        title: article.title,
        content: article.body,
        excerpt: article.subtitle || article.metadata?.seo?.metaDescription,
        status: options.status || (article.status === 'published' ? 'publish' : 'draft'),
        categories: await this.resolveCategories(article.metadata?.categories || []),
        tags: await this.resolveTags(article.metadata?.tags || []),
        meta: {
          _yoast_wpseo_metadesc: article.metadata?.seo?.metaDescription,
          _yoast_wpseo_focuskw: article.metadata?.seo?.keywords?.[0]
        }
      };

      if (options.scheduledDate) {
        postData.status = 'future';
        postData.date = options.scheduledDate.toISOString();
      }

      const response = await fetch(`${this.siteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'WordPress API error');
      }

      const post = await response.json();
      return {
        success: true,
        id: post.id,
        url: post.link,
        editUrl: `${this.siteUrl}/wp-admin/post.php?post=${post.id}&action=edit`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update existing WordPress post
   */
  async update(postId, article) {
    try {
      const response = await fetch(`${this.siteUrl}/wp-json/wp/v2/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify({
          title: article.title,
          content: article.body,
          excerpt: article.subtitle
        })
      });

      if (!response.ok) throw new Error('Update failed');

      const post = await response.json();
      return { success: true, url: post.link };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resolveCategories(categoryNames) {
    // Get or create categories
    const ids = [];
    for (const name of categoryNames) {
      try {
        // Search for existing
        const response = await fetch(
          `${this.siteUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(name)}`,
          { headers: { 'Authorization': this.getAuthHeader() } }
        );
        const categories = await response.json();

        if (categories.length > 0) {
          ids.push(categories[0].id);
        } else {
          // Create new category
          const createResponse = await fetch(`${this.siteUrl}/wp-json/wp/v2/categories`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.getAuthHeader()
            },
            body: JSON.stringify({ name })
          });
          const newCat = await createResponse.json();
          ids.push(newCat.id);
        }
      } catch (e) {
        console.warn(`Could not resolve category: ${name}`);
      }
    }
    return ids;
  }

  async resolveTags(tagNames) {
    const ids = [];
    for (const name of tagNames) {
      try {
        const response = await fetch(
          `${this.siteUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(name)}`,
          { headers: { 'Authorization': this.getAuthHeader() } }
        );
        const tags = await response.json();

        if (tags.length > 0) {
          ids.push(tags[0].id);
        } else {
          const createResponse = await fetch(`${this.siteUrl}/wp-json/wp/v2/tags`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.getAuthHeader()
            },
            body: JSON.stringify({ name })
          });
          const newTag = await createResponse.json();
          ids.push(newTag.id);
        }
      } catch (e) {
        console.warn(`Could not resolve tag: ${name}`);
      }
    }
    return ids;
  }
}


// ============================================
// MULTI-PLATFORM EXPORT
// Pattern: "Create Once, Publish Everywhere" (COPE)
// Arc XP, NYT Scoop: Content flows to web, mobile, newsletters, Apple News
// ============================================

/**
 * Multi-Platform Export Generator
 * Generates platform-specific formats from single source
 */
export class MultiPlatformExporter {

  /**
   * Generate Apple News Format (ANF)
   * For publishing to Apple News
   */
  generateAppleNewsFormat(article) {
    return {
      version: '1.9',
      identifier: `article-${Date.now()}`,
      title: article.title,
      subtitle: article.subtitle || '',
      language: 'en',
      layout: {
        columns: 7,
        width: 1024,
        margin: 70,
        gutter: 20
      },
      components: [
        {
          role: 'title',
          text: article.title,
          textStyle: 'title'
        },
        article.subtitle && {
          role: 'intro',
          text: article.subtitle,
          textStyle: 'introStyle'
        },
        {
          role: 'byline',
          text: article.byline,
          textStyle: 'bylineStyle'
        },
        {
          role: 'body',
          text: this.htmlToAppleNews(article.body),
          format: 'html'
        }
      ].filter(Boolean),
      componentTextStyles: {
        title: {
          fontName: 'Georgia-Bold',
          fontSize: 36,
          lineHeight: 44
        },
        introStyle: {
          fontName: 'Georgia',
          fontSize: 20,
          textColor: '#666666'
        },
        bylineStyle: {
          fontName: 'Helvetica',
          fontSize: 13,
          fontStyle: 'italic',
          textColor: '#888888'
        }
      },
      metadata: {
        authors: [article.byline.replace(/^By\s+/i, '')],
        excerpt: article.metadata?.seo?.metaDescription || article.subtitle,
        keywords: article.metadata?.seo?.keywords || [],
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString()
      }
    };
  }

  htmlToAppleNews(html) {
    // Basic conversion - Apple News supports a subset of HTML
    return html
      .replace(/<h1>/g, '<h1 class="title">')
      .replace(/<h2>/g, '<h2 class="heading">')
      .replace(/<blockquote>/g, '<aside>')
      .replace(/<\/blockquote>/g, '</aside>');
  }

  /**
   * Generate RSS/Atom feed entry
   */
  generateRSSItem(article, options = {}) {
    const pubDate = new Date().toUTCString();
    const guid = options.url || `article-${Date.now()}`;

    return `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${options.url || ''}</link>
      <guid isPermaLink="${options.url ? 'true' : 'false'}">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator><![CDATA[${article.byline.replace(/^By\s+/i, '')}]]></dc:creator>
      <description><![CDATA[${article.metadata?.seo?.metaDescription || article.subtitle || ''}]]></description>
      <content:encoded><![CDATA[${article.body}]]></content:encoded>
      ${article.metadata?.tags?.map(tag => `<category><![CDATA[${tag}]]></category>`).join('\n') || ''}
    </item>`.trim();
  }

  /**
   * Generate AMP HTML
   * For Google AMP pages
   */
  generateAMPHTML(article, options = {}) {
    const canonicalUrl = options.canonicalUrl || '#';

    return `<!doctype html>
<html amp lang="en">
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <title>${article.title}</title>
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
  <meta name="description" content="${article.metadata?.seo?.metaDescription || ''}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${article.title}",
    "datePublished": "${new Date().toISOString()}",
    "author": {
      "@type": "Person",
      "name": "${article.byline.replace(/^By\s+/i, '')}"
    }
  }
  </script>
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  <style amp-custom>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
    h1 { font-size: 2em; line-height: 1.2; }
    .subtitle { color: #666; font-size: 1.2em; }
    .byline { font-style: italic; color: #888; }
    blockquote { border-left: 3px solid #0066cc; padding-left: 1em; margin-left: 0; }
  </style>
</head>
<body>
  <article>
    <h1>${article.title}</h1>
    ${article.subtitle ? `<p class="subtitle">${article.subtitle}</p>` : ''}
    <p class="byline">${article.byline} | ${article.date}</p>
    ${this.convertToAMP(article.body)}
  </article>
</body>
</html>`;
  }

  convertToAMP(html) {
    // Convert standard HTML to AMP-compatible
    return html
      .replace(/<img([^>]*)src="([^"]*)"([^>]*)>/gi,
        '<amp-img$1src="$2"$3 layout="responsive" width="600" height="400"></amp-img>')
      .replace(/<iframe([^>]*)>/gi, '<amp-iframe$1 sandbox="allow-scripts" layout="responsive">')
      .replace(/<\/iframe>/gi, '</amp-iframe>');
  }

  /**
   * Generate plain text version (for email clients that don't support HTML)
   */
  generatePlainText(article) {
    const text = article.body
      .replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '\n\n$1\n' + '='.repeat(40) + '\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li>(.*?)<\/li>/gi, '  - $1\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, '\n    "$1"\n')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n');

    return `${article.title}
${'='.repeat(article.title.length)}

${article.subtitle ? article.subtitle + '\n\n' : ''}${article.byline}
${article.date}

${'-'.repeat(40)}

${text.trim()}

${article.sources?.length > 0 ? `
${'-'.repeat(40)}
SOURCES:
${article.sources.map((s, i) => `${i + 1}. ${s.name} (${s.type})${s.url ? '\n   ' + s.url : ''}`).join('\n')}
` : ''}`;
  }

  /**
   * Generate structured data (JSON-LD) for SEO
   */
  generateStructuredData(article, options = {}) {
    return {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      alternativeHeadline: article.subtitle,
      description: article.metadata?.seo?.metaDescription,
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: article.byline.replace(/^By\s+/i, '')
      },
      publisher: options.publisher ? {
        '@type': 'Organization',
        name: options.publisher.name,
        logo: {
          '@type': 'ImageObject',
          url: options.publisher.logo
        }
      } : undefined,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': options.url
      },
      keywords: article.metadata?.seo?.keywords?.join(', '),
      articleSection: article.metadata?.categories?.[0],
      wordCount: article.body.replace(/<[^>]*>/g, '').split(/\s+/).length
    };
  }
}


// ============================================
// LIVE BLOGGING
// Pattern: AP's robust live-blogging for election coverage
// Wire services need real-time updates with timestamps
// ============================================

/**
 * Live Blog Manager
 * For real-time news coverage (elections, breaking events)
 */
export class LiveBlogManager {
  constructor() {
    this.entries = [];
    this.isLive = false;
    this.startTime = null;
    this.pinnedEntry = null;
    this.subscribers = new Set();
  }

  /**
   * Start live blog session
   */
  startLiveBlog(title, options = {}) {
    this.isLive = true;
    this.startTime = new Date();
    this.title = title;
    this.description = options.description || '';
    this.entries = [];
    this.pinnedEntry = null;

    return {
      status: 'started',
      title: this.title,
      startTime: this.startTime.toISOString()
    };
  }

  /**
   * Add live blog entry
   */
  addEntry(entry) {
    if (!this.isLive) {
      return { success: false, error: 'Live blog not active' };
    }

    const newEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: entry.type || 'update', // update, breaking, analysis, quote, media
      headline: entry.headline,
      content: entry.content,
      author: entry.author,
      isPinned: false,
      isBreaking: entry.type === 'breaking',
      media: entry.media || null, // { type: 'image'|'video', url, caption }
      sources: entry.sources || []
    };

    // Breaking entries go to top
    if (newEntry.isBreaking) {
      this.entries.unshift(newEntry);
    } else {
      this.entries.unshift(newEntry);
    }

    // Notify subscribers
    this.notifySubscribers('new_entry', newEntry);

    return { success: true, entry: newEntry };
  }

  /**
   * Update existing entry
   */
  updateEntry(entryId, updates) {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return { success: false, error: 'Entry not found' };

    entry.content = updates.content || entry.content;
    entry.headline = updates.headline || entry.headline;
    entry.updatedAt = new Date().toISOString();
    entry.updateNote = updates.updateNote || 'Updated';

    this.notifySubscribers('entry_updated', entry);
    return { success: true, entry };
  }

  /**
   * Pin important entry to top
   */
  pinEntry(entryId) {
    // Unpin current
    if (this.pinnedEntry) {
      const current = this.entries.find(e => e.id === this.pinnedEntry);
      if (current) current.isPinned = false;
    }

    const entry = this.entries.find(e => e.id === entryId);
    if (entry) {
      entry.isPinned = true;
      this.pinnedEntry = entryId;
      this.notifySubscribers('entry_pinned', entry);
      return { success: true };
    }
    return { success: false, error: 'Entry not found' };
  }

  /**
   * Delete entry
   */
  deleteEntry(entryId) {
    const index = this.entries.findIndex(e => e.id === entryId);
    if (index === -1) return { success: false, error: 'Entry not found' };

    const deleted = this.entries.splice(index, 1)[0];
    if (this.pinnedEntry === entryId) this.pinnedEntry = null;

    this.notifySubscribers('entry_deleted', deleted);
    return { success: true };
  }

  /**
   * Get live blog state
   */
  getState() {
    return {
      isLive: this.isLive,
      title: this.title,
      description: this.description,
      startTime: this.startTime?.toISOString(),
      entryCount: this.entries.length,
      pinnedEntry: this.pinnedEntry ?
        this.entries.find(e => e.id === this.pinnedEntry) : null,
      entries: this.entries
    };
  }

  /**
   * Export live blog as static HTML
   */
  exportAsHTML() {
    const pinnedEntry = this.entries.find(e => e.isPinned);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Blog: ${this.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .live-header { background: #dc2626; color: white; padding: 20px; margin-bottom: 20px; }
    .live-badge { display: inline-block; background: white; color: #dc2626; padding: 4px 12px; font-weight: bold; font-size: 12px; margin-bottom: 10px; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .pinned { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; }
    .entry { border-bottom: 1px solid #e5e7eb; padding: 20px 0; }
    .entry.breaking { background: #fef2f2; border-left: 4px solid #dc2626; padding-left: 15px; margin-left: -15px; }
    .timestamp { color: #6b7280; font-size: 14px; margin-bottom: 8px; }
    .entry-headline { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .entry-content { line-height: 1.6; }
    .author { color: #6b7280; font-size: 14px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="live-header">
    <span class="live-badge">LIVE</span>
    <h1>${this.title}</h1>
    ${this.description ? `<p>${this.description}</p>` : ''}
    <p>Started: ${this.startTime?.toLocaleString()}</p>
  </div>

  ${pinnedEntry ? `
  <div class="pinned">
    <strong>PINNED:</strong>
    <div class="entry-headline">${pinnedEntry.headline || ''}</div>
    <div class="entry-content">${pinnedEntry.content}</div>
  </div>
  ` : ''}

  <div class="entries">
    ${this.entries.map(entry => `
    <div class="entry ${entry.isBreaking ? 'breaking' : ''}">
      <div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
      ${entry.headline ? `<div class="entry-headline">${entry.headline}</div>` : ''}
      <div class="entry-content">${entry.content}</div>
      ${entry.author ? `<div class="author">${entry.author}</div>` : ''}
    </div>
    `).join('')}
  </div>
</body>
</html>`;
  }

  /**
   * End live blog
   */
  endLiveBlog() {
    this.isLive = false;
    this.notifySubscribers('ended', { endTime: new Date().toISOString() });
    return {
      status: 'ended',
      duration: Date.now() - this.startTime.getTime(),
      totalEntries: this.entries.length
    };
  }

  // Subscription system for real-time updates
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try { callback(event, data); } catch (e) { console.error(e); }
    });
  }
}


// ============================================
// KEYBOARD SHORTCUTS
// Pattern: Professional editors rely heavily on keyboard navigation
// NYT's Oak, Guardian's Composer all have extensive shortcuts
// ============================================

/**
 * Keyboard shortcut definitions for news editor
 */
export const KEYBOARD_SHORTCUTS = {
  // File operations
  'mod+s': { action: 'save', description: 'Save article' },
  'mod+shift+s': { action: 'saveVersion', description: 'Save new version' },
  'mod+e': { action: 'export', description: 'Open export menu' },
  'mod+p': { action: 'preview', description: 'Preview article' },
  'mod+shift+p': { action: 'publish', description: 'Publish article' },

  // Editing
  'mod+b': { action: 'bold', description: 'Bold text' },
  'mod+i': { action: 'italic', description: 'Italic text' },
  'mod+k': { action: 'link', description: 'Insert link' },
  'mod+shift+k': { action: 'unlink', description: 'Remove link' },
  'mod+shift+i': { action: 'image', description: 'Insert image' },

  // Headings
  'mod+alt+1': { action: 'heading1', description: 'Heading 1' },
  'mod+alt+2': { action: 'heading2', description: 'Heading 2' },
  'mod+alt+3': { action: 'heading3', description: 'Heading 3' },
  'mod+alt+0': { action: 'paragraph', description: 'Normal paragraph' },

  // Lists
  'mod+shift+7': { action: 'orderedList', description: 'Numbered list' },
  'mod+shift+8': { action: 'bulletList', description: 'Bullet list' },
  'mod+shift+9': { action: 'blockquote', description: 'Blockquote' },

  // Navigation & panels
  'mod+\\': { action: 'toggleSidebar', description: 'Toggle sidebar' },
  'mod+shift+h': { action: 'toggleHistory', description: 'Toggle version history' },
  'mod+shift+m': { action: 'toggleMetadata', description: 'Toggle metadata panel' },
  'mod+shift+d': { action: 'toggleDocuments', description: 'Toggle documents panel' },

  // View modes
  'mod+1': { action: 'viewWysiwyg', description: 'Editor view' },
  'mod+2': { action: 'viewMarkdown', description: 'Markdown view' },
  'mod+3': { action: 'viewHtml', description: 'HTML view' },

  // Workflow
  'mod+shift+r': { action: 'requestReview', description: 'Request review' },
  'mod+shift+n': { action: 'addNote', description: 'Add editorial note' },
  'mod+shift+a': { action: 'addSource', description: 'Add source' },

  // Focus
  'mod+shift+t': { action: 'focusTitle', description: 'Focus on title' },
  'mod+shift+b': { action: 'focusBody', description: 'Focus on body' },

  // Undo/Redo
  'mod+z': { action: 'undo', description: 'Undo' },
  'mod+shift+z': { action: 'redo', description: 'Redo' },
  'mod+y': { action: 'redo', description: 'Redo (alternate)' }
};

/**
 * Keyboard shortcut handler
 */
export function createShortcutHandler(actions) {
  return (event) => {
    const mod = event.metaKey || event.ctrlKey;
    const shift = event.shiftKey;
    const alt = event.altKey;

    let key = event.key.toLowerCase();

    // Build shortcut string
    let shortcut = '';
    if (mod) shortcut += 'mod+';
    if (shift) shortcut += 'shift+';
    if (alt) shortcut += 'alt+';
    shortcut += key;

    const definition = KEYBOARD_SHORTCUTS[shortcut];
    if (definition && actions[definition.action]) {
      event.preventDefault();
      actions[definition.action]();
      return true;
    }
    return false;
  };
}


// ============================================
// EXPORT ALL MODULES
// ============================================

export default {
  BreakingNewsAlertManager,
  SlackNewsroomIntegration,
  HeadlineABTesting,
  ArticleAnalytics,
  WordPressPublisher,
  MultiPlatformExporter,
  LiveBlogManager,
  KEYBOARD_SHORTCUTS,
  createShortcutHandler
};
