// SkeletonLoader.jsx - Logo-centered spinner with rooster colors
// Professional loading indicator that matches the brand

export default function SkeletonLoader() {
  return (
    <div className="card pad">
      <div className="skeleton-loader-container">
        <div className="spinner-wrapper">
          {/* Use the actual rooster logo image - BIGGER */}
          <img 
            src="/rooster_head_v1.svg" 
            alt="Loading" 
            className="rooster-logo"
            width="64"
            height="64"
          />
          
          {/* Colored Spinner Ring - BIGGER */}
          <svg className="spinner-ring" width="110" height="110" viewBox="0 0 110 110">
            <circle 
              cx="55" 
              cy="55" 
              r="50" 
              fill="none" 
              stroke="url(#roosterGradient)" 
              strokeWidth="5" 
              strokeLinecap="round"
              strokeDasharray="235 79"
            />
            <defs>
              <linearGradient id="roosterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E74C3C" />
                <stop offset="50%" stopColor="#F39C12" />
                <stop offset="100%" stopColor="#E67E22" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <p className="loading-text">Loading directory...</p>
      </div>

      <style jsx>{`
        .skeleton-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 60px 20px;
        }

        .spinner-wrapper {
          position: relative;
          width: 110px;
          height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .rooster-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .spinner-ring {
          position: absolute;
          top: 0;
          left: 0;
          animation: rotate 1.5s linear infinite;
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          font-size: 1rem;
          font-weight: 600;
          color: var(--muted);
          margin: 0;
          animation: pulse-text 2s ease-in-out infinite;
        }

        @keyframes pulse-text {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}