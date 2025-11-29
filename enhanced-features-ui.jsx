/**
 * Enhanced News Editor UI Components
 *
 * React components integrating enterprise news patterns:
 * - Real-time analytics sidebar (Guardian Ophan pattern)
 * - Breaking news alerts (Guardian Fronts pattern)
 * - Live blogging interface (AP/Reuters pattern)
 * - Enhanced A/B testing (NYT 8-variant pattern)
 * - Multi-platform publishing (Arc XP COPE pattern)
 * - Slack integration (SF Chronicle/Quartz pattern)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart2, TrendingUp, Clock, Users, Eye, MousePointer,
  AlertTriangle, Bell, Radio, Send, Zap, Share2,
  Slack, Globe, Rss, Smartphone, FileText, Code2,
  Play, Square, Plus, Pin, Trash2, Edit3, RefreshCw,
  Keyboard, CheckCircle, XCircle, ExternalLink, Copy,
  BookOpen, Target, Award, Timer, ArrowUp, ArrowDown
} from 'lucide-react';

import {
  ArticleAnalytics,
  BreakingNewsAlertManager,
  SlackNewsroomIntegration,
  HeadlineABTesting,
  LiveBlogManager,
  MultiPlatformExporter,
  KEYBOARD_SHORTCUTS,
  createShortcutHandler
} from './publishing-enhancements.js';


// ============================================
// ANALYTICS SIDEBAR
// Pattern: Guardian's Ophan - real-time analytics inline with editing
// ============================================

export function AnalyticsSidebar({ article, isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const analytics = useRef(new ArticleAnalytics());

  useEffect(() => {
    if (article?.body) {
      const readingStats = analytics.current.calculateReadingStats(article.body);
      const engagementPredictions = analytics.current.predictEngagement(article);
      setStats(readingStats);
      setPredictions(engagementPredictions);
    }
  }, [article?.body, article?.title]);

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <BarChart2 size={18} />
          Article Analytics
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      {/* Reading Statistics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Reading Stats</h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <FileText size={16} />
              <span className="text-xs font-medium">Words</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats?.wordCount || 0}</p>
          </div>

          <div className="bg-green-50 rounded p-3">
            <div className="flex items-center gap-2 text-green-700">
              <Timer size={16} />
              <span className="text-xs font-medium">Read Time</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{stats?.readingTime?.display || '0 min'}</p>
          </div>

          <div className="bg-purple-50 rounded p-3">
            <div className="flex items-center gap-2 text-purple-700">
              <BookOpen size={16} />
              <span className="text-xs font-medium">Flesch Score</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{stats?.readability?.fleschScore || 0}</p>
          </div>

          <div className="bg-orange-50 rounded p-3">
            <div className="flex items-center gap-2 text-orange-700">
              <Target size={16} />
              <span className="text-xs font-medium">Grade Level</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{stats?.readability?.gradeLevel || 0}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded p-3">
          <p className="text-sm text-gray-700">
            <strong>Reading Level:</strong> {stats?.readability?.readingLevel || 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats?.sentenceCount || 0} sentences, {stats?.paragraphCount || 0} paragraphs
          </p>
        </div>
      </div>

      {/* Engagement Predictions */}
      {predictions && (
        <div className="space-y-3 border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <TrendingUp size={16} />
            Engagement Predictions
          </h4>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Shareability</span>
                <span className="font-medium">{predictions.shareability}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(predictions.shareability, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Completion Likelihood</span>
                <span className="font-medium">{predictions.completionLikelihood}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(predictions.completionLikelihood, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {predictions.factors.length > 0 && (
            <div className="bg-green-50 rounded p-3">
              <h5 className="text-xs font-medium text-green-800 mb-2">Positive Factors</h5>
              <ul className="space-y-1">
                {predictions.factors.map((f, i) => (
                  <li key={i} className="text-xs text-green-700 flex items-center gap-1">
                    <CheckCircle size={12} />
                    {f.factor} <span className="text-green-600">{f.impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ============================================
// BREAKING NEWS ALERT PANEL
// Pattern: Guardian's Fronts "Send Alert" with duplicate prevention
// ============================================

export function BreakingNewsPanel({ article, isOpen, onClose, config = {} }) {
  const [alertManager] = useState(() => new BreakingNewsAlertManager());
  const [alertHeadline, setAlertHeadline] = useState('');
  const [alertSummary, setAlertSummary] = useState('');
  const [urgency, setUrgency] = useState('breaking');
  const [channels, setChannels] = useState(['slack']);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (article) {
      setAlertHeadline(article.title);
      setAlertSummary(article.metadata?.seo?.metaDescription || article.subtitle || '');
    }
  }, [article]);

  const handleSendAlert = async () => {
    setSending(true);
    setResult(null);

    const res = await alertManager.sendAlert(article, {
      alertHeadline,
      alertSummary,
      urgency,
      channels,
      slackWebhook: config.slackWebhook
    });

    setResult(res);
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle size={18} />
          Breaking News Alert
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
        <p className="text-sm text-red-800">
          Alerts are sent to all subscribers. Duplicate alerts on the same story are automatically prevented.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alert Headline</label>
          <input
            type="text"
            value={alertHeadline}
            onChange={(e) => setAlertHeadline(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
            placeholder="Breaking news headline..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            value={alertSummary}
            onChange={(e) => setAlertSummary(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
            rows={2}
            placeholder="Brief summary for notification..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
          >
            <option value="breaking">BREAKING - Major news event</option>
            <option value="developing">DEVELOPING - Ongoing story</option>
            <option value="update">UPDATE - New information</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Alert Channels</label>
          <div className="space-y-2">
            {[
              { id: 'slack', label: 'Slack', icon: Slack },
              { id: 'email', label: 'Email Subscribers', icon: Send },
              { id: 'push', label: 'Push Notifications', icon: Bell }
            ].map(({ id, label, icon: Icon }) => (
              <label key={id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={channels.includes(id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setChannels([...channels, id]);
                    } else {
                      setChannels(channels.filter(c => c !== id));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <Icon size={16} className="text-gray-600" />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSendAlert}
          disabled={sending || !alertHeadline}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
        >
          {sending ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Sending Alert...
            </>
          ) : (
            <>
              <Zap size={18} />
              Send Breaking News Alert
            </>
          )}
        </button>

        {result && (
          <div className={`p-3 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <p className="text-sm text-green-800 flex items-center gap-2">
                <CheckCircle size={16} />
                Alert sent successfully!
              </p>
            ) : (
              <p className="text-sm text-red-800 flex items-center gap-2">
                <XCircle size={16} />
                {result.reason === 'duplicate' ? 'Alert already sent for this story' : result.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================
// ENHANCED A/B TESTING PANEL
// Pattern: NYT tests 29% of articles with up to 8 variants
// ============================================

export function ABTestingPanel({ article, onUpdateHeadlines, isOpen, onClose }) {
  const [testManager] = useState(() => new HeadlineABTesting({ maxVariants: 8, testDuration: 30 * 60 * 1000 }));
  const [activeTest, setActiveTest] = useState(null);
  const [newVariant, setNewVariant] = useState('');

  const startTest = () => {
    if (article.headlines.length < 2) {
      alert('Need at least 2 headline variants to start a test');
      return;
    }
    const test = testManager.createTest(
      article.title,
      article.headlines.map(h => h.text)
    );
    setActiveTest(test);
  };

  const addVariant = () => {
    if (!newVariant.trim()) return;
    if (article.headlines.length >= 8) {
      alert('Maximum 8 variants allowed (NYT best practice)');
      return;
    }
    onUpdateHeadlines([
      ...article.headlines,
      { text: newVariant, tested: false, clickRate: null }
    ]);
    setNewVariant('');
  };

  const removeVariant = (index) => {
    if (article.headlines.length <= 1) return;
    onUpdateHeadlines(article.headlines.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Target size={18} />
          A/B Headline Testing
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <p className="text-xs text-blue-800">
          <strong>NYT Pattern:</strong> Test up to 8 headline variants for ~30 minutes.
          A/B-tested articles are 80% more likely to appear on "most popular" lists.
        </p>
      </div>

      {/* Headline Variants */}
      <div className="space-y-2 mb-4">
        {article.headlines.map((headline, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
              {String.fromCharCode(65 + idx)}
            </span>
            <input
              type="text"
              value={headline.text}
              onChange={(e) => {
                const updated = [...article.headlines];
                updated[idx].text = e.target.value;
                onUpdateHeadlines(updated);
              }}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            {headline.clickRate !== null && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                {headline.clickRate}% CTR
              </span>
            )}
            {article.headlines.length > 1 && (
              <button
                onClick={() => removeVariant(idx)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Variant */}
      {article.headlines.length < 8 && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newVariant}
            onChange={(e) => setNewVariant(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addVariant()}
            placeholder="Add headline variant..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded"
          />
          <button
            onClick={addVariant}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-4">
        {article.headlines.length}/8 variants ({8 - article.headlines.length} remaining)
      </p>

      {/* Test Controls */}
      {activeTest ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Radio size={16} className="text-yellow-600 animate-pulse" />
            <span className="text-sm font-medium text-yellow-800">Test Running</span>
          </div>
          <p className="text-xs text-yellow-700">
            Testing {activeTest.variants.length} variants. Results in ~30 minutes.
          </p>
          <div className="mt-2 text-xs text-gray-600">
            Status: {activeTest.status}
          </div>
        </div>
      ) : (
        <button
          onClick={startTest}
          disabled={article.headlines.length < 2}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          <Play size={16} />
          Start A/B Test
        </button>
      )}
    </div>
  );
}


// ============================================
// LIVE BLOG INTERFACE
// Pattern: AP/Reuters wire service live coverage
// ============================================

export function LiveBlogPanel({ isOpen, onClose, onExport }) {
  const [blogManager] = useState(() => new LiveBlogManager());
  const [blogState, setBlogState] = useState(null);
  const [newEntry, setNewEntry] = useState({ headline: '', content: '', type: 'update' });
  const [blogTitle, setBlogTitle] = useState('');

  const refreshState = () => {
    setBlogState(blogManager.getState());
  };

  const startBlog = () => {
    if (!blogTitle.trim()) {
      alert('Please enter a title for the live blog');
      return;
    }
    blogManager.startLiveBlog(blogTitle);
    refreshState();
  };

  const addEntry = () => {
    if (!newEntry.content.trim()) return;
    blogManager.addEntry({
      ...newEntry,
      author: 'Editor'
    });
    setNewEntry({ headline: '', content: '', type: 'update' });
    refreshState();
  };

  const endBlog = () => {
    if (window.confirm('End this live blog? You can still export it.')) {
      blogManager.endLiveBlog();
      refreshState();
    }
  };

  const exportBlog = () => {
    const html = blogManager.exportAsHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-blog-${Date.now()}.html`;
    a.click();
    if (onExport) onExport(html);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Radio size={18} className={blogState?.isLive ? 'text-red-600 animate-pulse' : ''} />
          Live Blog
          {blogState?.isLive && (
            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
              LIVE
            </span>
          )}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      <div className="p-4">
        {!blogState?.isLive && !blogState?.entries?.length ? (
          // Start new live blog
          <div className="space-y-4">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-sm text-gray-700">
                Live blogs are ideal for election coverage, breaking events, and ongoing stories.
              </p>
            </div>
            <input
              type="text"
              value={blogTitle}
              onChange={(e) => setBlogTitle(e.target.value)}
              placeholder="Live blog title (e.g., 'Election Night 2024')"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <button
              onClick={startBlog}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Play size={18} />
              Start Live Blog
            </button>
          </div>
        ) : (
          // Active live blog
          <div className="space-y-4">
            {/* New Entry Form */}
            {blogState?.isLive && (
              <div className="bg-gray-50 rounded p-3 space-y-3">
                <select
                  value={newEntry.type}
                  onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="update">Update</option>
                  <option value="breaking">Breaking</option>
                  <option value="analysis">Analysis</option>
                  <option value="quote">Quote</option>
                </select>
                <input
                  type="text"
                  value={newEntry.headline}
                  onChange={(e) => setNewEntry({ ...newEntry, headline: e.target.value })}
                  placeholder="Entry headline (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <textarea
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                  placeholder="Entry content..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  rows={3}
                />
                <button
                  onClick={addEntry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Add Entry
                </button>
              </div>
            )}

            {/* Entries List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {blogState?.entries?.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded border ${
                    entry.isBreaking ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  } ${entry.isPinned ? 'ring-2 ring-yellow-400' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                        {entry.isBreaking && (
                          <span className="ml-2 text-red-600 font-medium">BREAKING</span>
                        )}
                      </p>
                      {entry.headline && (
                        <p className="font-medium text-sm">{entry.headline}</p>
                      )}
                      <p className="text-sm text-gray-700 mt-1">{entry.content}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { blogManager.pinEntry(entry.id); refreshState(); }}
                        className={`p-1 rounded ${entry.isPinned ? 'text-yellow-600' : 'text-gray-400 hover:text-yellow-600'}`}
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        onClick={() => { blogManager.deleteEntry(entry.id); refreshState(); }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {blogState?.isLive && (
                <button
                  onClick={endBlog}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  <Square size={16} />
                  End Live Blog
                </button>
              )}
              <button
                onClick={exportBlog}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <FileText size={16} />
                Export HTML
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              {blogState?.entryCount || 0} entries
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================
// MULTI-PLATFORM EXPORT PANEL
// Pattern: Arc XP COPE - Create Once, Publish Everywhere
// ============================================

export function MultiPlatformExportPanel({ article, isOpen, onClose }) {
  const [exporter] = useState(() => new MultiPlatformExporter());
  const [copiedFormat, setCopiedFormat] = useState(null);

  const exportFormats = [
    {
      id: 'apple-news',
      label: 'Apple News',
      icon: Smartphone,
      description: 'Apple News Format (ANF) JSON',
      generate: () => JSON.stringify(exporter.generateAppleNewsFormat(article), null, 2),
      extension: '.json'
    },
    {
      id: 'rss',
      label: 'RSS Item',
      icon: Rss,
      description: 'RSS feed entry XML',
      generate: () => exporter.generateRSSItem(article),
      extension: '.xml'
    },
    {
      id: 'amp',
      label: 'AMP HTML',
      icon: Zap,
      description: 'Google AMP optimized page',
      generate: () => exporter.generateAMPHTML(article),
      extension: '.html'
    },
    {
      id: 'plain-text',
      label: 'Plain Text',
      icon: FileText,
      description: 'For email clients without HTML',
      generate: () => exporter.generatePlainText(article),
      extension: '.txt'
    },
    {
      id: 'structured-data',
      label: 'Schema.org',
      icon: Code2,
      description: 'JSON-LD structured data for SEO',
      generate: () => JSON.stringify(exporter.generateStructuredData(article), null, 2),
      extension: '.json'
    }
  ];

  const handleExport = (format) => {
    const content = format.generate();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format.id}${format.extension}`;
    a.click();
  };

  const handleCopy = async (format) => {
    const content = format.generate();
    await navigator.clipboard.writeText(content);
    setCopiedFormat(format.id);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Share2 size={18} />
          Multi-Platform Export
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <p className="text-xs text-blue-800">
          <strong>COPE Pattern:</strong> Create Once, Publish Everywhere.
          Export your article for web, mobile, newsletters, and Apple News from a single source.
        </p>
      </div>

      <div className="space-y-2">
        {exportFormats.map((format) => (
          <div
            key={format.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <format.icon size={20} className="text-gray-600" />
              <div>
                <p className="text-sm font-medium">{format.label}</p>
                <p className="text-xs text-gray-500">{format.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(format)}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                title="Copy to clipboard"
              >
                {copiedFormat === format.id ? (
                  <CheckCircle size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
              <button
                onClick={() => handleExport(format)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Export
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ============================================
// KEYBOARD SHORTCUTS PANEL
// Pattern: Professional editors use extensive shortcuts
// ============================================

export function KeyboardShortcutsPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  const groupedShortcuts = {
    'File Operations': ['mod+s', 'mod+shift+s', 'mod+e', 'mod+p', 'mod+shift+p'],
    'Text Formatting': ['mod+b', 'mod+i', 'mod+k', 'mod+shift+k', 'mod+shift+i'],
    'Headings': ['mod+alt+1', 'mod+alt+2', 'mod+alt+3', 'mod+alt+0'],
    'Lists & Blocks': ['mod+shift+7', 'mod+shift+8', 'mod+shift+9'],
    'Panels': ['mod+\\', 'mod+shift+h', 'mod+shift+m', 'mod+shift+d'],
    'View Modes': ['mod+1', 'mod+2', 'mod+3'],
    'Workflow': ['mod+shift+r', 'mod+shift+n', 'mod+shift+a']
  };

  const formatKey = (key) => {
    return key
      .replace('mod', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl')
      .replace('shift', 'Shift')
      .replace('alt', 'Alt')
      .split('+')
      .map(k => k.charAt(0).toUpperCase() + k.slice(1))
      .join(' + ');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 max-h-[500px] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Keyboard size={18} />
          Keyboard Shortcuts
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedShortcuts).map(([group, shortcuts]) => (
          <div key={group}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {group}
            </h4>
            <div className="space-y-1">
              {shortcuts.map((shortcut) => {
                const def = KEYBOARD_SHORTCUTS[shortcut];
                if (!def) return null;
                return (
                  <div key={shortcut} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700">{def.description}</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                      {formatKey(shortcut)}
                    </kbd>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ============================================
// SLACK INTEGRATION PANEL
// Pattern: SF Chronicle #breaking-news, Quartz bots
// ============================================

export function SlackIntegrationPanel({ article, isOpen, onClose, config = {} }) {
  const [slack] = useState(() => new SlackNewsroomIntegration(config));
  const [webhookUrl, setWebhookUrl] = useState(config.defaultWebhook || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const announcePublished = async () => {
    setSending(true);
    slack.defaultWebhook = webhookUrl;
    const res = await slack.announcePublished(article, { url: '#' });
    setResult(res);
    setSending(false);
  };

  const requestReview = async () => {
    setSending(true);
    slack.defaultWebhook = webhookUrl;
    const res = await slack.requestReview(article, null, { notes: message });
    setResult(res);
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Slack size={18} />
          Slack Integration
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
        <p className="text-xs text-purple-800">
          "Slack has become the newsroom coordination backbone." Connect to your
          #breaking-news, #published, or team channels.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get this from Slack App &gt; Incoming Webhooks
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add context for the team..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={announcePublished}
            disabled={sending || !webhookUrl}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            <Send size={14} />
            Announce
          </button>
          <button
            onClick={requestReview}
            disabled={sending || !webhookUrl}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <Eye size={14} />
            Request Review
          </button>
        </div>

        {result && (
          <div className={`p-3 rounded text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success ? 'Message sent to Slack!' : `Error: ${result.error || result.reason}`}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================
// ENHANCED FEATURE BUTTONS FOR MAIN EDITOR
// ============================================

export function EnhancedFeatureBar({
  article,
  onUpdateHeadlines,
  analyticsConfig,
  slackConfig
}) {
  const [activePanel, setActivePanel] = useState(null);

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const features = [
    { id: 'analytics', label: 'Analytics', icon: BarChart2, color: 'blue' },
    { id: 'breaking', label: 'Breaking', icon: AlertTriangle, color: 'red' },
    { id: 'ab-test', label: 'A/B Test', icon: Target, color: 'purple' },
    { id: 'live-blog', label: 'Live Blog', icon: Radio, color: 'orange' },
    { id: 'export', label: 'Multi-Platform', icon: Share2, color: 'green' },
    { id: 'slack', label: 'Slack', icon: Slack, color: 'indigo' },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, color: 'gray' }
  ];

  return (
    <div className="space-y-4">
      {/* Feature Buttons */}
      <div className="flex flex-wrap gap-2">
        {features.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => togglePanel(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              activePanel === id
                ? `bg-${color}-100 text-${color}-700 ring-1 ring-${color}-300`
                : `bg-gray-100 text-gray-700 hover:bg-gray-200`
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {activePanel === 'analytics' && (
        <AnalyticsSidebar
          article={article}
          isOpen={true}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'breaking' && (
        <BreakingNewsPanel
          article={article}
          isOpen={true}
          onClose={() => setActivePanel(null)}
          config={slackConfig}
        />
      )}
      {activePanel === 'ab-test' && (
        <ABTestingPanel
          article={article}
          onUpdateHeadlines={onUpdateHeadlines}
          isOpen={true}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'live-blog' && (
        <LiveBlogPanel
          isOpen={true}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'export' && (
        <MultiPlatformExportPanel
          article={article}
          isOpen={true}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'slack' && (
        <SlackIntegrationPanel
          article={article}
          isOpen={true}
          onClose={() => setActivePanel(null)}
          config={slackConfig}
        />
      )}
      {activePanel === 'shortcuts' && (
        <KeyboardShortcutsPanel
          isOpen={true}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}


export default {
  AnalyticsSidebar,
  BreakingNewsPanel,
  ABTestingPanel,
  LiveBlogPanel,
  MultiPlatformExportPanel,
  KeyboardShortcutsPanel,
  SlackIntegrationPanel,
  EnhancedFeatureBar
};
