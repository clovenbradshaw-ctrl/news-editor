/**
 * Apollo Client Configuration for WPGraphQL
 *
 * This client connects to the WordPress GraphQL endpoint and provides
 * caching, authentication, and error handling for the news editor.
 */

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';

// Configuration
const CONFIG = {
  // WordPress GraphQL endpoint (via Cloudflare Worker proxy)
  graphqlEndpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT || '/wp-json/graphql',

  // Direct WordPress endpoint (fallback)
  wordpressUrl: import.meta.env.VITE_WORDPRESS_URL || '',

  // Enable debug logging
  debug: import.meta.env.DEV,
};

/**
 * HTTP Link for GraphQL requests
 */
const httpLink = createHttpLink({
  uri: CONFIG.graphqlEndpoint,
  credentials: 'include',
});

/**
 * Authentication Link
 * Adds JWT token or application password to requests
 */
const authLink = setContext((_, { headers }) => {
  // Get auth token from localStorage or session
  const token = localStorage.getItem('wpToken') || sessionStorage.getItem('wpToken');

  // Get application password credentials
  const username = localStorage.getItem('wpUsername');
  const appPassword = localStorage.getItem('wpAppPassword');

  const newHeaders = { ...headers };

  if (token) {
    // JWT authentication
    newHeaders.Authorization = `Bearer ${token}`;
  } else if (username && appPassword) {
    // Basic authentication with application password
    const credentials = btoa(`${username}:${appPassword}`);
    newHeaders.Authorization = `Basic ${credentials}`;
  }

  return {
    headers: newHeaders,
  };
});

/**
 * Error Handling Link
 */
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear invalid tokens
        localStorage.removeItem('wpToken');
        sessionStorage.removeItem('wpToken');

        // Dispatch authentication required event
        window.dispatchEvent(new CustomEvent('auth:required'));
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    // Dispatch network error event
    window.dispatchEvent(
      new CustomEvent('network:error', {
        detail: { error: networkError, operation: operation.operationName },
      })
    );
  }
});

/**
 * Logging Link (development only)
 */
const loggingLink = new ApolloLink((operation, forward) => {
  if (CONFIG.debug) {
    console.log(`[GraphQL] Starting ${operation.operationName}`);
    const startTime = Date.now();

    return forward(operation).map((result) => {
      const duration = Date.now() - startTime;
      console.log(`[GraphQL] Completed ${operation.operationName} in ${duration}ms`);
      return result;
    });
  }

  return forward(operation);
});

/**
 * Cache Configuration
 */
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Pagination for posts
        posts: {
          keyArgs: ['where'],
          merge(existing, incoming, { args }) {
            if (!args?.after) {
              return incoming;
            }
            return {
              ...incoming,
              nodes: [...(existing?.nodes || []), ...incoming.nodes],
            };
          },
        },
        // Cache events by sequence
        activityEvents: {
          keyArgs: ['eventType', 'objectType'],
          merge(existing = [], incoming) {
            const existingIds = new Set(existing.map((e) => e.id));
            const newEvents = incoming.filter((e) => !existingIds.has(e.id));
            return [...existing, ...newEvents];
          },
        },
      },
    },
    Post: {
      keyFields: ['databaseId'],
      fields: {
        // Cache activity events per post
        activityEvents: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
    ActivityStreamEvent: {
      keyFields: ['id'],
    },
  },
});

/**
 * Create Apollo Client
 */
export const apolloClient = new ApolloClient({
  link: from([loggingLink, errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

/**
 * Helper: Set authentication credentials
 */
export function setAuthCredentials({ token, username, appPassword }) {
  if (token) {
    localStorage.setItem('wpToken', token);
  }
  if (username) {
    localStorage.setItem('wpUsername', username);
  }
  if (appPassword) {
    localStorage.setItem('wpAppPassword', appPassword);
  }

  // Clear cache to refetch with new credentials
  apolloClient.resetStore();
}

/**
 * Helper: Clear authentication
 */
export function clearAuth() {
  localStorage.removeItem('wpToken');
  localStorage.removeItem('wpUsername');
  localStorage.removeItem('wpAppPassword');
  sessionStorage.removeItem('wpToken');

  apolloClient.clearStore();
}

/**
 * Helper: Check if authenticated
 */
export function isAuthenticated() {
  return !!(
    localStorage.getItem('wpToken') ||
    sessionStorage.getItem('wpToken') ||
    (localStorage.getItem('wpUsername') && localStorage.getItem('wpAppPassword'))
  );
}

export default apolloClient;
