/**
 * React Hooks for ActivityStreams Event Sourcing
 *
 * These hooks provide integration with the WordPress ActivityStreams
 * event store, enabling version history, event replay, and real-time sync.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Configuration - can be overridden via environment or props
const DEFAULT_CONFIG = {
  apiBaseUrl: '/api/events',
  wpApiBaseUrl: '/wp-json/contributor/v1',
  pollInterval: 30000, // 30 seconds
  enableRealtime: true,
};

/**
 * Hook to fetch and manage article events/version history
 *
 * @param {number|string} articleId - The WordPress post ID
 * @param {object} options - Configuration options
 * @returns {object} Events data and helper functions
 */
export function useArticleEvents(articleId, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const pollRef = useRef(null);

  // Fetch events for article
  const fetchEvents = useCallback(async () => {
    if (!articleId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${config.apiBaseUrl}/post/${articleId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
      setCurrentVersion(data.events?.length || 0);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching article events:', err);
    } finally {
      setLoading(false);
    }
  }, [articleId, config.apiBaseUrl]);

  // Replay events to rebuild state at a specific version
  const replayToVersion = useCallback(async (version) => {
    if (!articleId) return null;

    try {
      const response = await fetch(
        `${config.apiBaseUrl}/replay/${articleId}?until_version=${version}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to replay events');
      }

      const data = await response.json();
      return data.current_state;
    } catch (err) {
      console.error('Error replaying events:', err);
      throw err;
    }
  }, [articleId, config.apiBaseUrl]);

  // Get state at specific sequence number
  const getStateAtSequence = useCallback(async (sequence) => {
    if (!articleId) return null;

    try {
      const response = await fetch(
        `${config.apiBaseUrl}/replay/${articleId}?until_sequence=${sequence}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get state at sequence');
      }

      const data = await response.json();
      return data.current_state;
    } catch (err) {
      console.error('Error getting state at sequence:', err);
      throw err;
    }
  }, [articleId, config.apiBaseUrl]);

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
    currentVersion,
    latestEvent,
    eventsByType,
    contributors,
    refetch: fetchEvents,
    replayToVersion,
    getStateAtSequence,
  };
}

/**
 * Hook for real-time event streaming
 *
 * @param {object} options - Configuration options
 * @returns {object} Stream state and controls
 */
export function useEventStream(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const [events, setEvents] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastSequence, setLastSequence] = useState(0);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Start streaming events
  const startStreaming = useCallback(async () => {
    if (isStreaming) return;

    setIsStreaming(true);
    setError(null);

    const poll = async () => {
      if (!isStreaming) return;

      try {
        const response = await fetch(
          `${config.apiBaseUrl}/stream?since_sequence=${lastSequence}`,
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal: abortRef.current?.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Stream fetch failed');
        }

        const data = await response.json();

        if (data.events?.length > 0) {
          setEvents(prev => [...prev, ...data.events]);
          setLastSequence(data.latest_sequence);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
          console.error('Event stream error:', err);
        }
      }
    };

    // Initial poll
    await poll();

    // Continue polling
    const interval = setInterval(poll, config.pollInterval);
    abortRef.current = { interval };

    return () => {
      clearInterval(interval);
      setIsStreaming(false);
    };
  }, [isStreaming, lastSequence, config.apiBaseUrl, config.pollInterval]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortRef.current?.interval) {
      clearInterval(abortRef.current.interval);
    }
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  // Clear events buffer
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isStreaming,
    lastSequence,
    error,
    startStreaming,
    stopStreaming,
    clearEvents,
  };
}

/**
 * Hook to manage article state with event sourcing
 *
 * @param {number|string} articleId - The WordPress post ID
 * @param {object} options - Configuration options
 * @returns {object} Article state management
 */
export function useEventSourcedArticle(articleId, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const [article, setArticle] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);
  const { events, loading, error, refetch } = useArticleEvents(articleId, options);

  // Build current state from events
  useEffect(() => {
    if (events.length === 0) return;

    let state = null;

    events.forEach(event => {
      switch (event.type) {
        case 'Create':
          state = { ...event.object };
          break;
        case 'Update':
          if (state) {
            state = { ...state, ...event.object };
          }
          break;
        case 'Delete':
          state = null;
          break;
        default:
          // Handle custom event types
          if (state && event.object) {
            state = { ...state, ...event.object };
          }
      }
    });

    setArticle(state);
  }, [events]);

  // Apply a local change (optimistic update)
  const applyChange = useCallback((changes) => {
    setArticle(prev => prev ? { ...prev, ...changes } : changes);
    setPendingChanges(prev => [...prev, {
      type: 'Update',
      changes,
      timestamp: new Date().toISOString(),
    }]);
    setIsDirty(true);
  }, []);

  // Save changes to WordPress
  const saveChanges = useCallback(async () => {
    if (!articleId || pendingChanges.length === 0) return;

    try {
      // Merge all pending changes
      const mergedChanges = pendingChanges.reduce((acc, change) => ({
        ...acc,
        ...change.changes,
      }), {});

      // POST to WordPress
      const response = await fetch(
        `${config.wpApiBaseUrl.replace('/contributor/v1', '')}/wp/v2/posts/${articleId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: mergedChanges.name,
            content: mergedChanges.content,
            excerpt: mergedChanges.summary,
            status: mergedChanges.status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      // Clear pending changes
      setPendingChanges([]);
      setIsDirty(false);

      // Refetch events to get the new event from WordPress
      await refetch();

      return true;
    } catch (err) {
      console.error('Error saving changes:', err);
      throw err;
    }
  }, [articleId, pendingChanges, config.wpApiBaseUrl, refetch]);

  // Discard local changes
  const discardChanges = useCallback(() => {
    setPendingChanges([]);
    setIsDirty(false);
    refetch();
  }, [refetch]);

  return {
    article,
    events,
    loading,
    error,
    isDirty,
    pendingChanges,
    applyChange,
    saveChanges,
    discardChanges,
    refetch,
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
      sequence: event.sequence,
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
 * Hook for audit trail / activity log
 *
 * @param {object} options - Filter options
 * @returns {object} Audit trail data
 */
export function useAuditTrail(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: options.limit || 50,
    offset: 0,
    hasMore: false,
  });

  // Fetch audit trail
  const fetchActivities = useCallback(async (offset = 0) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      });

      if (options.eventType) {
        params.set('event_type', options.eventType);
      }

      if (options.objectType) {
        params.set('object_type', options.objectType);
      }

      if (options.sinceSequence) {
        params.set('since_sequence', options.sinceSequence.toString());
      }

      const response = await fetch(
        `${config.apiBaseUrl}?${params}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }

      const data = await response.json();

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
  }, [config.apiBaseUrl, pagination.limit, options]);

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

export default {
  useArticleEvents,
  useEventStream,
  useEventSourcedArticle,
  useVersionComparison,
  useAuditTrail,
};
