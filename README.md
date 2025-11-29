# Enhanced News Article Editor

A professional-grade article editor built with React, implementing patterns from enterprise news publishing systems like The New York Times, Washington Post, and The Guardian.

## Features Inspired by Enterprise News Systems

### Core Publishing (NYT Scoop, Arc XP, Guardian Composer)

**Multi-Format Editing**
- **WYSIWYG Editor** - Visual editing like NYT's Oak editor
- **Markdown Mode** - Direct markdown editing for technical writers
- **HTML Mode** - Full source code access for advanced customization
- Real-time sync between all three modes

**Article Structure**
- Title with A/B testing variants (like NYT's headline optimization)
- Subtitle support
- Byline and date management
- Rich text formatting with toolbar
- Professional typography optimized for readability

### Headline A/B Testing (NYT Pattern)

The New York Times tests ~29% of articles with up to 8 different headlines, showing variants for ~30 minutes before selecting winners. Our editor supports:

- Multiple headline variants
- Click-through rate tracking fields
- Easy headline switching
- Export all variants for testing

### Source Management (Investigative Journalism)

Inspired by ProPublica, Washington Post, and ICIJ workflows:

- **Source Tracking**: Name, type, URL, notes
- **Date Attribution**: When sources were added
- **Source Types**: Interviews, Documents, Emails, Public Records, etc.
- **Inline Notes**: Context for each source
- **Export with Sources**: Sources appear in exported HTML/Markdown

### Document Handling (DocumentCloud Pattern)

Following the DocumentCloud model used by 70+ major newsrooms:

- Attach documents to articles
- URL/file path tracking
- Document annotations
- Organized document library per article

### Version Control & History (Git-like Pattern)

Similar to NYT's Kafka-based logging and version control:

- **Auto-save**: Every 60 seconds
- **Manual Save**: Explicit save points
- **Version History**: Last 50 versions retained
- **Restore**: One-click restore to any previous version
- **Action Logging**: Who changed what and when

### Editorial Workflow (Industry Standard)

Following the draft → review → ready → published pattern:

- **Status Tracking**: Draft, In Review, Ready, Published
- **Editorial Notes**: Team communication on articles
- **Timestamp Tracking**: When notes were added
- **Multi-user Ready**: Designed for collaborative editing

### Metadata & SEO (Arc XP Pattern)

Professional metadata management:

- **Tags**: Unlimited tagging
- **Categories**: Multi-category support
- **Meta Description**: 160-character limit with counter
- **SEO Keywords**: Multiple keyword support
- **Status Management**: Workflow state tracking

### Export Options (Multi-Channel Publishing)

Following the "Create Once, Publish Everywhere" (COPE) pattern:

- **HTML Export**: Full standalone page with embedded CSS
- **Markdown Export**: Clean markdown with metadata
- **JSON Export**: Complete article data structure
- **Copy to Clipboard**: Quick sharing

## Technical Architecture

### Headless CMS Pattern

The editor separates content from presentation:

```javascript
content = {
  title, subtitle, byline, date,  // Article metadata
  body,                            // Content (HTML)
  metadata: { tags, categories, seo }, // Publishing metadata
  sources: [],                     // Source tracking
  documents: [],                   // Document management
  headlines: [],                   // A/B testing variants
  editorialNotes: [],              // Team collaboration
  status                           // Workflow state
}
```

### Event-Driven Updates

Similar to NYT's Kafka-based architecture:
- All changes trigger state updates
- Version history acts as event log
- Easily replay to any point in time

### Multi-Format Support

Content flows between formats:
```
WYSIWYG ←→ Markdown ←→ HTML
```

## Open Source Libraries Used

While this implementation is built with React and standard web APIs, you can enhance it with:

### Rich Text Editing
- **ProseMirror**: What NYT's Oak editor uses (collaborative editing framework)
- **TipTap**: Built on ProseMirror, easier to implement
- **Draft.js**: Facebook's rich text framework
- **Quill**: Lightweight WYSIWYG

### Markdown Processing
- **Marked.js**: Fast markdown parser
- **Showdown.js**: Markdown to HTML converter
- **Remark**: Markdown processor with plugins

### HTML Sanitization
- **DOMPurify**: Prevent XSS attacks in user-generated HTML

### Document Handling
- **PDF.js**: View and annotate PDFs in-browser
- **Tesseract.js**: OCR for document text extraction

### Version Control
- **Automerge**: CRDT for collaborative editing
- **Yjs**: Real-time collaboration framework

### Storage & Sync
- **PouchDB**: Local-first database with sync
- **Gun.js**: Decentralized database
- **IndexedDB**: Browser storage for offline work

## Lightweight Publishing Alternatives

Based on the PDF research, here are recommended publishing stacks:

### For Small Teams (< 5 people)
**Ghost** ($29-199/month)
- Integrated website + newsletter + memberships
- Zero platform fees (only Stripe)
- Built-in analytics
- ActivityPub for decentralized social

### For Medium Newsrooms (5-20 people)
**Newspack** ($750+/month)
- WordPress-based, news-optimized
- 50+ bundled plugins
- Reader activation tools
- SEO and analytics included

### For Technical Teams
**Self-Hosted Ghost** ($5-20/month hosting)
- Full control, open source
- API-first architecture
- Custom integrations

**Wagtail** (Python/Django)
- StreamField for flexible content blocks
- Used by NASA, NHS
- Free and open source

**Strapi** (JavaScript)
- Headless CMS
- REST and GraphQL APIs
- Customizable admin

**Directus**
- Works with any SQL database
- Free for orgs under $5M revenue
- Real-time collaboration

### Investigative Journalism Stack

**Core Publishing**: Ghost Pro ($29-199/month)
**Document Analysis**: DocumentCloud (free)
- Upload, OCR, analyze documents
- AI entity extraction
- Embeddable viewers
- Used by ProPublica, NYT, WaPo, ICIJ

**Secure Communications**: Signal + Secure Email
- SecureDrop if resources allow (requires dedicated hardware)

**Analytics**: Plausible or Fathom ($9-14/month)
- Privacy-focused
- GDPR compliant
- No cookie consent needed

**Collaboration**: Google Docs + Slack
- Free tier sufficient for small teams

**Research**: Google Pinpoint (free for journalists)
- AI document analysis
- Entity extraction

## Usage

### Quick Start

```bash
# This is a React component
# Add to your React app:

import NewsArticleEditor from './enhanced-news-editor';

function App() {
  return <NewsArticleEditor />;
}
```

### Keyboard Shortcuts (In WYSIWYG Mode)

- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + S` - Save version
- `Ctrl/Cmd + Z` - Undo (browser default)

### Workflow

1. **Draft** - Write your article
2. **Add Sources** - Track all sources with metadata
3. **Attach Documents** - Link supporting documents
4. **Add Tags** - Categorize and tag
5. **SEO Optimization** - Add meta description and keywords
6. **Create Headline Variants** - A/B testing
7. **Editorial Notes** - Team feedback
8. **Review** - Change status to "In Review"
9. **Ready** - Mark as "Ready to Publish"
10. **Export** - Download HTML/Markdown or publish to your CMS

### Version Control

- Auto-saves every 60 seconds
- Click "Save" to create manual save points
- Click "Version History" to view/restore previous versions
- Each version shows who, when, and what changed

### A/B Testing Headlines

1. Click "+ Add headline variant"
2. Enter alternative headline
3. Select which one is currently active (radio button)
4. After testing, record click-through rates
5. Export shows all variants for analysis

### Source Management

1. Click "Sources" button
2. Click "+" to add source
3. Enter: Name, Type (Interview/Document/etc), URL, Notes
4. Sources appear in exported HTML/Markdown
5. Delete with trash icon

### Export Formats

**HTML**
- Full standalone page
- Embedded CSS for professional styling
- Includes all metadata, sources
- Ready to publish anywhere

**Markdown**
- Clean, portable format
- Includes frontmatter-style metadata
- Sources in footnote section
- Compatible with static site generators

**JSON**
- Complete data structure
- For API integration
- Preserves all metadata
- Easy to import elsewhere

## Advanced Features

### Custom Styling

The HTML export includes embedded CSS. Customize by editing the `getFullDocument('html')` function:

```javascript
<style>
  body {
    font-family: Your-Font-Here;
    // ... customize styles
  }
</style>
```

### Integration with Ghost API

```javascript
// Export article data
const articleData = {
  title: content.title,
  html: content.body,
  tags: content.metadata.tags,
  // ... other fields
};

// POST to Ghost API
fetch('https://your-ghost-site.com/ghost/api/v3/admin/posts/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Ghost YOUR_API_KEY'
  },
  body: JSON.stringify({ posts: [articleData] })
});
```

### Integration with WordPress

```javascript
// Export to WordPress REST API
fetch('https://your-wordpress-site.com/wp-json/wp/v2/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    title: content.title,
    content: content.body,
    tags: content.metadata.tags.map(tag => tag.id),
    status: content.status === 'published' ? 'publish' : 'draft'
  })
});
```

## Comparison: Enterprise vs. This Editor

| Feature | NYT Scoop | WaPo Arc XP | This Editor |
|---------|-----------|-------------|-------------|
| Cost | Custom ($$$) | $50K-3M/year | Free (open source) |
| Rich Text Editor | Oak (ProseMirror) | Composer | contentEditable |
| Version Control | Kafka event log | Built-in | Local history |
| A/B Testing | 8 variants, 30min | Built-in | Manual tracking |
| Markdown Support | No | Limited | Full support |
| Source Tracking | Custom | Limited | Built-in |
| Multi-format Export | API-driven | Arc XP only | HTML/MD/JSON |
| Setup Time | Months | Weeks | Minutes |
| Technical Skill | High | Medium | Low |

## Future Enhancements

To reach enterprise level, consider adding:

1. **Real-time Collaboration** (Yjs or Automerge)
2. **Image Upload/Management** (Cloudinary, ImageKit)
3. **PDF Generation** (jsPDF or server-side)
4. **Analytics Integration** (Plausible, Fathom)
5. **API Publishing** (Ghost, WordPress, custom CMS)
6. **Spell Check** (LanguageTool API)
7. **Fact Checking** (Google Fact Check API)
8. **Auto-save to Cloud** (Firebase, Supabase)
9. **Multi-user Editing** (WebRTC, Socket.io)
10. **Mobile App** (React Native version)

## License

MIT - Build whatever you need for your newsroom!

## Credits

Inspired by the incredible engineering teams at:
- The New York Times (Scoop, Oak)
- The Washington Post (Arc XP)
- The Guardian (Open-source publishing stack)
- ProPublica (Investigative journalism tools)
- DocumentCloud (MuckRock)
- Ghost Foundation
- WordPress/Newspack

---

**"What major outlets spent millions building is now accessible for thousands, or even free. The constraint is no longer technology but the journalism itself."**

— From "News Publishing Systems: From Enterprise to Independent"
