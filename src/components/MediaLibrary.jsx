import React, { useState, useEffect } from 'react';

function MediaLibrary({ onSelectImage, onClose, token }) {
  const [mediaList, setMediaList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dragOver, setDragOver] = useState(false);

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
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  // Upload file API call
  const uploadFile = async (file) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds the 2MB limit.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ fileName: file.name, base64Data })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Re-fetch list
            fetchMedia(searchTerm);
            // Highlight uploaded item
            setSelectedItem(result);
          }
        } else {
          alert('Upload failed. Check console.');
        }
      } catch (err) {
        console.error('Error uploading file:', err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="media-library-modal-overlay" onClick={onClose}>
      <div className="media-library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="media-library-header">
          <h3>Media Library</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

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
                <div className="loader-inline">Uploading image...</div>
              ) : (
                <div>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-color)', marginBottom: '8px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p>Drag & Drop an image here, or <label className="file-label-link">browse<input type="file" onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} /></label></p>
                  <span className="file-size-limit">Supported formats: JPG, PNG, WEBP (Max 2MB)</span>
                </div>
              )}
            </div>

            {/* Search filter */}
            <div className="media-search-bar" style={{ marginTop: '20px' }}>
              <input
                type="text"
                placeholder="Search images by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
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
                    <span className="meta-val">{(selectedItem.size / 1024).toFixed(1)} KB</span>
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

                <div className="media-sidebar-actions">
                  <button 
                    onClick={() => onSelectImage(selectedItem.url)} 
                    className="btn btn-accent" 
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Use Selected Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="media-library-empty-details">
                Select an image from the library grid to view details and use it.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaLibrary;
