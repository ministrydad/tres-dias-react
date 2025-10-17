// src/components/common/StatusBar.jsx
import { useState, useEffect } from 'react';

/**
 * Unified Status Bar System
 * Handles both main app status bar and modal status bars
 */

// Main App Status Bar Component
export function MainStatusBar() {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Global function for main app status bar
    window.showMainStatus = (msg, error = false) => {
      setMessage(msg);
      setIsError(error);
      setIsVisible(true);

      setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    };

    return () => {
      delete window.showMainStatus;
    };
  }, []);

  return (
    <div 
      id="mainStatusBar" 
      className={`${isVisible ? 'visible' : ''} ${isError ? 'error' : ''}`}
    >
      {message}
    </div>
  );
}

// Modal Status Bar Component (the clean one you like from Weekend History)
export function ModalStatusBar({ id }) {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Create a global function for this specific modal status bar
    const functionName = `showModalStatus_${id}`;
    
    window[functionName] = (msg, error = false) => {
      setMessage(msg);
      setIsError(error);
      setIsVisible(true);

      setTimeout(() => {
        setIsVisible(false);
      }, 3000); // 3 seconds for modal (slightly longer than main)
    };

    return () => {
      delete window[functionName];
    };
  }, [id]);

  if (!isVisible) return null;

  return (
    <div 
      className={`status-bar ${isVisible ? 'visible' : ''} ${isError ? 'error' : ''}`}
    >
      {message}
    </div>
  );
}

// Generic helper function that any component can import and use
export function showModalStatus(modalId, message, isError = false) {
  const functionName = `showModalStatus_${modalId}`;
  if (window[functionName]) {
    window[functionName](message, isError);
  } else {
    console.warn(`Modal status bar "${modalId}" not found. Make sure ModalStatusBar is rendered with id="${modalId}"`);
  }
}