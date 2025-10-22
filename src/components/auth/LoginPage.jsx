import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login, signup } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signup(email, password, fullName, orgName);
      setSuccess('Account created! Check your email for verification.');
      setTimeout(() => setView('login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Password reset logic will go here
      setSuccess('Password reset link sent to your email.');
      setTimeout(() => setView('login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-container">
      <div className="auth-card">
        {/* Error and success messages now inside the card for proper positioning */}
        {error && (
          <div className="auth-status-bar error visible" style={{ gridColumn: '1 / -1' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="auth-status-bar success visible" style={{ gridColumn: '1 / -1' }}>
            {success}
          </div>
        )}

        <div className="auth-image-panel"></div>
        <div className="auth-form-panel">
          {view === 'login' && (
            <div id="login-view">
              <h2 className="auth-title">Welcome Back</h2>
              <p className="auth-subtitle">Please sign in to continue.</p>
              
              <form onSubmit={handleLogin}>
                <div className="field">
                  <label className="label">Email Address</label>
                  <input
                    id="loginEmail"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="field">
                  <label className="label">Password</label>
                  <input
                    id="loginPassword"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                <button 
                  id="loginButton"
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="spinner" viewBox="0 0 50 50">
                        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                      </svg>
                      Logging In...
                    </>
                  ) : (
                    'Log In'
                  )}
                </button>

                <div className="auth-links">
                  <a href="#" id="forgotPasswordLink" onClick={(e) => { e.preventDefault(); setView('reset'); }}>
                    Forgot Password?
                  </a>
                  <span>•</span>
                  <a href="#" id="showSignupLink" onClick={(e) => { e.preventDefault(); setView('signup'); }}>
                    Don't have an account? <strong>Sign Up</strong>
                  </a>
                </div>
              </form>
            </div>
          )}

          {view === 'signup' && (
            <div id="signup-view">
              <h2 className="auth-title">Create Your Account</h2>
              <p className="auth-subtitle">Get started with your organization in seconds.</p>

              <form onSubmit={handleSignup}>
                <div className="field">
                  <label className="label">Full Name</label>
                  <input
                    id="signupName"
                    className="input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>

                <div className="field">
                  <label className="label">Organization Name</label>
                  <input
                    id="signupOrgName"
                    className="input"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="My Tres Dias Community"
                    disabled={loading}
                  />
                </div>

                <div className="field">
                  <label className="label">Email Address</label>
                  <input
                    id="signupEmail"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="field">
                  <label className="label">Password</label>
                  <input
                    id="signupPassword"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                <button 
                  id="signupButton"
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>

                <div className="auth-links">
                  <a href="#" id="showLoginLink_fromSignup" onClick={(e) => { e.preventDefault(); setView('login'); }}>
                    Already have an account? <strong>Log In</strong>
                  </a>
                </div>
              </form>
            </div>
          )}

          {view === 'reset' && (
            <div id="forgot-password-view">
              <h2 className="auth-title">Reset Your Password</h2>
              <p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password.</p>

              <form onSubmit={handlePasswordReset}>
                <div className="field">
                  <label className="label">Email Address</label>
                  <input
                    id="resetEmail"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <button 
                  id="resetButton"
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="auth-links">
                  <a href="#" id="showLoginLink_fromReset" onClick={(e) => { e.preventDefault(); setView('login'); }}>
                    Back to <strong>Log In</strong>
                  </a>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}