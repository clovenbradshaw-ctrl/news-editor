/**
 * GraphQL Queries and Mutations for ActivityStreams Events
 *
 * These queries work with WPGraphQL + Contributor ActivityStreams plugin
 */

import { gql } from '@apollo/client';

/**
 * Fragment for ActivityStream Actor
 */
export const ACTOR_FRAGMENT = gql`
  fragment ActorFields on ActivityStreamActor {
    type
    id
    name
    email
    url
  }
`;

/**
 * Fragment for ActivityStream Event
 */
export const EVENT_FRAGMENT = gql`
  fragment EventFields on ActivityStreamEvent {
    id
    type
    actor {
      ...ActorFields
    }
    published
    sequence
    summary
    version
  }
  ${ACTOR_FRAGMENT}
`;

/**
 * Get all events for a specific article
 */
export const GET_ARTICLE_EVENTS = gql`
  query GetArticleEvents($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      id
      databaseId
      title
      content
      status
      date
      modified
      eventCount
      latestEvent {
        ...EventFields
      }
      activityEvents {
        ...EventFields
      }
    }
  }
  ${EVENT_FRAGMENT}
`;

/**
 * Get article with events and full metadata
 */
export const GET_ARTICLE_WITH_EVENTS = gql`
  query GetArticleWithEvents($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      id
      databaseId
      title
      content(format: RAW)
      excerpt
      status
      date
      modified
      slug
      uri
      featuredImage {
        node {
          sourceUrl
          altText
          mediaDetails {
            width
            height
          }
        }
      }
      author {
        node {
          id
          name
          email
        }
      }
      categories {
        nodes {
          id
          name
          slug
        }
      }
      tags {
        nodes {
          id
          name
          slug
        }
      }
      eventCount
      latestEvent {
        ...EventFields
      }
      activityEvents {
        ...EventFields
      }
    }
  }
  ${EVENT_FRAGMENT}
`;

/**
 * Get recent global events (audit trail)
 */
export const GET_RECENT_EVENTS = gql`
  query GetRecentEvents(
    $limit: Int = 50
    $offset: Int = 0
    $sinceSequence: Int = 0
    $eventType: String
  ) {
    activityEvents(
      limit: $limit
      offset: $offset
      sinceSequence: $sinceSequence
      eventType: $eventType
    ) {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;

/**
 * Get events for multiple articles
 */
export const GET_ARTICLES_WITH_EVENTS = gql`
  query GetArticlesWithEvents($ids: [ID!]!) {
    posts(where: { in: $ids }) {
      nodes {
        id
        databaseId
        title
        status
        modified
        eventCount
        latestEvent {
          ...EventFields
        }
      }
    }
  }
  ${EVENT_FRAGMENT}
`;

/**
 * Search articles with event history
 */
export const SEARCH_ARTICLES_WITH_EVENTS = gql`
  query SearchArticlesWithEvents(
    $search: String
    $status: [PostStatusEnum]
    $first: Int = 10
    $after: String
  ) {
    posts(
      where: { search: $search, stati: $status }
      first: $first
      after: $after
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        databaseId
        title
        excerpt
        status
        date
        modified
        eventCount
        latestEvent {
          type
          actor {
            name
          }
          published
        }
      }
    }
  }
`;

/**
 * Get event statistics
 */
export const GET_EVENT_STATS = gql`
  query GetEventStats {
    posts(first: 100) {
      nodes {
        id
        title
        eventCount
        latestEvent {
          type
          published
        }
      }
    }
  }
`;

/**
 * Subscription for real-time events (if using WPGraphQL Subscriptions)
 */
export const EVENTS_SUBSCRIPTION = gql`
  subscription OnNewEvent {
    activityEventCreated {
      ...EventFields
    }
  }
  ${EVENT_FRAGMENT}
`;
