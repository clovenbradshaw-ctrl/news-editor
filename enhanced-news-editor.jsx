import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Code, Eye, Bold, Italic, List, ListOrdered, Link, Image, 
  Type, AlignLeft, AlignCenter, Quote, Save, History, Users, FileUp,
  Tag, Bookmark, MessageSquare, Clock, Download, Copy, CheckCircle,
  AlertCircle, PlusCircle, Trash2, Edit3, ExternalLink, Paperclip
} from 'lucide-react';

const NewsArticleEditor = () => {
  const [viewMode, setViewMode] = useState('wysiwyg');
  const [content, setContent] = useState({
    title: 'Article Title',
    subtitle: '',
    byline: 'By Your Name',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    body: '<p>Start writing your investigative article here...</p>',
    metadata: {
      tags: [],
      categories: [],
      seo: {
        metaDescription: '',
        keywords: []
      }
    },
    headlines: [
      { text: 'Article Title', tested: false, clickRate: null }
    ],
    sources: [],
    documents: [],
    editorialNotes: [],
    status: 'draft' // draft, in-review, ready, published
  });
  
  const [showMetadata, setShowMetadata] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([
    { timestamp: new Date(), user: 'You', action: 'Created article', snapshot: null }
  ]);
  
  const editorRef = useRef(null);
  const [currentHeadlineIndex, setCurrentHeadlineIndex] = useState(0);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setInterval(() => {
      saveVersion('Auto-saved');
    }, 60000); // Auto-save every minute
    
    return () => clearInterval(autoSave);
  }, [content]);

  // Save version to history
  const saveVersion = (action) => {
    const newHistory = [
      {
        timestamp: new Date(),
        user: 'You',
        action: action,
        snapshot: JSON.parse(JSON.stringify(content))
      },
      ...history
    ];
    setHistory(newHistory.slice(0, 50)); // Keep last 50 versions
  };

  // Restore from history
  const restoreVersion = (snapshot) => {
    if (window.confirm('Restore this version? Current changes will be saved to history.')) {
      saveVersion('Before restore');
      setContent(snapshot);
    }
  };

  // HTML to Markdown conversion (enhanced)
  const htmlToMarkdown = (html) => {
    let md = html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img src="(.*?)".*?alt="(.*?)".*?>/g, '![$2]($1)')
      .replace(/<ul>/g, '\n')
      .replace(/<\/ul>/g, '\n')
      .replace(/<ol>/g, '\n')
      .replace(/<\/ol>/g, '\n')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<hr\s*\/?>/g, '\n---\n\n')
      .replace(/<[^>]*>/g, '');
    
    return md.trim();
  };

  // Markdown to HTML conversion (enhanced)
  const markdownToHtml = (md) => {
    let html = md
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^---$/gim, '<hr />')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|u|o|b])/gim, '<p>')
      .replace(/(<p>.*?)$/s, '$1</p>');
    
    return html;
  };

  // Get full document in different formats
  const getFullDocument = (format) => {
    const bodyContent = format === 'markdown' ? htmlToMarkdown(content.body) : content.body;
    
    if (format === 'markdown') {
      let md = `# ${content.title}\n\n`;
      if (content.subtitle) md += `## ${content.subtitle}\n\n`;
      md += `${content.byline}\n\n${content.date}\n\n`;
      if (content.metadata.tags.length > 0) {
        md += `**Tags:** ${content.metadata.tags.join(', ')}\n\n`;
      }
      md += `---\n\n${bodyContent}`;
      
      // Add sources
      if (content.sources.length > 0) {
        md += `\n\n---\n\n## Sources\n\n`;
        content.sources.forEach((source, i) => {
          md += `${i + 1}. **${source.name}** - ${source.type}\n`;
          if (source.url) md += `   ${source.url}\n`;
          if (source.notes) md += `   *${source.notes}*\n`;
          md += '\n';
        });
      }
      
      return md;
    } else if (format === 'html') {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <meta name="description" content="${content.metadata.seo.metaDescription || content.subtitle}">
  <meta name="keywords" content="${content.metadata.seo.keywords.join(', ')}">
  <meta name="author" content="${content.byline}">
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #1a1a1a;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.2em;
      line-height: 1.2;
      font-weight: 700;
    }
    h2.subtitle {
      font-size: 1.5em;
      color: #666;
      font-weight: 400;
      margin-top: 0;
      line-height: 1.3;
    }
    .byline {
      font-style: italic;
      margin: 1em 0 0.5em;
      font-size: 1.1em;
    }
    .date {
      color: #666;
      margin-bottom: 2em;
    }
    .tags {
      margin: 1em 0;
      color: #0066cc;
    }
    .tag {
      display: inline-block;
      background: #f0f0f0;
      padding: 0.2em 0.6em;
      margin: 0.2em;
      border-radius: 3px;
      font-size: 0.9em;
    }
    p {
      margin: 1.2em 0;
      font-size: 1.1em;
    }
    blockquote {
      border-left: 4px solid #0066cc;
      margin: 1.5em 0;
      padding-left: 1.5em;
      color: #444;
      font-style: italic;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 1.5em 0;
    }
    .sources {
      margin-top: 3em;
      padding-top: 2em;
      border-top: 1px solid #ddd;
    }
    .sources h3 {
      font-size: 1.3em;
      margin-bottom: 1em;
    }
    .source-item {
      margin-bottom: 1em;
      padding-left: 1.5em;
    }
    code {
      background: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 2em 0;
    }
  </style>
</head>
<body>
  <article>
    <h1>${content.title}</h1>
    ${content.subtitle ? `<h2 class="subtitle">${content.subtitle}</h2>` : ''}
    <p class="byline">${content.byline}</p>
    <p class="date">${content.date}</p>
    ${content.metadata.tags.length > 0 ? `
    <div class="tags">
      ${content.metadata.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
    </div>
    ` : ''}
    <hr>
    ${content.body}
    ${content.sources.length > 0 ? `
    <div class="sources">
      <h3>Sources</h3>
      ${content.sources.map((source, i) => `
        <div class="source-item">
          <strong>${i + 1}. ${source.name}</strong> - ${source.type}
          ${source.url ? `<br><a href="${source.url}" target="_blank">${source.url}</a>` : ''}
          ${source.notes ? `<br><em>${source.notes}</em>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
  </article>
</body>
</html>`;
    }
    return bodyContent;
  };

  // Execute formatting command
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent({ ...content, body: editorRef.current.innerHTML });
    }
  };

  // Handle body content changes
  const handleBodyChange = () => {
    if (editorRef.current) {
      setContent({ ...content, body: editorRef.current.innerHTML });
    }
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  // Insert image
  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      const alt = prompt('Enter image description (for accessibility):');
      const img = `<img src="${url}" alt="${alt || 'Image'}" style="max-width: 100%; height: auto;" />`;
      document.execCommand('insertHTML', false, img);
      handleBodyChange();
    }
  };

  // Add source
  const addSource = () => {
    const name = prompt('Source name:');
    if (name) {
      const type = prompt('Source type (e.g., Interview, Document, Email, Public Record):');
      const url = prompt('URL (if applicable):');
      const notes = prompt('Notes:');
      
      setContent({
        ...content,
        sources: [...content.sources, { name, type: type || 'Document', url, notes, dateAdded: new Date() }]
      });
      saveVersion('Added source');
    }
  };

  // Add document
  const addDocument = () => {
    const name = prompt('Document name:');
    if (name) {
      const url = prompt('Document URL or file path:');
      const notes = prompt('Description/notes:');
      
      setContent({
        ...content,
        documents: [...content.documents, { name, url, notes, dateAdded: new Date() }]
      });
      saveVersion('Added document');
    }
  };

  // Add editorial note
  const addEditorialNote = () => {
    const note = prompt('Editorial note:');
    if (note) {
      setContent({
        ...content,
        editorialNotes: [...content.editorialNotes, { text: note, timestamp: new Date(), user: 'You' }]
      });
    }
  };

  // Add headline variant (for A/B testing)
  const addHeadlineVariant = () => {
    const variant = prompt('Enter headline variant:');
    if (variant) {
      setContent({
        ...content,
        headlines: [...content.headlines, { text: variant, tested: false, clickRate: null }]
      });
    }
  };

  // Add tag
  const addTag = () => {
    const tag = prompt('Enter tag:');
    if (tag && !content.metadata.tags.includes(tag)) {
      setContent({
        ...content,
        metadata: {
          ...content.metadata,
          tags: [...content.metadata.tags, tag]
        }
      });
    }
  };

  // Toolbar button component
  const ToolbarButton = ({ icon: Icon, label, onClick, active }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-gray-300' : ''}`}
      title={label}
      type="button"
    >
      <Icon size={18} />
    </button>
  );

  // Status badge
  const StatusBadge = () => {
    const statusColors = {
      draft: 'bg-gray-200 text-gray-700',
      'in-review': 'bg-yellow-200 text-yellow-800',
      ready: 'bg-green-200 text-green-800',
      published: 'bg-blue-200 text-blue-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[content.status]}`}>
        {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">News Article Editor</h1>
              <StatusBadge />
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode Switcher */}
              <div className="flex gap-1 bg-gray-100 rounded p-1">
                <button
                  onClick={() => setViewMode('wysiwyg')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'wysiwyg' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye size={16} />
                  Editor
                </button>
                <button
                  onClick={() => setViewMode('markdown')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'markdown' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText size={16} />
                  Markdown
                </button>
                <button
                  onClick={() => setViewMode('html')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'html' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Code size={16} />
                  HTML
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => saveVersion('Manual save')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Save size={16} />
                Save
              </button>
              
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Version History"
              >
                <History size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Editor Area */}
          <div className={`${showMetadata || showSources || showDocuments || showHistory ? 'col-span-8' : 'col-span-12'}`}>
            {/* WYSIWYG View */}
            {viewMode === 'wysiwyg' && (
              <div className="bg-white rounded-lg shadow-sm">
                {/* Formatting Toolbar */}
                <div className="border-b border-gray-200 p-3 flex flex-wrap gap-1">
                  <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" onClick={() => execCommand('bold')} />
                  <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" onClick={() => execCommand('italic')} />
                  <div className="w-px bg-gray-300 mx-1" />
                  
                  <ToolbarButton icon={Type} label="Heading 1" onClick={() => execCommand('formatBlock', '<h1>')} />
                  <ToolbarButton icon={Type} label="Heading 2" onClick={() => execCommand('formatBlock', '<h2>')} />
                  <ToolbarButton icon={Type} label="Heading 3" onClick={() => execCommand('formatBlock', '<h3>')} />
                  <div className="w-px bg-gray-300 mx-1" />
                  
                  <ToolbarButton icon={List} label="Bullet List" onClick={() => execCommand('insertUnorderedList')} />
                  <ToolbarButton icon={ListOrdered} label="Numbered List" onClick={() => execCommand('insertOrderedList')} />
                  <div className="w-px bg-gray-300 mx-1" />
                  
                  <ToolbarButton icon={Quote} label="Quote" onClick={() => execCommand('formatBlock', '<blockquote>')} />
                  <ToolbarButton icon={Link} label="Insert Link" onClick={insertLink} />
                  <ToolbarButton icon={Image} label="Insert Image" onClick={insertImage} />
                  <div className="w-px bg-gray-300 mx-1" />
                  
                  <ToolbarButton icon={AlignLeft} label="Align Left" onClick={() => execCommand('justifyLeft')} />
                  <ToolbarButton icon={AlignCenter} label="Align Center" onClick={() => execCommand('justifyCenter')} />
                </div>

                {/* Article Metadata */}
                <div className="p-8 border-b border-gray-200">
                  {/* Headline Variants */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-gray-700">Headline Variants (A/B Testing)</label>
                      <button
                        onClick={addHeadlineVariant}
                        className="text-blue-500 hover:text-blue-600"
                        title="Add headline variant"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>
                    {content.headlines.map((headline, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="headline"
                          checked={idx === currentHeadlineIndex}
                          onChange={() => {
                            setCurrentHeadlineIndex(idx);
                            setContent({ ...content, title: headline.text });
                          }}
                        />
                        <input
                          type="text"
                          value={headline.text}
                          onChange={(e) => {
                            const newHeadlines = [...content.headlines];
                            newHeadlines[idx].text = e.target.value;
                            setContent({ ...content, headlines: newHeadlines });
                            if (idx === currentHeadlineIndex) {
                              setContent({ ...content, title: e.target.value, headlines: newHeadlines });
                            }
                          }}
                          className="flex-1 text-xl font-bold border-b border-gray-300 outline-none focus:border-blue-500"
                          placeholder="Headline variant"
                        />
                        {headline.clickRate && (
                          <span className="text-sm text-gray-500">{headline.clickRate}% CTR</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={content.subtitle}
                    onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                    className="w-full text-xl text-gray-600 mb-4 border-none outline-none focus:ring-0"
                    placeholder="Subtitle (optional)"
                  />
                  
                  <div className="flex gap-4 mb-3">
                    <input
                      type="text"
                      value={content.byline}
                      onChange={(e) => setContent({ ...content, byline: e.target.value })}
                      className="flex-1 italic text-gray-700 border-none outline-none focus:ring-0"
                      placeholder="By Author Name"
                    />
                    <input
                      type="text"
                      value={content.date}
                      onChange={(e) => setContent({ ...content, date: e.target.value })}
                      className="text-gray-500 border-none outline-none focus:ring-0"
                      placeholder="Date"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={addTag}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Tag size={14} />
                      Add Tag
                    </button>
                    <button
                      onClick={() => setShowMetadata(!showMetadata)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Bookmark size={14} />
                      Metadata
                    </button>
                    <button
                      onClick={() => setShowSources(!showSources)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Users size={14} />
                      Sources ({content.sources.length})
                    </button>
                    <button
                      onClick={() => setShowDocuments(!showDocuments)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Paperclip size={14} />
                      Documents ({content.documents.length})
                    </button>
                    <button
                      onClick={addEditorialNote}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <MessageSquare size={14} />
                      Note
                    </button>
                  </div>

                  {/* Tags Display */}
                  {content.metadata.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {content.metadata.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm flex items-center gap-1">
                          {tag}
                          <button
                            onClick={() => {
                              setContent({
                                ...content,
                                metadata: {
                                  ...content.metadata,
                                  tags: content.metadata.tags.filter((_, i) => i !== idx)
                                }
                              });
                            }}
                            className="hover:text-blue-900"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Editor Content */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleBodyChange}
                  dangerouslySetInnerHTML={{ __html: content.body }}
                  className="p-8 min-h-[500px] prose max-w-none focus:outline-none"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '18px',
                    lineHeight: '1.8'
                  }}
                />

                {/* Editorial Notes */}
                {content.editorialNotes.length > 0 && (
                  <div className="p-8 border-t border-gray-200 bg-yellow-50">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare size={16} />
                      Editorial Notes
                    </h3>
                    {content.editorialNotes.map((note, idx) => (
                      <div key={idx} className="mb-2 p-3 bg-white rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{note.user}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{note.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Markdown View */}
            {viewMode === 'markdown' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <textarea
                  value={getFullDocument('markdown')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    let title = '', subtitle = '', byline = '', date = '', body = [];
                    let inBody = false;
                    
                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i];
                      if (line.startsWith('# ') && !title) {
                        title = line.substring(2);
                      } else if (line.startsWith('## ') && !subtitle) {
                        subtitle = line.substring(3);
                      } else if (!byline && line && !line.startsWith('#') && !line.startsWith('---') && !line.startsWith('**Tags:**')) {
                        byline = line;
                      } else if (!date && byline && line && !line.startsWith('---')) {
                        date = line;
                      } else if (line === '---') {
                        inBody = true;
                      } else if (inBody && !line.startsWith('## Sources')) {
                        body.push(line);
                      }
                    }
                    
                    const bodyMd = body.join('\n').trim();
                    setContent({
                      ...content,
                      title: title || 'Article Title',
                      subtitle: subtitle,
                      byline: byline || 'By Your Name',
                      date: date || new Date().toLocaleDateString(),
                      body: markdownToHtml(bodyMd)
                    });
                  }}
                  className="w-full h-[700px] font-mono text-sm p-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="# Title..."
                  spellCheck="false"
                />
              </div>
            )}

            {/* HTML View */}
            {viewMode === 'html' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <textarea
                  value={getFullDocument('html')}
                  onChange={(e) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(e.target.value, 'text/html');
                    const h1 = doc.querySelector('h1');
                    const subtitle = doc.querySelector('h2.subtitle');
                    const bylineEl = doc.querySelector('.byline');
                    const dateEl = doc.querySelector('.date');
                    const article = doc.querySelector('article');
                    
                    if (article) {
                      const articleClone = article.cloneNode(true);
                      h1 && articleClone.removeChild(h1);
                      subtitle && articleClone.removeChild(subtitle);
                      bylineEl && articleClone.removeChild(bylineEl);
                      dateEl && articleClone.removeChild(dateEl);
                      const hr = articleClone.querySelector('hr');
                      hr && articleClone.removeChild(hr);
                      const tags = articleClone.querySelector('.tags');
                      tags && articleClone.removeChild(tags);
                      const sources = articleClone.querySelector('.sources');
                      sources && articleClone.removeChild(sources);
                      
                      setContent({
                        ...content,
                        title: h1?.textContent || 'Article Title',
                        subtitle: subtitle?.textContent || '',
                        byline: bylineEl?.textContent || 'By Your Name',
                        date: dateEl?.textContent || new Date().toLocaleDateString(),
                        body: articleClone.innerHTML.trim()
                      });
                    }
                  }}
                  className="w-full h-[700px] font-mono text-sm p-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="<!DOCTYPE html>..."
                  spellCheck="false"
                />
              </div>
            )}
          </div>

          {/* Sidebar Panels */}
          {(showMetadata || showSources || showDocuments || showHistory) && (
            <div className="col-span-4 space-y-4">
              {/* Metadata Panel */}
              {showMetadata && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Metadata & SEO</h3>
                    <button onClick={() => setShowMetadata(false)} className="text-gray-400 hover:text-gray-600">
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={content.status}
                        onChange={(e) => setContent({ ...content, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="in-review">In Review</option>
                        <option value="ready">Ready to Publish</option>
                        <option value="published">Published</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        placeholder="e.g., Investigative, Breaking News"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            setContent({
                              ...content,
                              metadata: {
                                ...content.metadata,
                                categories: [...content.metadata.categories, e.target.value]
                              }
                            });
                            e.target.value = '';
                          }
                        }}
                      />
                      {content.metadata.categories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {content.metadata.categories.map((cat, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                      <textarea
                        value={content.metadata.seo.metaDescription}
                        onChange={(e) => setContent({
                          ...content,
                          metadata: {
                            ...content.metadata,
                            seo: { ...content.metadata.seo, metaDescription: e.target.value }
                          }
                        })}
                        placeholder="Brief description for search engines (150-160 characters)"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                        rows="3"
                        maxLength="160"
                      />
                      <p className="text-xs text-gray-500 mt-1">{content.metadata.seo.metaDescription.length}/160</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SEO Keywords</label>
                      <input
                        type="text"
                        placeholder="Press Enter to add keyword"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            setContent({
                              ...content,
                              metadata: {
                                ...content.metadata,
                                seo: {
                                  ...content.metadata.seo,
                                  keywords: [...content.metadata.seo.keywords, e.target.value]
                                }
                              }
                            });
                            e.target.value = '';
                          }
                        }}
                      />
                      {content.metadata.seo.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {content.metadata.seo.keywords.map((kw, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sources Panel */}
              {showSources && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Sources</h3>
                    <div className="flex gap-2">
                      <button onClick={addSource} className="text-blue-500 hover:text-blue-600" title="Add source">
                        <PlusCircle size={18} />
                      </button>
                      <button onClick={() => setShowSources(false)} className="text-gray-400 hover:text-gray-600">
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {content.sources.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No sources added yet</p>
                    ) : (
                      content.sources.map((source, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-sm text-gray-900">{source.name}</h4>
                            <button
                              onClick={() => {
                                setContent({
                                  ...content,
                                  sources: content.sources.filter((_, i) => i !== idx)
                                });
                              }}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{source.type}</p>
                          {source.url && (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-1">
                              <ExternalLink size={12} />
                              {source.url}
                            </a>
                          )}
                          {source.notes && (
                            <p className="text-xs text-gray-700 italic mt-1">{source.notes}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Added {new Date(source.dateAdded).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Documents Panel */}
              {showDocuments && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Documents</h3>
                    <div className="flex gap-2">
                      <button onClick={addDocument} className="text-blue-500 hover:text-blue-600" title="Add document">
                        <FileUp size={18} />
                      </button>
                      <button onClick={() => setShowDocuments(false)} className="text-gray-400 hover:text-gray-600">
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {content.documents.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No documents attached</p>
                    ) : (
                      content.documents.map((doc, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-sm text-gray-900 flex items-center gap-1">
                              <Paperclip size={14} />
                              {doc.name}
                            </h4>
                            <button
                              onClick={() => {
                                setContent({
                                  ...content,
                                  documents: content.documents.filter((_, i) => i !== idx)
                                });
                              }}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-1">
                              <ExternalLink size={12} />
                              View Document
                            </a>
                          )}
                          {doc.notes && (
                            <p className="text-xs text-gray-700 mt-1">{doc.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Version History Panel */}
              {showHistory && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Version History</h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {history.map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.action}</p>
                            <p className="text-xs text-gray-600">{item.user}</p>
                            <p className="text-xs text-gray-500">
                              <Clock size={10} className="inline mr-1" />
                              {new Date(item.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {item.snapshot && (
                            <button
                              onClick={() => restoreVersion(item.snapshot)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export & Actions Bar */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Export Options</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const blob = new Blob([getFullDocument('html')], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${content.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
                    a.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  <Download size={16} />
                  HTML
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([getFullDocument('markdown')], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${content.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
                    a.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                >
                  <Download size={16} />
                  Markdown
                </button>
                <button
                  onClick={() => {
                    const jsonData = JSON.stringify(content, null, 2);
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${content.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
                    a.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
                >
                  <Download size={16} />
                  JSON
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getFullDocument(viewMode === 'wysiwyg' ? 'html' : viewMode));
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">
                Last saved: {new Date(history[0]?.timestamp).toLocaleTimeString()}
              </p>
              <p className="text-xs text-gray-500">
                {content.body.replace(/<[^>]*>/g, '').split(/\s+/).length} words
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsArticleEditor;