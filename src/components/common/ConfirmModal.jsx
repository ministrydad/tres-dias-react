// src/components/common/ConfirmModal.jsx
import { useState, useEffect } from 'react';

/**
 * Beautiful, Modern Confirmation Modal
 * Clean design matching the app's aesthetic
 * 
 * Usage:
 *   window.showConfirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this? This cannot be undone.',
 *     confirmText: 'Delete',
 *     cancelText: 'Cancel',
 *     isDangerous: true,
 *     onConfirm: () => { // do something }
 *   });
 */

export default function ConfirmModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDangerous: false,
    onConfirm: null
  });

  useEffect(() => {
    // Global function to show confirmation modal
    window.showConfirm = (options) => {
      setConfig({
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDangerous: options.isDangerous || false,
        onConfirm: options.onConfirm || null
      });
      setIsVisible(true);
    };

    return () => {
      delete window.showConfirm;
    };
  }, []);

  const handleConfirm = () => {
    if (config.onConfirm) {
      config.onConfirm();
    }
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  // Close on background click
  const handleBackgroundClick = (e) => {
    if (e.target.classList.contains('confirm-modal-overlay')) {
      handleCancel();
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="confirm-modal-overlay" 
      onClick={handleBackgroundClick}
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
        zIndex: 10000,
        animation: 'fadeIn 0.15s ease-out'
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          width: '90%',
          maxWidth: '480px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--panel-header)'
          }}
        >
          {config.isDangerous && (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              style={{ 
                width: '28px', 
                height: '28px', 
                color: 'var(--accentC)',
                strokeWidth: '2.5px',
                flexShrink: 0
              }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" 
              />
            </svg>
          )}
          <span style={{ 
            fontSize: '1.2rem', 
            fontWeight: 700,
            color: 'var(--ink)'
          }}>
            {config.title}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', minHeight: '80px' }}>
          <p style={{ 
            margin: 0, 
            lineHeight: '1.6',
            fontSize: '1rem',
            color: 'var(--muted)'
          }}>
            {config.message}
          </p>
        </div>

        {/* Footer */}
        <div 
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: 'var(--panel-header)'
          }}
        >
          <button 
            className="btn" 
            onClick={handleCancel}
            style={{
              minWidth: '100px'
            }}
          >
            {config.cancelText}
          </button>
          <button 
            className={`btn ${config.isDangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            style={{
              minWidth: '100px'
            }}
          >
            {config.confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}