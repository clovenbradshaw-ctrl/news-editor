/**
 * DocumentCloud Integration for Investigative Journalism
 * 
 * DocumentCloud is FREE and used by:
 * - ProPublica
 * - The New York Times
 * - Washington Post
 * - ICIJ (International Consortium of Investigative Journalists)
 * - OCCRP (Organized Crime and Corruption Reporting Project)
 * 
 * Features:
 * - Upload and OCR documents
 * - AI-powered entity extraction
 * - "Bad redactions" detection
 * - Embeddable document viewers
 * - Annotation and collaboration
 * - Secure document publishing
 * 
 * Sign up: https://www.documentcloud.org/
 * API Docs: https://www.documentcloud.org/help/api
 */

import axios from 'axios';

const DOCUMENTCLOUD_API = 'https://api.www.documentcloud.org/api';

/**
 * Initialize DocumentCloud client
 */
class DocumentCloudClient {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.token = null;
  }

  /**
   * Authenticate with DocumentCloud
   */
  async authenticate() {
    try {
      const response = await axios.post(`${DOCUMENTCLOUD_API}/auth/`, {
        username: this.username,
        password: this.password
      });
      this.token = response.data.token;
      console.log('✅ Authenticated with DocumentCloud');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    return {
      'Authorization': `Token ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Upload a document
   */
  async uploadDocument(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', metadata.title || file.name);
      if (metadata.description) formData.append('description', metadata.description);
      if (metadata.source) formData.append('source', metadata.source);
      if (metadata.projectId) formData.append('project', metadata.projectId);
      if (metadata.access) formData.append('access', metadata.access); // 'public', 'private', 'organization'

      const response = await axios.post(`${DOCUMENTCLOUD_API}/documents/`, formData, {
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Document uploaded:', response.data.id);
      return {
        success: true,
        id: response.data.id,
        url: `https://www.documentcloud.org/documents/${response.data.id}`,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Upload failed:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query, filters = {}) {
    try {
      const params = {
        q: query,
        ...filters
      };

      const response = await axios.get(`${DOCUMENTCLOUD_API}/documents/search/`, {
        params,
        headers: this.getHeaders()
      });

      return {
        success: true,
        results: response.data.results,
        count: response.data.count
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId) {
    try {
      const response = await axios.get(`${DOCUMENTCLOUD_API}/documents/${documentId}/`, {
        headers: this.getHeaders()
      });

      return { success: true, document: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add annotation to document
   */
  async addAnnotation(documentId, annotation) {
    try {
      const response = await axios.post(
        `${DOCUMENTCLOUD_API}/documents/${documentId}/notes/`,
        {
          title: annotation.title,
          content: annotation.content,
          page_number: annotation.page,
          x1: annotation.x1,
          x2: annotation.x2,
          y1: annotation.y1,
          y2: annotation.y2,
          access: annotation.access || 'private'
        },
        { headers: this.getHeaders() }
      );

      return { success: true, annotation: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get document entities (AI extraction)
   */
  async getEntities(documentId) {
    try {
      const response = await axios.get(
        `${DOCUMENTCLOUD_API}/documents/${documentId}/entities/`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        entities: response.data,
        people: response.data.filter(e => e.kind === 'person'),
        organizations: response.data.filter(e => e.kind === 'organization'),
        locations: response.data.filter(e => e.kind === 'location')
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create project (document collection)
   */
  async createProject(name, description = '') {
    try {
      const response = await axios.post(
        `${DOCUMENTCLOUD_API}/projects/`,
        { title: name, description },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        projectId: response.data.id,
        project: response.data
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add document to project
   */
  async addToProject(documentId, projectId) {
    try {
      await axios.patch(
        `${DOCUMENTCLOUD_API}/documents/${documentId}/`,
        { project: projectId },
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate embeddable viewer
   */
  getEmbedCode(documentId, options = {}) {
    const baseUrl = `https://embed.documentcloud.org/documents/${documentId}`;
    const params = new URLSearchParams({
      embed: 'true',
      responsive: options.responsive !== false,
      sidebar: options.sidebar !== false,
      ...options.params
    });

    const embedUrl = `${baseUrl}?${params}`;
    
    return {
      url: embedUrl,
      iframe: `<iframe src="${embedUrl}" width="${options.width || '100%'}" height="${options.height || '600'}" style="border: 1px solid #aaa;"></iframe>`,
      responsive: `<div style="position: relative; padding-bottom: 129.4%;">
  <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 1px solid #aaa;"></iframe>
</div>`
    };
  }
}

/**
 * React Component: DocumentCloud Document Manager
 */
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, Eye, Link2, Download, Tag } from 'lucide-react';

export function DocumentManager({ articleId, onDocumentAdded }) {
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Initialize client
  useEffect(() => {
    const dc = new DocumentCloudClient(
      process.env.REACT_APP_DOCUMENTCLOUD_USER,
      process.env.REACT_APP_DOCUMENTCLOUD_PASSWORD
    );
    dc.authenticate().then(success => {
      if (success) setClient(dc);
    });
  }, []);

  // Upload document
  const handleUpload = async (file) => {
    if (!client) return;
    
    setUploading(true);
    const result = await client.uploadDocument(file, {
      title: file.name,
      description: `Document for article ${articleId}`,
      access: 'private' // or 'public', 'organization'
    });
    
    if (result.success) {
      setDocuments([...documents, result.data]);
      if (onDocumentAdded) onDocumentAdded(result.data);
    }
    setUploading(false);
  };

  // Search documents
  const handleSearch = async () => {
    if (!client || !searchQuery) return;
    
    const result = await client.searchDocuments(searchQuery);
    if (result.success) {
      setDocuments(result.results);
    }
  };

  // View document details
  const viewDocument = async (docId) => {
    const result = await client.getDocument(docId);
    if (result.success) {
      const entities = await client.getEntities(docId);
      setSelectedDoc({
        ...result.document,
        entities: entities.success ? entities : null
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText size={20} />
        DocumentCloud Manager
      </h3>

      {/* Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Document
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            id="doc-upload"
            disabled={uploading || !client}
          />
          <label htmlFor="doc-upload" className="cursor-pointer">
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, TXT</p>
          </label>
        </div>
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Documents
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by title, content, entities..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            disabled={!client}
          />
          <button
            onClick={handleSearch}
            disabled={!client}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => viewDocument(doc.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{doc.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                {doc.source && (
                  <p className="text-xs text-gray-500 mt-1">Source: {doc.source}</p>
                )}
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://www.documentcloud.org/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye size={18} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Document Details Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">{selectedDoc.title}</h3>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Embed Code */}
              <div>
                <h4 className="font-semibold mb-2">Embed in Article</h4>
                <textarea
                  value={client.getEmbedCode(selectedDoc.id, { responsive: true }).iframe}
                  readOnly
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-sm font-mono"
                  rows="3"
                />
              </div>

              {/* Entities */}
              {selectedDoc.entities && (
                <div>
                  <h4 className="font-semibold mb-2">Extracted Entities</h4>
                  <div className="space-y-2">
                    {selectedDoc.entities.people?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">People:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedDoc.entities.people.map((person, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {person.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedDoc.entities.organizations?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Organizations:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedDoc.entities.organizations.map((org, i) => (
                            <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {org.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={`https://www.documentcloud.org/documents/${selectedDoc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Eye size={16} />
                  View on DocumentCloud
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      client.getEmbedCode(selectedDoc.id, { responsive: true }).iframe
                    );
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  <Link2 size={16} />
                  Copy Embed Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!client && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Connecting to DocumentCloud...
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Insert DocumentCloud embed into article
 */
export function insertDocumentEmbed(editor, documentId, options = {}) {
  const embed = new DocumentCloudClient().getEmbedCode(documentId, options);
  
  if (editor && typeof editor.chain === 'function') {
    // TipTap editor
    editor.chain().focus().insertContent(embed.iframe).run();
  } else if (editor && editor.innerHTML !== undefined) {
    // contentEditable
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const div = document.createElement('div');
    div.innerHTML = embed.responsive;
    range.insertNode(div);
  }
  
  return embed;
}

/**
 * Example: Investigative workflow
 */
export async function investigativeWorkflow() {
  // Initialize client
  const client = new DocumentCloudClient(
    process.env.DOCUMENTCLOUD_USER,
    process.env.DOCUMENTCLOUD_PASSWORD
  );
  await client.authenticate();

  // Step 1: Create project for investigation
  const project = await client.createProject(
    'Nashville Homeless Services Investigation',
    'Documents related to OHS financial irregularities'
  );

  // Step 2: Upload documents
  const docs = [
    // Upload public records
    await client.uploadDocument(file1, {
      title: 'ARPA Fund Allocation Report',
      source: 'Metro Nashville FOIA Request',
      projectId: project.projectId,
      access: 'public'
    }),
    
    // Upload contract documents
    await client.uploadDocument(file2, {
      title: 'DePaul Contract Agreement',
      source: 'Public Contract Database',
      projectId: project.projectId,
      access: 'public'
    })
  ];

  // Step 3: Extract entities for cross-referencing
  const entities = await client.getEntities(docs[0].id);
  console.log('People mentioned:', entities.people);
  console.log('Organizations:', entities.organizations);

  // Step 4: Add annotations for key findings
  await client.addAnnotation(docs[0].id, {
    title: 'Unauthorized Spending',
    content: 'This section shows $3.2M in questioned expenditures',
    page: 5,
    x1: 100, y1: 200, x2: 400, y2: 250
  });

  // Step 5: Generate embeds for article
  const embeds = docs.map(doc => client.getEmbedCode(doc.id, { responsive: true }));

  return { project, docs, entities, embeds };
}

/**
 * SETUP GUIDE
 * 
 * 1. Sign up at https://www.documentcloud.org/
 * 2. Verify your email
 * 3. Get your credentials
 * 4. Add to .env:
 *    REACT_APP_DOCUMENTCLOUD_USER=your-email@example.com
 *    REACT_APP_DOCUMENTCLOUD_PASSWORD=your-password
 * 
 * 5. Start uploading documents!
 */

export default DocumentCloudClient;
