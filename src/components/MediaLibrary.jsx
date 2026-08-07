import React, { useState, useEffect } from 'react';

function MediaLibrary({ onSelectImage, onClose, token, isEmbedded = false }) {
  const [mediaList, setMediaList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch media library items
  const fetchMedia = async (search = '') => {
    setLoading(true);
    try {
      const url = `/api/media${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMediaList(data || []);
      }
    } catch (err) {
      console.error('Failed to load media library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia(searchTerm);
  }, [searchTerm]);

  // Handle Drag-and-Drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadMultipleFiles(Array.from(files));
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadMultipleFiles(Array.from(files));
    }
  };

  // Upload single file helper
  const uploadSingleFile = (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 5MB limit.`);
        return resolve(null);
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        try {
          const response = await fetch('/api/media?action=upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ fileName: file.name, base64Data })
          });
          if (response.ok) {
            const result = await response.json();
            resolve(result);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Error uploading file:', err);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Upload multiple files
  const uploadMultipleFiles = async (fileList) => {
    setUploading(true);
    setUploadProgress({ current: 0, total: fileList.length });
    let lastUploaded = null;

    for (let i = 0; i < fileList.length; i++) {
      setUploadProgress({ current: i + 1, total: fileList.length });
      const res = await uploadSingleFile(fileList[i]);
      if (res && res.success) {
        lastUploaded = res;
      }
    }

    setUploading(false);
    fetchMedia(searchTerm);
    if (lastUploaded) {
      setSelectedItem(lastUploaded);
    }
  };

  // Delete media item
  const handleDeleteItem = async (e, item) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete "${item.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/media', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ id: item.id })
      });

      if (response.ok) {
        if (selectedItem?.id === item.id) {
          setSelectedItem(null);
        }
        fetchMedia(searchTerm);
      } else {
        alert('Delete failed.');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const renderContent = () => (
    <div className="media-library-body">
      {/* Left panel: Upload and grid */}
      <div className="media-library-main">
        
        {/* Drag and drop upload zone */}
        <div 
          className={`media-upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="loader-inline">
              Uploading {uploadProgress.current} of {uploadProgress.total} file(s)...
            </div>
          ) : (
            <div>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-color)', marginBottom: '8px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p style={{ margin: '6px 0', fontWeight: '500' }}>
                Drag & Drop files here, or <label className="file-label-link" style={{ color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}>browse<input type="file" multiple onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} /></label>
              </p>
              <span className="file-size-limit" style={{ fontSize: '0.82rem', color: '#718096' }}>Supports multi-file upload (JPG, PNG, WEBP, SVG - Max 5MB)</span>
            </div>
          )}
        </div>

        {/* Search filter bar */}
        <div className="media-search-bar" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
          <input
            type="text"
            placeholder="Search assets by file name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '0.85rem', color: '#718096', whiteSpace: 'nowrap' }}>
            {mediaList.length} asset{mediaList.length !== 1 ? 's' : ''} total
          </span>
        </div>

        {/* Grid */}
        <div className="media-grid-container">
          {loading ? (
            <div className="media-library-empty">Loading items...</div>
          ) : mediaList.length > 0 ? (
            <div className="media-grid">
              {mediaList.map((item) => (
                <div 
                  key={item.id} 
                  className={`media-grid-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="media-item-preview-wrap">
                    <img src={item.url} alt={item.name} />
                  </div>
                  <span className="media-item-name" title={item.name}>{item.name}</span>
                  <button 
                    className="media-item-delete-btn" 
                    onClick={(e) => handleDeleteItem(e, item)}
                    title="Delete asset"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="media-library-empty">No media items found. Upload some above!</div>
          )}
        </div>

      </div>

      {/* Right panel: Details and Action */}
      <div className="media-library-sidebar">
        <h4>Asset Details</h4>
        {selectedItem ? (
          <div className="media-details-view">
            <div className="media-details-preview">
              <img src={selectedItem.url} alt={selectedItem.name} />
            </div>
            <div className="media-details-meta">
              <div className="meta-row">
                <span className="meta-label">Name:</span>
                <span className="meta-val" title={selectedItem.name}>{selectedItem.name}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Size:</span>
                <span className="meta-val">{selectedItem.size ? (selectedItem.size / 1024).toFixed(1) + ' KB' : 'N/A'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Mime:</span>
                <span className="meta-val">{selectedItem.mime_type || 'image/png'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">URL:</span>
                <input 
                  type="text" 
                  readOnly 
                  value={selectedItem.url} 
                  className="form-input" 
                  style={{ fontSize: '0.8rem', padding: '6px' }}
                  onClick={(e) => e.target.select()}
                />
              </div>
            </div>

            <div className="media-sidebar-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
              {onSelectImage ? (
                <button 
                  onClick={() => onSelectImage(selectedItem.url)} 
                  className="btn btn-accent" 
                  style={{ width: '100%', padding: '10px' }}
                >
                  Use Selected Image
                </button>
              ) : (
                <button 
                  onClick={() => handleCopyUrl(selectedItem.url)} 
                  className="btn btn-accent" 
                  style={{ width: '100%', padding: '10px' }}
                >
                  {copySuccess ? '✓ URL Copied!' : 'Copy Asset URL'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="media-library-empty-details">
            Select an asset from the grid to view details, copy URL, or use in forms.
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="media-library-standalone-panel">
        <div className="admin-panel-header">
          <h2>Media Library</h2>
          <p style={{ color: '#718096', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Manage images, documents, and media assets for Intellect Circle.
          </p>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="media-library-modal-overlay" onClick={onClose}>
      <div className="media-library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="media-library-header">
          <h3>Media Library</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}

export default MediaLibrary;

