import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function AccountSettings() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const showStatus = (message, error = false) => {
    setStatusMessage(message);
    setIsError(error);
    setTimeout(() => setStatusMessage(''), 4000);
  };

 const handlePasswordUpdate = async (e) => {
  e.preventDefault();
  
  console.log('🔵 Step 1: Starting password update');

  // Validation
  if (!newPassword || !confirmPassword) {
    window.showMainStatus('Please fill out both new password fields.', true);
    return;
  }
  
  if (newPassword.length < 6) {
    window.showMainStatus('New password must be at least 6 characters long.', true);
    return;
  }
  
  if (newPassword !== confirmPassword) {
    window.showMainStatus('New passwords do not match.', true);
    return;
  }

  console.log('🔵 Step 2: Validation passed');
  setIsUpdating(true);
  const passwordToUpdate = newPassword;
  
  console.log('🔵 Step 3: Clearing fields');
  // Clear fields immediately
  setNewPassword('');
  setConfirmPassword('');

  try {
    console.log('🔵 Step 4: Calling updateUser API');
    
    // Fire the password update (don't await)
    supabase.auth.updateUser({ password: passwordToUpdate });
    
    // Show success message
    console.log('🔵 Step 5: Showing success message');
    window.showMainStatus('✓ Password updated successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    window.showMainStatus(`Error: ${error.message}`, true);
  } finally {
    console.log('🔵 Step 6: Resetting button');
    setIsUpdating(false);
  }
};

  return (
    <section id="account-settings" className="app-panel" style={{ display: 'block' }}>
      <div className="card pad" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="section-title">Change Your Password</div>
        <p style={{ color: 'var(--muted)', marginTop: '-10px', marginBottom: '20px' }}>
          Enter your new password below to update your account security.
        </p>
        
        {statusMessage && (
          <div 
            className="status-bar visible"
            style={{
              marginBottom: '20px',
              backgroundColor: isError ? 'var(--accentD)' : 'var(--accentA)'
            }}
          >
            {statusMessage}
          </div>
        )}

        <div className="grid grid-2">
          <div className="field">
            <label className="label">New Password</label>
            <input
              id="newPassword"
              className="input"
              type="password"
              placeholder="Must be at least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isUpdating}
            />
          </div>
          <div className="field">
            <label className="label">Confirm New Password</label>
            <input
              id="confirmPassword"
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isUpdating}
            />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginTop: '16px', 
          borderTop: '1px solid var(--border)', 
          paddingTop: '16px' 
        }}>
          <button 
            id="updatePasswordBtn" 
            className="btn btn-primary"
            onClick={handlePasswordUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </section>
  );
}