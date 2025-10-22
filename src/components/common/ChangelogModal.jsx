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
      {/* Modal Overlay with Animation */}
      <div 
        className="modal-overlay" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Beautiful Modal Card */}
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--panel)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            overflow: 'hidden'
          }}
        >
          {/* Elegant Header with Icon */}
          <div 
            style={{
              padding: '24px 28px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'var(--panel-header)'
            }}
          >
            {/* Sparkle Icon */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor"
              style={{ 
                width: '28px', 
                height: '28px', 
                color: 'var(--accentA)',
                flexShrink: 0
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.4rem', 
                fontWeight: 700,
                color: 'var(--ink)',
                lineHeight: 1.2
              }}>
                What's New
              </h2>
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: '0.85rem', 
                color: 'var(--muted)',
                fontWeight: 400
              }}>
                Latest updates and improvements
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                fontSize: '1.25rem',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '0',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                fontWeight: 300
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--accentD)';
                e.target.style.borderColor = 'var(--accentD)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'var(--border)';
                e.target.style.color = 'var(--muted)';
              }}
            >
              ×
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div 
            id="changelogBody"
            style={{
              padding: '28px',
              overflowY: 'auto',
              flex: 1,
              background: 'var(--bg)'
            }}
          >
            {loading && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: 'var(--muted)'
              }}>
                <div style={{
                  display: 'inline-block',
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--accentA)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
                <p style={{ marginTop: '16px' }}>Loading updates...</p>
              </div>
            )}

            {error && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--accentD)',
                background: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid var(--accentD)'
              }}>
                ⚠️ {error}
              </div>
            )}

            {!loading && !error && changelog.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: 'var(--muted)'
              }}>
                <p>No changelog entries found.</p>
              </div>
            )}

            {!loading && !error && changelog.length > 0 && (
              <>
                {changelog.map((entry, index) => (
                  <div 
                    className="log-entry" 
                    key={index}
                    style={{
                      background: 'var(--panel)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: index < changelog.length - 1 ? '16px' : '0',
                      border: '1px solid var(--border)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="log-header" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      <span className="log-version" style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--accentA)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--accentA)'
                        }}></span>
                        Version {entry.version}
                      </span>
                      <span className="log-date" style={{
                        fontSize: '0.85rem',
                        color: 'var(--muted)',
                        fontWeight: 500
                      }}>
                        📅 {formatDate(entry.date)}
                      </span>
                    </div>
                    <ul className="log-changes" style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      fontSize: '0.95rem',
                      color: 'var(--ink)',
                      lineHeight: 1.6
                    }}>
                      {entry.changes && entry.changes.map((change, idx) => (
                        <li key={idx} style={{
                          marginBottom: '8px',
                          paddingLeft: '24px',
                          position: 'relative'
                        }}>
                          <span style={{
                            position: 'absolute',
                            left: 0,
                            top: '6px',
                            color: 'var(--accentA)',
                            fontWeight: 700
                          }}>•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Clean Footer */}
          <div 
            style={{
              padding: '20px 28px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--panel-header)'
            }}
          >
            <button 
              className="btn btn-primary"
              onClick={onClose}
              style={{
                minWidth: '120px'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}