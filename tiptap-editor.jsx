import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, List, ListOrdered, Quote, Link as LinkIcon, 
  Image as ImageIcon, Code, Heading1, Heading2, Undo, Redo,
  Save, FileText, Eye, Download
} from 'lucide-react';

/**
 * TipTap-Enhanced News Editor
 * 
 * This version uses TipTap (built on ProseMirror - same foundation as NYT's Oak editor)
 * for professional-grade editing with collaborative features support.
 * 
 * Benefits over contentEditable:
 * - Structured document model (like NYT's Scoop)
 * - Better cross-browser consistency
 * - Undo/redo history
 * - Easy to add collaboration (Yjs)
 * - Plugin ecosystem
 * - Better accessibility
 * 
 * Installation:
 * npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link 
 *             @tiptap/extension-image @tiptap/extension-placeholder
 */

const TipTapNewsEditor = () => {
  const [content, setContent] = useState({
    title: 'Article Title',
    subtitle: '',
    byline: 'By Your Name',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    body: '<p>Start writing your investigative article here...</p>',
    metadata: {
      tags: [],
      seo: { metaDescription: '', keywords: [] }
    },
    sources: [],
    status: 'draft'
  });

  const [viewMode, setViewMode] = useState('editor'); // editor, markdown, html, preview

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto my-4'
        }
      }),
      Placeholder.configure({
        placeholder: 'Start writing your story...'
      })
    ],
    content: content.body,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[500px] p-8',
        style: 'font-family: Georgia, serif; font-size: 18px; line-height: 1.8;'
      }
    },
    onUpdate: ({ editor }) => {
      setContent({ ...content, body: editor.getHTML() });
    }
  });

  // Toolbar button component
  const MenuButton = ({ onClick, isActive, icon: Icon, label }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded transition-colors ${
        isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
      }`}
      title={label}
      type="button"
    >
      <Icon size={18} />
    </button>
  );

  // Add link
  const setLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // Add image
  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // Convert to Markdown (basic)
  const toMarkdown = () => {
    let md = `# ${content.title}\n\n`;
    if (content.subtitle) md += `## ${content.subtitle}\n\n`;
    md += `${content.byline}\n\n${content.date}\n\n---\n\n`;
    
    // Convert HTML to Markdown (simplified)
    const html = editor.getHTML();
    md += html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img src="(.*?)".*?>/g, '![]($1)')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<[^>]*>/g, '');
    
    return md;
  };

  // Export HTML
  const exportHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <meta name="description" content="${content.metadata.seo.metaDescription || content.subtitle}">
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #1a1a1a;
    }
    h1 { font-size: 2.5em; margin-bottom: 0.2em; line-height: 1.2; }
    h2.subtitle { font-size: 1.5em; color: #666; font-weight: 400; margin-top: 0; }
    .byline { font-style: italic; margin: 1em 0 0.5em; }
    .date { color: #666; margin-bottom: 2em; }
    p { margin: 1.2em 0; }
    blockquote {
      border-left: 4px solid #0066cc;
      margin: 1.5em 0;
      padding-left: 1.5em;
      color: #444;
      font-style: italic;
    }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; margin: 1.5em 0; }
  </style>
</head>
<body>
  <article>
    <h1>${content.title}</h1>
    ${content.subtitle ? `<h2 class="subtitle">${content.subtitle}</h2>` : ''}
    <p class="byline">${content.byline}</p>
    <p class="date">${content.date}</p>
    <hr>
    ${editor.getHTML()}
  </article>
</body>
</html>`;
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">TipTap News Editor</h1>
            
            <div className="flex items-center gap-3">
              {/* View Modes */}
              <div className="flex gap-1 bg-gray-100 rounded p-1">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'editor' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setViewMode('markdown')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'markdown' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => setViewMode('html')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'html' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'preview' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  Preview
                </button>
              </div>

              <button
                onClick={() => {
                  const blob = new Blob([exportHTML()], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'article.html';
                  a.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <Save size={16} />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {viewMode === 'editor' && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Formatting Toolbar */}
            <div className="border-b border-gray-200 p-3 flex flex-wrap gap-1">
              <MenuButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                icon={Bold}
                label="Bold"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                icon={Italic}
                label="Italic"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                icon={Code}
                label="Code"
              />
              
              <div className="w-px bg-gray-300 mx-1" />
              
              <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                icon={Heading1}
                label="Heading 1"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                icon={Heading2}
                label="Heading 2"
              />
              
              <div className="w-px bg-gray-300 mx-1" />
              
              <MenuButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                icon={List}
                label="Bullet List"
              />
              <MenuButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                icon={ListOrdered}
                label="Numbered List"
              />
              
              <div className="w-px bg-gray-300 mx-1" />
              
              <MenuButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                icon={Quote}
                label="Quote"
              />
              <MenuButton
                onClick={setLink}
                isActive={editor.isActive('link')}
                icon={LinkIcon}
                label="Link"
              />
              <MenuButton
                onClick={addImage}
                isActive={false}
                icon={ImageIcon}
                label="Image"
              />
              
              <div className="w-px bg-gray-300 mx-1" />
              
              <MenuButton
                onClick={() => editor.chain().focus().undo().run()}
                isActive={false}
                icon={Undo}
                label="Undo"
              />
              <MenuButton
                onClick={() => editor.chain().focus().redo().run()}
                isActive={false}
                icon={Redo}
                label="Redo"
              />
            </div>

            {/* Article Header */}
            <div className="p-8 border-b border-gray-200">
              <input
                type="text"
                value={content.title}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                className="w-full text-4xl font-bold mb-3 border-none outline-none"
                placeholder="Article Title"
              />
              <input
                type="text"
                value={content.subtitle}
                onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                className="w-full text-2xl text-gray-600 mb-4 border-none outline-none"
                placeholder="Subtitle (optional)"
              />
              <div className="flex gap-4">
                <input
                  type="text"
                  value={content.byline}
                  onChange={(e) => setContent({ ...content, byline: e.target.value })}
                  className="flex-1 italic text-gray-700 border-none outline-none"
                  placeholder="By Author Name"
                />
                <input
                  type="text"
                  value={content.date}
                  onChange={(e) => setContent({ ...content, date: e.target.value })}
                  className="text-gray-500 border-none outline-none"
                  placeholder="Date"
                />
              </div>
            </div>

            {/* TipTap Editor */}
            <EditorContent editor={editor} />
          </div>
        )}

        {viewMode === 'markdown' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <pre className="font-mono text-sm whitespace-pre-wrap">{toMarkdown()}</pre>
          </div>
        )}

        {viewMode === 'html' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <textarea
              value={exportHTML()}
              className="w-full h-[600px] font-mono text-sm p-4 border border-gray-300 rounded"
              readOnly
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <article style={{ fontFamily: 'Georgia, serif' }}>
              <h1 className="text-4xl font-bold mb-2">{content.title}</h1>
              {content.subtitle && <h2 className="text-2xl text-gray-600 mb-4">{content.subtitle}</h2>}
              <p className="italic mb-2">{content.byline}</p>
              <p className="text-gray-500 mb-6">{content.date}</p>
              <hr className="mb-6" />
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
              />
            </article>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">✨ TipTap Features</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Built on ProseMirror (same foundation as NYT's Oak editor)</li>
            <li>• Full undo/redo history</li>
            <li>• Structured document model</li>
            <li>• Easy to add collaboration with Yjs</li>
            <li>• Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+Z (undo)</li>
            <li>• Extensible with 100+ plugins</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TipTapNewsEditor;

/**
 * UPGRADE PATH: Adding Real-time Collaboration (like Google Docs)
 * 
 * 1. Install Yjs extensions:
 *    npm install @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor yjs y-webrtc
 * 
 * 2. Add to extensions:
 *    import Collaboration from '@tiptap/extension-collaboration'
 *    import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
 *    import * as Y from 'yjs'
 *    import { WebrtcProvider } from 'y-webrtc'
 * 
 *    const ydoc = new Y.Doc()
 *    const provider = new WebrtcProvider('document-name', ydoc)
 * 
 *    extensions: [
 *      ...other extensions,
 *      Collaboration.configure({ document: ydoc }),
 *      CollaborationCursor.configure({ provider })
 *    ]
 * 
 * 3. Now multiple users can edit simultaneously with cursor tracking!
 */
