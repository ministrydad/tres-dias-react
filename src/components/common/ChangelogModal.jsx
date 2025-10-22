// src/components/common/ChangelogModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

export default function ChangelogModal({ isOpen, onClose }) {
  const [changelog, setChangelog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadChangelog();
    }
  }, [isOpen]);

  const loadChangelog = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase
        .from('changelog')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Secondary sort by version number if dates are the same
        data.sort((a, b) => {
          if (a.date === b.date) {
            return b.version.localeCompare(a.version, undefined, { numeric: true });
          }
          return 0;
        });
        
        setChangelog(data);
      } else {
        setChangelog([]);
      }
    } catch (err) {
      console.error('Failed to load changelog:', err);
      setError('Failed to load changelog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="modal-overlay" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        {/* Modal Content */}
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--panel)',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border)'
          }}
        >
          {/* Modal Header */}
          <div 
            className="modal-header"
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              Changelog & Updates
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'background-color 0.2s, color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--border)';
                e.target.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'var(--muted)';
              }}
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div 
            id="changelogBody"
            style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1
            }}
          >
            {loading && (
              <p style={{ color: 'var(--muted)' }}>Loading changelog...</p>
            )}

            {error && (
              <p className="error-message" style={{ color: 'var(--accentD)' }}>
                {error}
              </p>
            )}

            {!loading && !error && changelog.length === 0 && (
              <p style={{ color: 'var(--muted)' }}>No changelog entries found.</p>
            )}

            {!loading && !error && changelog.length > 0 && (
              <>
                {changelog.map((entry, index) => (
                  <div className="log-entry" key={index}>
                    <div className="log-header">
                      <span className="log-version">Version {entry.version}</span>
                      <span className="log-date">{formatDate(entry.date)}</span>
                    </div>
                    <ul className="log-changes">
                      {entry.changes && entry.changes.map((change, idx) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div 
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <button 
              className="btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}