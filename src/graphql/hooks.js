/**
 * React Hooks for GraphQL Operations
 *
 * These hooks provide a convenient interface for querying ActivityStreams
 * events and article data via WPGraphQL.
 */

import { useQuery, useLazyQuery, useSubscription, useMutation, gql } from '@apollo/client';
import { useMemo, useCallback, useEffect, useState } from 'react';
import {
  GET_ARTICLE_EVENTS,
  GET_ARTICLE_WITH_EVENTS,
  GET_RECENT_EVENTS,
  GET_ARTICLES_WITH_EVENTS,
  SEARCH_ARTICLES_WITH_EVENTS,
  EVENTS_SUBSCRIPTION,
} from './eventQueries';

/**
 * Hook for fetching article events via GraphQL
 *
 * @param {number|string} articleId - WordPress post database ID
 * @param {object} options - Apollo query options
 */
export function useArticleEventsGraphQL(articleId, options = {}) {
  const { data, loading, error, refetch } = useQuery(GET_ARTICLE_EVENTS, {
    variables: { id: articleId },
    skip: !articleId,
    ...options,
  });

  const events = useMemo(
    () => data?.post?.activityEvents || [],
    [data]
  );

  const latestEvent = useMemo(
    () => data?.post?.latestEvent || null,
    [data]
  );

  const eventCount = useMemo(
    () => data?.post?.eventCount || 0,
    [data]
  );

  const article = useMemo(() => {
    if (!data?.post) return null;
    return {
      id: data.post.databaseId,
      title: data.post.title,
      content: data.post.content,
      status: data.post.status,
      date: data.post.date,
      modified: data.post.modified,
    };
  }, [data]);

  return {
    article,
    events,
    latestEvent,
    eventCount,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching full article with events and metadata
 *
 * @param {number|string} articleId - WordPress post database ID
 * @param {object} options - Apollo query options
 */
export function useArticleWithEvents(articleId, options = {}) {
  const { data, loading, error, refetch } = useQuery(GET_ARTICLE_WITH_EVENTS, {
    variables: { id: articleId },
    skip: !articleId,
    ...options,
  });

  const article = useMemo(() => {
    if (!data?.post) return null;

    const post = data.post;
    return {
      id: post.databaseId,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      date: post.date,
      modified: post.modified,
      slug: post.slug,
      uri: post.uri,
      featuredImage: post.featuredImage?.node || null,
      author: post.author?.node || null,
      categories: post.categories?.nodes || [],
      tags: post.tags?.nodes || [],
      eventCount: post.eventCount,
      events: post.activityEvents || [],
      latestEvent: post.latestEvent,
    };
  }, [data]);

  return {
    article,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for global event audit trail
 *
 * @param {object} options - Query filter options
 */
export function useAuditTrailGraphQL(options = {}) {
  const {
    limit = 50,
    eventType = null,
    sinceSequence = 0,
  } = options;

  const [offset, setOffset] = useState(0);

  const { data, loading, error, fetchMore, refetch } = useQuery(GET_RECENT_EVENTS, {
    variables: {
      limit,
      offset: 0,
      sinceSequence,
      eventType,
    },
  });

  const events = useMemo(
    () => data?.activityEvents || [],
    [data]
  );

  const loadMore = useCallback(() => {
    const newOffset = offset + limit;
    setOffset(newOffset);

    return fetchMore({
      variables: {
        offset: newOffset,
      },
    });
  }, [offset, limit, fetchMore]);

  return {
    events,
    loading,
    error,
    loadMore,
    refetch,
  };
}

/**
 * Hook for batch fetching events for multiple articles
 *
 * @param {Array<number|string>} articleIds - Array of WordPress post IDs
 */
export function useMultipleArticleEvents(articleIds = []) {
  const { data, loading, error } = useQuery(GET_ARTICLES_WITH_EVENTS, {
    variables: { ids: articleIds },
    skip: articleIds.length === 0,
  });

  const articles = useMemo(
    () => data?.posts?.nodes || [],
    [data]
  );

  const eventsMap = useMemo(() => {
    const map = new Map();
    articles.forEach((article) => {
      map.set(article.databaseId, {
        eventCount: article.eventCount,
        latestEvent: article.latestEvent,
      });
    });
    return map;
  }, [articles]);

  return {
    articles,
    eventsMap,
    loading,
    error,
  };
}

/**
 * Hook for searching articles with event info
 *
 * @param {object} options - Search options
 */
export function useSearchArticlesWithEvents(options = {}) {
  const [searchArticles, { data, loading, error, fetchMore }] = useLazyQuery(
    SEARCH_ARTICLES_WITH_EVENTS
  );

  const search = useCallback(
    (searchTerm, status = null) => {
      return searchArticles({
        variables: {
          search: searchTerm,
          status: status ? [status] : null,
          first: options.limit || 10,
        },
      });
    },
    [searchArticles, options.limit]
  );

  const articles = useMemo(
    () => data?.posts?.nodes || [],
    [data]
  );

  const pageInfo = useMemo(
    () => data?.posts?.pageInfo || { hasNextPage: false, endCursor: null },
    [data]
  );

  const loadMore = useCallback(() => {
    if (!pageInfo.hasNextPage) return Promise.resolve();

    return fetchMore({
      variables: {
        after: pageInfo.endCursor,
      },
    });
  }, [fetchMore, pageInfo]);

  return {
    search,
    articles,
    pageInfo,
    loading,
    error,
    loadMore,
  };
}

/**
 * Hook for real-time event updates via subscription
 *
 * @param {function} onNewEvent - Callback when new event arrives
 */
export function useEventSubscription(onNewEvent) {
  const { data, loading, error } = useSubscription(EVENTS_SUBSCRIPTION, {
    onData: ({ data: subscriptionData }) => {
      if (subscriptionData?.activityEventCreated && onNewEvent) {
        onNewEvent(subscriptionData.activityEventCreated);
      }
    },
  });

  return {
    latestEvent: data?.activityEventCreated,
    loading,
    error,
  };
}

/**
 * Hook for polling-based real-time updates (fallback)
 *
 * @param {object} options - Polling options
 */
export function useEventPolling(options = {}) {
  const {
    interval = 30000,
    enabled = true,
    onNewEvents,
  } = options;

  const [lastSequence, setLastSequence] = useState(0);

  const { data, loading, error, startPolling, stopPolling } = useQuery(
    GET_RECENT_EVENTS,
    {
      variables: {
        limit: 20,
        sinceSequence: lastSequence,
      },
      pollInterval: enabled ? interval : 0,
    }
  );

  // Update sequence and notify on new events
  useEffect(() => {
    const events = data?.activityEvents || [];
    if (events.length > 0) {
      const maxSequence = Math.max(...events.map((e) => e.sequence || 0));
      if (maxSequence > lastSequence) {
        setLastSequence(maxSequence);
        if (onNewEvents) {
          onNewEvents(events);
        }
      }
    }
  }, [data, lastSequence, onNewEvents]);

  return {
    loading,
    error,
    startPolling: () => startPolling(interval),
    stopPolling,
  };
}

/**
 * Mutation: Update article (triggers event logging on WordPress side)
 */
const UPDATE_POST = gql`
  mutation UpdatePost($id: ID!, $title: String, $content: String, $status: PostStatusEnum) {
    updatePost(input: { id: $id, title: $title, content: $content, status: $status }) {
      post {
        id
        databaseId
        title
        content
        status
        modified
        eventCount
        latestEvent {
          id
          type
          published
        }
      }
    }
  }
`;

/**
 * Hook for updating articles
 */
export function useUpdateArticle() {
  const [updatePost, { data, loading, error }] = useMutation(UPDATE_POST, {
    // Refetch events after update
    refetchQueries: ['GetArticleEvents', 'GetArticleWithEvents'],
  });

  const updateArticle = useCallback(
    async (articleId, updates) => {
      return updatePost({
        variables: {
          id: articleId,
          ...updates,
        },
      });
    },
    [updatePost]
  );

  return {
    updateArticle,
    updatedPost: data?.updatePost?.post,
    loading,
    error,
  };
}

/**
 * Mutation: Create new article
 */
const CREATE_POST = gql`
  mutation CreatePost(
    $title: String!
    $content: String
    $status: PostStatusEnum = DRAFT
  ) {
    createPost(input: { title: $title, content: $content, status: $status }) {
      post {
        id
        databaseId
        title
        content
        status
        date
        eventCount
        latestEvent {
          id
          type
          published
        }
      }
    }
  }
`;

/**
 * Hook for creating articles
 */
export function useCreateArticle() {
  const [createPost, { data, loading, error }] = useMutation(CREATE_POST, {
    refetchQueries: ['GetRecentEvents'],
  });

  const createArticle = useCallback(
    async (title, content = '', status = 'DRAFT') => {
      return createPost({
        variables: {
          title,
          content,
          status,
        },
      });
    },
    [createPost]
  );

  return {
    createArticle,
    createdPost: data?.createPost?.post,
    loading,
    error,
  };
}

export default {
  useArticleEventsGraphQL,
  useArticleWithEvents,
  useAuditTrailGraphQL,
  useMultipleArticleEvents,
  useSearchArticlesWithEvents,
  useEventSubscription,
  useEventPolling,
  useUpdateArticle,
  useCreateArticle,
};
