# Complete Investigative Journalism Publishing System

## What I Built for You

A professional-grade news article editor system inspired by enterprise publishers (NYT, WaPo, Guardian) but accessible and free/low-cost for independent journalists. Everything is designed around your investigative work on Nashville accountability.

---

## 🎯 Core Components

### 1. **Enhanced News Editor** (`enhanced-news-editor.jsx`)
The main editing interface with features directly inspired by the enterprise systems in the PDF:

**Key Features:**
- ✅ **WYSIWYG/Markdown/HTML editing** - Switch between modes like Arc XP
- ✅ **A/B headline testing** - NYT tests 29% of articles, you can track variants
- ✅ **Source management** - Track interviews, documents, emails like ProPublica
- ✅ **Document attachments** - Link supporting evidence
- ✅ **Version control** - 50-version history with restore (like NYT's Kafka logging)
- ✅ **Editorial notes** - Team collaboration
- ✅ **SEO metadata** - Meta descriptions, keywords, tags
- ✅ **Status workflow** - Draft → Review → Ready → Published
- ✅ **Export** - HTML, Markdown, JSON

**Perfect for:**
- Your {Rich Text} Substack investigations
- Ground Truth Nashville articles
- Metro Council accountability reports

### 2. **TipTap Editor** (`examples/tiptap-editor.jsx`)
Professional upgrade using ProseMirror (what NYT's Oak uses):

**Benefits:**
- Better structured content (document model vs raw HTML)
- Real undo/redo
- Extensible with 100+ plugins
- **Easy to add collaboration** (Google Docs-style with Yjs)
- More stable across browsers

**When to use:**
- If you need collaborative editing with other journalists
- Want professional-grade editor foundation
- Building for long-term scalability

### 3. **Ghost CMS Integration** (`examples/ghost-integration.js`)
Direct publishing to Ghost (recommended platform from PDF):

**Why Ghost:**
- $29-199/month (vs Arc XP's $50K-3M/year)
- Zero platform fees
- Newsletter + Website + Memberships
- Used by 404 Media, Hell Gate, Platformer, The Lever

**Features:**
- Publish directly from editor
- Schedule posts
- Create drafts with preview URLs
- Upload images
- Newsletter distribution
- Multi-newsletter support

**Perfect for:**
- Publishing Ground Truth Nashville
- Distributing to subscribers
- Building membership base

### 4. **DocumentCloud Integration** (`examples/documentcloud-integration.js`)
For your document-heavy investigative work:

**What It Does:**
- Upload and OCR public records
- AI entity extraction (people, orgs, locations)
- Embed documents in articles
- Annotation and collaboration
- "Bad redactions" detection
- **Used by ProPublica, NYT, WaPo, ICIJ, OCCRP**

**For Your Work:**
- **Nashville OHS investigations** - Upload ARPA fund reports, contracts
- **Wayfair furniture scandal** - Embed procurement documents
- **DePaul contract** - Show $1M paid for $500K work
- **BID compliance failures** - Display Metro Council documents

---

## 🚀 Recommended Stack for You

Based on your work and the PDF research:

### Publishing Platform
**Ghost Pro** ($29-99/month)
- Website + newsletter in one
- SEO optimized
- Membership tools
- API for custom integrations
- Your existing Substack can migrate

### Document Management
**DocumentCloud** (FREE)
- Upload Metro Nashville public records
- Extract entities automatically
- Embed in articles for transparency
- Collaborate with other journalists

### Editor
**Start with:** Enhanced News Editor (included)
**Upgrade to:** TipTap version when you need collaboration

### Research & Analysis
**Google Pinpoint** (FREE for journalists)
- AI document analysis
- Transcription
- Entity extraction across collections

### Secure Communications
**Signal** (FREE)
- For source communications
- End-to-end encrypted
- SecureDrop if you grow ($0 but requires dedicated hardware)

### Analytics
**Plausible or Fathom** ($9-14/month)
- Privacy-focused
- GDPR compliant
- No cookie consent needed

### Total Cost: ~$50-125/month
Compare to Arc XP: $50,000-3,000,000/year

---

## 📋 How to Use This System

### Quick Start (Today)

1. **Use the Enhanced Editor**
   ```bash
   # Add to your React project
   import NewsArticleEditor from './enhanced-news-editor';
   ```

2. **Write Your Article**
   - Add multiple headline variants for testing
   - Track all sources (interviews, documents, FOIAs)
   - Attach documents
   - Add editorial notes
   - Export to HTML/Markdown

3. **Publish**
   - Copy HTML to Substack
   - Or export Markdown for Ghost
   - Or use Ghost API integration

### Upgrade Path (Next Month)

1. **Set up Ghost**
   - Sign up at ghost.org ($29/month)
   - Get Admin API key
   - Configure ghost-integration.js

2. **Set up DocumentCloud**
   - Register at documentcloud.org (FREE)
   - Get credentials
   - Start uploading Nashville documents

3. **Integrate Publishing**
   - Use Ghost integration to publish directly
   - Embed DocumentCloud viewers in articles
   - Track engagement with Ghost analytics

### Advanced Setup (3-6 Months)

1. **Add TipTap Editor**
   ```bash
   npm install @tiptap/react @tiptap/starter-kit
   ```

2. **Enable Collaboration**
   ```bash
   npm install yjs y-webrtc @tiptap/extension-collaboration
   ```

3. **Custom Integrations**
   - Matrix homeserver notifications
   - n8n automation workflows
   - Google Drive sync

---

## 🎓 Feature Mapping: Enterprise → Your Editor

| Enterprise Feature | NYT/WaPo Cost | Your Solution | Cost |
|-------------------|---------------|---------------|------|
| Rich text editor | Oak (custom) | TipTap/Enhanced | $0 |
| A/B headline testing | Built-in | Manual tracking | $0 |
| Version control | Kafka event log | Local history | $0 |
| Document management | Custom | DocumentCloud | $0 |
| Publishing CMS | Scoop/Arc XP | Ghost | $29/mo |
| Newsletter | Integrated | Ghost newsletters | Included |
| Analytics | Custom | Plausible | $9/mo |
| Collaboration | Real-time | TipTap + Yjs | $0 |
| SEO tools | Built-in | Ghost + metadata | Included |
| **TOTAL** | **$50K-3M/year** | **~$50/month** | **99.8% savings** |

---

## 💡 Specific Use Cases for Your Work

### 1. Nashville OHS Investigation

**Article Setup:**
```javascript
{
  title: "How Nashville's Office of Homeless Services Spent $3.2M Without Approval",
  headlines: [
    "Nashville Homeless Office's $3.2M Unauthorized Spending Revealed",
    "Metro Council Investigation Uncovers Homeless Services Financial Irregularities",
    "Inside Nashville's Missing $3.2 Million in Homeless Funding"
  ],
  sources: [
    {
      name: "April Calvin (OHS Director)",
      type: "Public Record",
      url: "link-to-council-records",
      notes: "Created unauthorized 'Non-Traditional Rapid Rehousing' program"
    },
    {
      name: "Metro Council Audit",
      type: "Document",
      url: "documentcloud-link",
      notes: "Shows $3.2M in questioned expenditures"
    }
  ],
  documents: [
    {
      name: "ARPA Fund Allocation Report",
      url: "documentcloud-embed",
      notes: "Pages 12-15 show unauthorized transfers"
    }
  ]
}
```

**DocumentCloud:**
- Upload ARPA reports
- Highlight unauthorized spending sections
- Extract entity mentions (Calvin, agencies, contractors)
- Embed interactive viewer in article

### 2. Wayfair Furniture Scandal

**Source Tracking:**
```javascript
sources: [
  {
    name: "Metro Procurement Records",
    type: "Public Record via FOIA",
    url: "...",
    notes: "$86,000 Wayfair purchase without contract"
  },
  {
    name: "Metro Legal Department",
    type: "Email Correspondence",
    notes: "Confirmed lack of proper procurement process"
  }
]
```

### 3. BID Compliance Investigation

**Multi-Document Article:**
- Upload all BID annual reports to DocumentCloud
- Create project: "Nashville BID Compliance Failures"
- Extract entity data to cross-reference
- Embed key pages showing $40M+ unauthorized spending
- Track all Metro Council members contacted for comment

---

## 🔧 Technical Setup Guide

### Prerequisites
```bash
node >= 16.0.0
npm >= 8.0.0
```

### Installation
```bash
# Create new React project (if needed)
npx create-react-app nashville-news-editor
cd nashville-news-editor

# Install dependencies
npm install lucide-react
npm install axios  # For API calls

# Install Tailwind (for styling)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Add Components
```bash
# Copy provided files
cp enhanced-news-editor.jsx src/
cp examples/ghost-integration.js src/integrations/
cp examples/documentcloud-integration.js src/integrations/

# Optional: TipTap upgrade
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link \
            @tiptap/extension-image @tiptap/extension-placeholder
cp examples/tiptap-editor.jsx src/
```

### Environment Variables
```bash
# Create .env file
echo "REACT_APP_GHOST_URL=https://your-site.ghost.io" >> .env
echo "REACT_APP_GHOST_KEY=your_admin_api_key" >> .env
echo "REACT_APP_DOCUMENTCLOUD_USER=your@email.com" >> .env
echo "REACT_APP_DOCUMENTCLOUD_PASSWORD=your_password" >> .env
```

### Run
```bash
npm start
```

---

## 📚 Open Source Libraries Reference

All libraries mentioned in `package.json`:

### Essential (Start Here)
- **React** - UI framework
- **Lucide React** - Icons
- **Marked.js** - Markdown parsing
- **DOMPurify** - Security (sanitize HTML)

### Professional Upgrade
- **TipTap** - Rich text editor (NYT-style)
- **Yjs** - Collaboration
- **PouchDB** - Offline storage

### Publishing
- **@tryghost/admin-api** - Ghost integration
- **Axios** - HTTP requests

### Document Handling
- **PDF.js** - PDF viewing
- **Tesseract.js** - OCR
- **Mammoth** - Word docs

---

## 🎯 Next Steps

### Week 1: Test the Editor
1. Load `enhanced-news-editor.jsx` in browser
2. Write a test article about a recent investigation
3. Export to HTML and Markdown
4. Review source tracking features

### Week 2: Set Up Ghost
1. Sign up for Ghost Pro trial
2. Get API credentials
3. Test `ghost-integration.js`
4. Publish test article

### Week 3: DocumentCloud
1. Create DocumentCloud account
2. Upload 5 key Nashville documents
3. Test entity extraction
4. Embed one document in test article

### Week 4: Go Live
1. Migrate existing content
2. Set up custom domain
3. Configure newsletter
4. Launch!

---

## 📖 Resources

**Documentation:**
- Ghost API: https://ghost.org/docs/admin-api/
- DocumentCloud: https://www.documentcloud.org/help/api
- TipTap: https://tiptap.dev/docs
- Yjs Collaboration: https://docs.yjs.dev/

**Examples:**
- 404 Media (Ghost): https://www.404media.co/
- The Lever (Ghost): https://www.levernews.com/
- ProPublica (DocumentCloud): https://www.propublica.org/

**Support:**
- Ghost Community: https://forum.ghost.org/
- DocumentCloud Support: support@documentcloud.org

---

## 💭 Why This Approach Works for You

1. **Low Cost**: ~$50/month vs enterprise $50K+/year
2. **No Lock-in**: All open source, export anytime
3. **Professional**: Same patterns as NYT, WaPo, Guardian
4. **Investigative-First**: Source tracking, document management
5. **Scalable**: Start simple, add features as needed
6. **Transparent**: Open source, community-supported
7. **Privacy-Focused**: Own your data, GDPR compliant

---

## 🤝 Integration with Your Existing Work

### Substack Migration
- Export Substack posts to Markdown
- Import to Ghost via API
- Maintain subscriber list
- Better control, lower fees (Ghost 0% vs Substack 10%)

### Matrix Homeserver
- Ghost webhooks → Matrix notifications
- Document uploads → Matrix alerts
- New subscribers → Matrix room

### n8n Workflows
- Auto-post to social media
- Email notifications for new docs
- Sync with Google Drive
- Generate weekly summaries

---

## ✨ What Makes This Different

**Enterprise Systems:**
- Expensive ($50K-3M/year)
- Complex setup (months)
- Vendor lock-in
- Overkill for solo/small teams

**This System:**
- Affordable ($0-50/month)
- Quick setup (hours to days)
- Open source, no lock-in
- Right-sized for independent journalism
- **Same core capabilities**

The PDF conclusion was right: *"What major outlets spent millions building is now accessible for thousands, or even free. The constraint is no longer technology but the journalism itself."*

You now have the technology. Go do the journalism. 🔥

---

## 📞 Questions?

This system is designed to be self-service, but here are some hypothetical scenarios:

**Q: Can I use this offline?**
A: Yes! Add PouchDB for local storage, sync when online.

**Q: How do I collaborate with other journalists?**
A: Use TipTap + Yjs for Google Docs-style editing.

**Q: What about photo management?**
A: Ghost handles this, or integrate Cloudinary for advanced features.

**Q: Can I self-host everything?**
A: Absolutely! Ghost is open source, DocumentCloud has self-host option.

**Q: How do I handle sensitive documents?**
A: DocumentCloud supports private documents, or use SecureDrop for submissions.

---

Built with care for independent investigative journalism. 
Based on research from "News Publishing Systems: From Enterprise to Independent"
