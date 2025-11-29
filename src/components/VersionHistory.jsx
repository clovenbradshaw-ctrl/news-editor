/**
 * Version History Component
 *
 * Displays ActivityStreams event history for articles with the ability
 * to view, compare, and restore previous versions.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  useArticleEvents,
  useVersionComparison,
} from '../hooks/useActivityEvents';
import {
  History,
  Clock,
  User,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  GitCompare,
  RotateCcw,
  Eye,
  X,
  Check,
  AlertCircle,
  FileText,
  Edit3,
  Trash2,
  Send,
  Globe,
  Lock,
} from 'lucide-react';

// Event type icons and colors
const EVENT_CONFIG = {
  Create: {
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Created',
  },
  Update: {
    icon: Edit3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Updated',
  },
  Delete: {
    icon: Trash2,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Deleted',
  },
  Publish: {
    icon: Globe,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Published',
  },
  Retract: {
    icon: Lock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Unpublished',
  },
  Submit: {
    icon: Send,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'Submitted',
  },
  Hide: {
    icon: Lock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Made Private',
  },
};

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Single event item in the timeline
 */
function EventItem({ event, version, isExpanded, onToggle, onPreview, onRestore, isLatest }) {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.Update;
  const Icon = config.icon;

  return (
    <div className={`relative pl-8 pb-6 ${!isLatest ? 'border-l-2 border-gray-200 ml-3' : ''}`}>
      {/* Timeline dot */}
      <div className={`absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-3 h-3 ${config.color}`} />
      </div>

      {/* Event content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
          onClick={onToggle}
        >
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500">
              v{version}
            </span>
            {isLatest && (
              <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded">
                Current
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <span className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              {event.actor?.name || 'System'}
            </span>
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {formatRelativeTime(event.published)}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-gray-100 p-4">
            {/* Summary if available */}
            {event.summary && (
              <p className="text-sm text-gray-600 mb-3">{event.summary}</p>
            )}

            {/* Object details */}
            <div className="space-y-2 text-sm">
              {event.object?.name && (
                <div>
                  <span className="text-gray-500">Title:</span>{' '}
                  <span className="font-medium">{event.object.name}</span>
                </div>
              )}
              {event.object?.status && (
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className="capitalize">{event.object.status}</span>
                </div>
              )}
              {event.object?.wordCount && (
                <div>
                  <span className="text-gray-500">Word count:</span>{' '}
                  <span>{event.object.wordCount.toLocaleString()}</span>
                </div>
              )}
              {event.object?.previousStatus && (
                <div className="text-orange-600">
                  <span>Status changed from </span>
                  <span className="font-medium">{event.object.previousStatus}</span>
                  <span> to </span>
                  <span className="font-medium">{event.object.status}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => onPreview(version)}
                className="flex items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </button>
              {!isLatest && (
                <button
                  onClick={() => onRestore(version)}
                  className="flex items-center px-3 py-1.5 text-sm text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </button>
              )}
            </div>

            {/* Sequence info */}
            <div className="mt-3 pt-2 text-xs text-gray-400">
              Sequence: {event.sequence} | Event ID: {event.id?.split('/').pop()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Version comparison panel
 */
function ComparisonPanel({ articleId, onClose }) {
  const {
    versions,
    leftVersion,
    rightVersion,
    leftState,
    rightState,
    comparing,
    loading,
    compareVersions,
    getDiff,
  } = useVersionComparison(articleId);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);

  const diff = getDiff();

  const handleCompare = () => {
    if (selectedLeft && selectedRight) {
      compareVersions(selectedLeft, selectedRight);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Compare Versions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version selectors */}
        <div className="flex space-x-4 p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Version
            </label>
            <select
              value={selectedLeft || ''}
              onChange={(e) => setSelectedLeft(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={loading}
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} - {v.type} by {v.actor}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Version
            </label>
            <select
              value={selectedRight || ''}
              onChange={(e) => setSelectedRight(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={loading}
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} - {v.type} by {v.actor}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCompare}
              disabled={!selectedLeft || !selectedRight || comparing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {comparing ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </div>

        {/* Diff view */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          {!diff && !comparing && (
            <div className="text-center text-gray-500 py-12">
              Select two versions to compare
            </div>
          )}

          {comparing && (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">Loading comparison...</p>
            </div>
          )}

          {diff && Object.keys(diff).length === 0 && (
            <div className="text-center py-12">
              <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-gray-600">No differences found</p>
            </div>
          )}

          {diff && Object.keys(diff).length > 0 && (
            <div className="space-y-4">
              {Object.entries(diff).map(([key, value]) => (
                <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-100 font-medium text-sm">
                    {key}
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-4">
                      <div className="text-xs text-gray-500 mb-1">v{leftVersion}</div>
                      <div className="text-sm bg-red-50 p-2 rounded text-red-800 break-words">
                        {typeof value.left === 'object'
                          ? JSON.stringify(value.left, null, 2)
                          : String(value.left || '(empty)')}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-xs text-gray-500 mb-1">v{rightVersion}</div>
                      <div className="text-sm bg-green-50 p-2 rounded text-green-800 break-words">
                        {typeof value.right === 'object'
                          ? JSON.stringify(value.right, null, 2)
                          : String(value.right || '(empty)')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Preview modal for viewing a specific version
 */
function PreviewModal({ article, version, onClose, onRestore }) {
  if (!article) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold">Version {version} Preview</h2>
            <p className="text-sm text-gray-500">
              {new Date(article.published).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[70vh]">
          <h1 className="text-2xl font-bold mb-4">{article.name}</h1>

          {article.summary && (
            <p className="text-gray-600 italic mb-4">{article.summary}</p>
          )}

          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Metadata */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Status: {article.status}</p>
            {article.wordCount && <p>Words: {article.wordCount}</p>}
            {article.readingTime && <p>Reading time: {article.readingTime} min</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => onRestore(version)}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <RotateCcw className="w-4 h-4 inline mr-1" />
            Restore This Version
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Version History Component
 */
export function VersionHistory({
  articleId,
  onRestore,
  className = '',
}) {
  const {
    events,
    loading,
    error,
    currentVersion,
    contributors,
    refetch,
    replayToVersion,
  } = useArticleEvents(articleId);

  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [previewVersion, setPreviewVersion] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [filter, setFilter] = useState('all');

  // Toggle event expansion
  const toggleEvent = useCallback((index) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Handle preview
  const handlePreview = useCallback(async (version) => {
    try {
      const article = await replayToVersion(version);
      setPreviewArticle(article);
      setPreviewVersion(version);
    } catch (err) {
      console.error('Failed to load preview:', err);
    }
  }, [replayToVersion]);

  // Handle restore
  const handleRestore = useCallback((version) => {
    if (onRestore) {
      onRestore(version);
    }
    setPreviewArticle(null);
    setPreviewVersion(null);
  }, [onRestore]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter(e => e.type === filter);
  }, [events, filter]);

  // Event type counts
  const eventCounts = useMemo(() => {
    const counts = {};
    events.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
  }, [events]);

  if (loading && events.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load history: {error}</span>
        </div>
        <button
          onClick={refetch}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Version History</h2>
            <span className="text-sm text-gray-500">
              ({events.length} events)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              <GitCompare className="w-4 h-4 mr-1" />
              Compare
            </button>
            <button
              onClick={refetch}
              className="p-1.5 text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contributors */}
        {contributors.length > 0 && (
          <div className="flex items-center mt-3 text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            <span>Contributors: </span>
            <span className="ml-1">
              {contributors.map(c => c.name).join(', ')}
            </span>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center space-x-2 mt-4">
          <span className="text-sm text-gray-500">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({events.length})
          </button>
          {Object.entries(eventCounts).map(([type, count]) => {
            const config = EVENT_CONFIG[type] || EVENT_CONFIG.Update;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-2 py-1 text-xs rounded ${
                  filter === type
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No events match the current filter
          </div>
        ) : (
          <div className="space-y-0">
            {filteredEvents.map((event, index) => {
              const version = events.indexOf(event) + 1;
              const isLatest = version === events.length;

              return (
                <EventItem
                  key={event.id || index}
                  event={event}
                  version={version}
                  isExpanded={expandedEvents.has(index)}
                  onToggle={() => toggleEvent(index)}
                  onPreview={handlePreview}
                  onRestore={handleRestore}
                  isLatest={isLatest}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewArticle && (
        <PreviewModal
          article={previewArticle}
          version={previewVersion}
          onClose={() => {
            setPreviewArticle(null);
            setPreviewVersion(null);
          }}
          onRestore={handleRestore}
        />
      )}

      {/* Comparison Panel */}
      {showComparison && (
        <ComparisonPanel
          articleId={articleId}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

/**
 * Compact version indicator for embedding in editor
 */
export function VersionIndicator({ articleId, onClick }) {
  const { currentVersion, latestEvent, loading } = useArticleEvents(articleId);

  if (loading) {
    return (
      <div className="flex items-center text-sm text-gray-400">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
    >
      <History className="w-3 h-3 mr-1" />
      <span>v{currentVersion}</span>
      {latestEvent && (
        <span className="ml-2 text-gray-400">
          {formatRelativeTime(latestEvent.published)}
        </span>
      )}
    </button>
  );
}

export default VersionHistory;
