// src/components/common/StatusBar.jsx
import { useState, useEffect } from 'react';

export default function StatusBar() {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Global function that any component can call
    window.showMainStatus = (msg, error = false) => {
      setMessage(msg);
      setIsError(error);
      setIsVisible(true);

      // Auto-hide after 2.5 seconds (matching original)
      setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    };

    // Cleanup
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