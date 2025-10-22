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
  
  console.log('🔵 Step 1: Password update started');

  // Validation
  if (!newPassword || !confirmPassword) {
    showStatus('Please fill out both new password fields.', true);
    return;
  }
  
  if (newPassword.length < 6) {
    showStatus('New password must be at least 6 characters long.', true);
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showStatus('New passwords do not match.', true);
    return;
  }

  console.log('🔵 Step 2: Validation passed, setting isUpdating to true');
  setIsUpdating(true);

  try {
    // Get fresh session first
    console.log('🔵 Step 3A: Getting current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('🔵 Step 3B: Session retrieved', { hasSession: !!session, sessionError });
    
    if (sessionError || !session) {
      throw new Error('Could not get current session. Please log in again.');
    }

    console.log('🔵 Step 3C: Calling supabase.auth.updateUser...');
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    console.log('🔵 Step 4: Response received', { data, error });

    if (error) {
      console.error('❌ Supabase returned error:', error);
      throw error;
    }

    console.log('🔵 Step 5: Password updated successfully!');
    
    window.showMainStatus('Password updated successfully! Logging out in 2 seconds...');
    
    // Clear fields
    setNewPassword('');
    setConfirmPassword('');
    setIsUpdating(false);

    console.log('🔵 Step 6: Starting 2-second timeout before logout');
    setTimeout(async () => {
      console.log('🔵 Step 7: Signing out...');
      await supabase.auth.signOut();
      console.log('🔵 Step 8: Sign out complete');
    }, 2000);

  } catch (error) {
    console.error('❌ Password update error:', error);
    window.showMainStatus(`Error: ${error.message}`, true);
    setIsUpdating(false);
  }
};
  return (
    <section id="account-settings" className="app-panel" style={{ display: 'block' }}>
      <div className="card pad" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="section-title">Change Your Password</div>
        <p style={{ color: 'var(--muted)', marginTop: '-10px', marginBottom: '20px' }}>
          Enter your new password below. For security, you will be logged out after a successful password change.
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