/**
 * React Hooks for ActivityStreams Event Sourcing
 *
 * SIMPLIFIED ARCHITECTURE - Direct WordPress API access, no middleware!
 *
 * These hooks provide integration with the WordPress ActivityStreams
 * event store, enabling version history, event replay, and real-time sync.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as wordpress from '../api/wordpress';

// Configuration
const DEFAULT_CONFIG = {
  pollInterval: 30000, // 30 seconds
  enableRealtime: true,
};

/**
 * Hook to fetch and manage article events/version history
 *
 * @param {number|string} articleId - The WordPress post ID
 * @param {object} options - Configuration options
 * @returns {object} Events data and helper functions
 *
 * Usage:
 * ```jsx
 * const { events, loading, latestEvent, contributors } = useArticleEvents(123);
 * ```
 */
export function useArticleEvents(articleId, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [articleTitle, setArticleTitle] = useState('');
  const pollRef = useRef(null);

  // Fetch events for article (PUBLIC endpoint - no auth needed!)
  const fetchEvents = useCallback(async () => {
    if (!articleId) return;

    try {
      setLoading(true);
      const data = await wordpress.getArticleHistory(articleId);
      setEvents(data.history || []);
      setArticleTitle(data.article_title || '');
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching article events:', err);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  // Replay events to rebuild state at a specific version
  const replayToVersion = useCallback(async (version) => {
    if (!articleId || !events.length) return null;

    // Client-side replay - apply events up to the specified version
    const eventsToApply = events.slice(0, version);
    let state = null;

    eventsToApply.forEach(event => {
      switch (event.type) {
        case 'Create':
          state = { ...event };
          break;
        case 'Update':
          if (state) {
            state = { ...state, ...event };
          }
          break;
        case 'Delete':
          state = null;
          break;
        default:
          if (state) {
            state = { ...state, ...event };
          }
      }
    });

    return state;
  }, [articleId, events]);

  // Get state at specific index
  const getStateAtIndex = useCallback((index) => {
    return replayToVersion(index + 1);
  }, [replayToVersion]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Setup polling for real-time updates
  useEffect(() => {
    if (!config.enableRealtime || !articleId) return;

    pollRef.current = setInterval(fetchEvents, config.pollInterval);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [fetchEvents, config.enableRealtime, config.pollInterval, articleId]);

  // Computed values
  const currentVersion = events.length;

  const latestEvent = useMemo(() =>
    events.length > 0 ? events[events.length - 1] : null,
    [events]
  );

  const eventsByType = useMemo(() => {
    const grouped = {};
    events.forEach(event => {
      const type = event.type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(event);
    });
    return grouped;
  }, [events]);

  const contributors = useMemo(() => {
    const actorMap = new Map();
    events.forEach(event => {
      if (event.actor?.id) {
        actorMap.set(event.actor.id, event.actor);
      }
    });
    return Array.from(actorMap.values());
  }, [events]);

  return {
    events,
    loading,
    error,
    articleTitle,
    currentVersion,
    latestEvent,
    eventsByType,
    contributors,
    refetch: fetchEvents,
    replayToVersion,
    getStateAtIndex,
  };
}

/**
 * Hook to fetch articles (PUBLIC - no auth needed)
 *
 * @param {object} options - Query options (page, per_page, category, tag, search)
 * @returns {object} Articles data and pagination
 *
 * Usage:
 * ```jsx
 * const { articles, loading, pages, loadMore } = useArticles({ per_page: 10 });
 * ```
 */
export function useArticles(options = {}) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    per_page: options.per_page || 10,
  });

  const fetchArticles = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { ...options, page };
      const data = await wordpress.getArticles(params);

      if (page === 1) {
        setArticles(data.articles);
      } else {
        setArticles(prev => [...prev, ...data.articles]);
      }

      setPagination({
        page: data.page,
        pages: data.pages,
        total: data.total,
        per_page: data.per_page,
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, [options]);

  // Initial fetch
  useEffect(() => {
    fetchArticles(1);
  }, [fetchArticles]);

  const loadMore = useCallback(() => {
    if (pagination.page < pagination.pages && !loading) {
      fetchArticles(pagination.page + 1);
    }
  }, [pagination, loading, fetchArticles]);

  const hasMore = pagination.page < pagination.pages;

  return {
    articles,
    loading,
    error,
    pagination,
    hasMore,
    loadMore,
    refetch: () => fetchArticles(1),
  };
}

/**
 * Hook to fetch a single article (PUBLIC - no auth needed)
 *
 * @param {number|string} articleId - The WordPress post ID
 * @returns {object} Article data
 *
 * Usage:
 * ```jsx
 * const { article, loading, error } = useArticle(123);
 * ```
 */
export function useArticle(articleId) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticle = useCallback(async () => {
    if (!articleId) return;

    try {
      setLoading(true);
      const data = await wordpress.getArticle(articleId);
      setArticle(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching article:', err);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  return {
    article,
    loading,
    error,
    refetch: fetchArticle,
  };
}

/**
 * Hook to fetch homepage layout (PUBLIC - no auth needed)
 *
 * @returns {object} Homepage layout data
 *
 * Usage:
 * ```jsx
 * const { layout, heroArticle, sections, loading } = useHomepage();
 * ```
 */
export function useHomepage() {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHomepage = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wordpress.getHomepage();
      setLayout(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching homepage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomepage();
  }, [fetchHomepage]);

  return {
    layout,
    heroArticle: layout?.hero_article || null,
    sections: layout?.sections || [],
    loading,
    error,
    refetch: fetchHomepage,
  };
}

/**
 * Hook to manage homepage layout (REQUIRES AUTH)
 *
 * @returns {object} Layout state and update function
 *
 * Usage:
 * ```jsx
 * const { layout, updateLayout, saving } = useHomepageEditor();
 * updateLayout({ hero: 123, sections: [...] });
 * ```
 */
export function useHomepageEditor() {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchLayout = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wordpress.getHomepage();
      setLayout(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const updateLayout = useCallback(async (newLayout) => {
    try {
      setSaving(true);
      setError(null);
      await wordpress.updateHomepage(newLayout);
      setLayout(newLayout);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const setHero = useCallback((articleId) => {
    if (!layout) return;
    const newLayout = { ...layout, hero: articleId };
    return updateLayout(newLayout);
  }, [layout, updateLayout]);

  const addSection = useCallback((section) => {
    if (!layout) return;
    const newLayout = {
      ...layout,
      sections: [...(layout.sections || []), section],
    };
    return updateLayout(newLayout);
  }, [layout, updateLayout]);

  const removeSection = useCallback((index) => {
    if (!layout) return;
    const sections = [...(layout.sections || [])];
    sections.splice(index, 1);
    return updateLayout({ ...layout, sections });
  }, [layout, updateLayout]);

  return {
    layout,
    loading,
    saving,
    error,
    updateLayout,
    setHero,
    addSection,
    removeSection,
    refetch: fetchLayout,
  };
}

/**
 * Hook for comparing article versions
 *
 * @param {number|string} articleId - The WordPress post ID
 * @returns {object} Version comparison utilities
 */
export function useVersionComparison(articleId) {
  const { events, loading, replayToVersion } = useArticleEvents(articleId);

  const [leftVersion, setLeftVersion] = useState(null);
  const [rightVersion, setRightVersion] = useState(null);
  const [leftState, setLeftState] = useState(null);
  const [rightState, setRightState] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Compare two versions
  const compareVersions = useCallback(async (left, right) => {
    setComparing(true);

    try {
      const [leftData, rightData] = await Promise.all([
        replayToVersion(left),
        replayToVersion(right),
      ]);

      setLeftVersion(left);
      setRightVersion(right);
      setLeftState(leftData);
      setRightState(rightData);
    } catch (err) {
      console.error('Error comparing versions:', err);
    } finally {
      setComparing(false);
    }
  }, [replayToVersion]);

  // Get diff between states
  const getDiff = useCallback(() => {
    if (!leftState || !rightState) return null;

    const diff = {};
    const allKeys = new Set([
      ...Object.keys(leftState || {}),
      ...Object.keys(rightState || {}),
    ]);

    allKeys.forEach(key => {
      const leftVal = leftState?.[key];
      const rightVal = rightState?.[key];

      if (JSON.stringify(leftVal) !== JSON.stringify(rightVal)) {
        diff[key] = {
          left: leftVal,
          right: rightVal,
          changed: true,
        };
      }
    });

    return diff;
  }, [leftState, rightState]);

  // Get available versions
  const versions = useMemo(() => {
    return events.map((event, index) => ({
      version: index + 1,
      type: event.type,
      actor: event.actor?.name || 'System',
      published: event.published,
    }));
  }, [events]);

  return {
    versions,
    leftVersion,
    rightVersion,
    leftState,
    rightState,
    comparing,
    loading,
    compareVersions,
    getDiff,
  };
}

/**
 * Hook for audit trail / activity log (REQUIRES AUTH)
 *
 * @param {object} options - Filter options
 * @returns {object} Audit trail data
 */
export function useAuditTrail(options = {}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: options.limit || 50,
    offset: 0,
    hasMore: false,
  });

  // Fetch audit trail (requires auth)
  const fetchActivities = useCallback(async (offset = 0) => {
    try {
      setLoading(true);

      const params = {
        limit: pagination.limit,
        offset: offset,
      };

      if (options.event_type) params.event_type = options.event_type;
      if (options.object_type) params.object_type = options.object_type;

      const data = await wordpress.getEvents(params);

      if (offset === 0) {
        setActivities(data.events || []);
      } else {
        setActivities(prev => [...prev, ...(data.events || [])]);
      }

      setPagination({
        total: data.total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.has_more,
      });

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching audit trail:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, options]);

  // Load more activities
  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchActivities(pagination.offset + pagination.limit);
    }
  }, [fetchActivities, pagination, loading]);

  // Initial fetch
  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  // Group by date
  const activitiesByDate = useMemo(() => {
    const grouped = {};

    activities.forEach(activity => {
      const date = new Date(activity.published).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(activity);
    });

    return grouped;
  }, [activities]);

  return {
    activities,
    activitiesByDate,
    loading,
    error,
    pagination,
    loadMore,
    refetch: () => fetchActivities(0),
  };
}

/**
 * Hook to manage article with optimistic updates (REQUIRES AUTH)
 *
 * @param {number|string} articleId - The WordPress post ID
 * @returns {object} Article state management
 */
export function useArticleEditor(articleId) {
  const { article: fetchedArticle, loading: fetchLoading, error: fetchError, refetch } = useArticle(articleId);
  const { events } = useArticleEvents(articleId, { enableRealtime: false });

  const [article, setArticle] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync with fetched article
  useEffect(() => {
    if (fetchedArticle && !isDirty) {
      setArticle(fetchedArticle);
    }
  }, [fetchedArticle, isDirty]);

  // Apply local change (optimistic)
  const updateField = useCallback((field, value) => {
    setArticle(prev => prev ? { ...prev, [field]: value } : { [field]: value });
    setIsDirty(true);
  }, []);

  // Save changes to WordPress
  const save = useCallback(async () => {
    if (!articleId || !article) return false;

    try {
      setSaving(true);
      setError(null);

      await wordpress.updatePost(articleId, {
        title: article.title,
        content: article.content_raw || article.content,
        excerpt: article.excerpt,
        status: article.status,
      });

      setIsDirty(false);
      await refetch();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [articleId, article, refetch]);

  // Discard changes
  const discard = useCallback(() => {
    setArticle(fetchedArticle);
    setIsDirty(false);
    setError(null);
  }, [fetchedArticle]);

  return {
    article,
    events,
    loading: fetchLoading,
    fetchError,
    isDirty,
    saving,
    error,
    updateField,
    save,
    discard,
    refetch,
  };
}

/**
 * Hook for collections (PUBLIC for reading, AUTH for writing)
 */
export function useCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wordpress.getCollections();
      setCollections(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const createCollection = useCallback(async (data) => {
    try {
      const result = await wordpress.createCollection(data);
      setCollections(prev => [...prev, result.collection]);
      return result.collection;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateCollection = useCallback(async (id, data) => {
    try {
      const result = await wordpress.updateCollection(id, data);
      setCollections(prev =>
        prev.map(c => c.id === id ? result.collection : c)
      );
      return result.collection;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    collections,
    loading,
    error,
    createCollection,
    updateCollection,
    refetch: fetchCollections,
  };
}

export default {
  useArticleEvents,
  useArticles,
  useArticle,
  useHomepage,
  useHomepageEditor,
  useVersionComparison,
  useAuditTrail,
  useArticleEditor,
  useCollections,
};
