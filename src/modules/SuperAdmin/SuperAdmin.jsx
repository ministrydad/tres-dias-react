import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '', visible: false });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, created_at, billing_status, trial_expires_at, memberships(role, profiles(full_name, email))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }

  function getStatusText(org) {
    const status = org.billing_status || 'trial';
    const trialExpires = org.trial_expires_at ? new Date(org.trial_expires_at) : null;
    const now = new Date();

    if (status === 'active') return 'Active';
    if (status === 'waived') return 'Waived';
    
    // Trial
    if (trialExpires && trialExpires > now) return 'In Trial';
    return 'Trial Expired';
  }

  function handleManageClick(org) {
    setSelectedOrg(org);
    setShowPanel(true);
    setFeedback({ message: '', type: '', visible: false });
  }

  function closePanel() {
    setShowPanel(false);
    setSelectedOrg(null);
    setFeedback({ message: '', type: '', visible: false });
  }

  async function handleStatusChange(newStatus) {
    if (!selectedOrg) return;
    
    setUpdating(true);
    setFeedback({ message: '', type: '', visible: false });

    try {
      let updatePayload = { billing_status: newStatus };

      if (newStatus === 'trial') {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        updatePayload.trial_expires_at = expiryDate.toISOString();
      } else {
        updatePayload.trial_expires_at = null;
      }

      const { error } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', selectedOrg.id);

      if (error) throw error;

      setFeedback({ 
        message: 'Status Updated!', 
        type: 'success', 
        visible: true 
      });

      // Refresh data and update selected org
      await loadOrganizations();
      const updatedOrg = organizations.find(o => o.id === selectedOrg.id);
      if (updatedOrg) setSelectedOrg(updatedOrg);

    } catch (error) {
      console.error('Failed to update org status:', error.message);
      setFeedback({ 
        message: 'Error: Update failed. RLS policy may be preventing this.', 
        type: 'error', 
        visible: true 
      });
    } finally {
      setUpdating(false);
    }
  }

  async function handleExtendTrial() {
    if (!selectedOrg) return;

    setUpdating(true);
    setFeedback({ message: 'Extending trial...', type: '', visible: true });

    try {
      const currentExpiry = selectedOrg.trial_expires_at ? new Date(selectedOrg.trial_expires_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      
      const newExpiryDate = new Date(baseDate);
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);

      const { error } = await supabase
        .from('organizations')
        .update({ trial_expires_at: newExpiryDate.toISOString() })
        .eq('id', selectedOrg.id);

      if (error) throw error;

      setFeedback({ 
        message: 'Trial extended by 7 days!', 
        type: 'success', 
        visible: true 
      });

      // Refresh data and update selected org
      await loadOrganizations();
      const updatedOrg = organizations.find(o => o.id === selectedOrg.id);
      if (updatedOrg) setSelectedOrg(updatedOrg);

    } catch (error) {
      console.error('Failed to extend trial:', error.message);
      setFeedback({ 
        message: `Error: ${error.message}`, 
        type: 'error', 
        visible: true 
      });
    } finally {
      setUpdating(false);
    }
  }

  function handleImpersonate() {
    alert('Impersonation requires a backend Edge Function and is not yet implemented.');
  }

  function handleDeleteOrg() {
    alert('Deleting an organization requires a backend Edge Function and is not yet implemented.');
  }

  const trialExpires = selectedOrg?.trial_expires_at 
    ? new Date(selectedOrg.trial_expires_at).toLocaleDateString() 
    : 'N/A';

  return (
    <section id="super-admin-app" className="app-panel" style={{ display: 'block' }}>
      {/* Split-Screen Container */}
      <div style={{ 
        display: 'flex', 
        gap: '16px',
        alignItems: 'flex-start'
      }}>
        {/* LEFT: Organizations Table */}
        <div 
          className="card pad"
          style={{ 
            width: showPanel ? '58%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
          <div className="section-title">Organization Management</div>
          <p style={{ color: 'var(--muted)', marginTop: '-10px', marginBottom: '20px' }}>
            A list of all customer organizations currently using the Application Hub.
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th style={{ width: '150px' }}>Owner</th>
                  <th style={{ width: '120px' }}>Users</th>
                  <th style={{ width: '120px' }}>Signed Up</th>
                  <th style={{ width: '150px' }}>Billing Status</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody id="organizationsTbody">
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                      Loading organizations...
                    </td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                      No organizations found.
                    </td>
                  </tr>
                ) : (
                  organizations.map(org => {
                    const ownerMembership = org.memberships?.find(m => m.role === 'owner');
                    const ownerName = ownerMembership?.profiles?.full_name || 'N/A';
                    const userCount = org.memberships?.length || 0;
                    const status = org.billing_status || 'trial';
                    const statusText = getStatusText(org);

                    return (
                      <tr 
                        key={org.id}
                        style={{
                          backgroundColor: selectedOrg?.id === org.id ? 'rgba(40, 167, 69, 0.08)' : 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td><strong>{org.name}</strong></td>
                        <td>{ownerName}</td>
                        <td>{userCount}</td>
                        <td>{new Date(org.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge-admin ${status}`}>
                            {statusText}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-small btn-primary"
                            onClick={() => handleManageClick(org)}
                            style={{
                              backgroundColor: selectedOrg?.id === org.id ? 'var(--accentA)' : undefined
                            }}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Management Panel (slides in when active) */}
        {showPanel && selectedOrg && (
          <div 
            className="card pad"
            style={{
              width: '40%',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid var(--accentB)'
            }}>
              <h3 style={{ margin: 0, color: 'var(--accentB)', fontSize: '1.1rem' }}>
                Manage: {selectedOrg.name}
              </h3>
              <button 
                className="btn btn-small"
                onClick={closePanel}
                style={{ 
                  padding: '4px 12px',
                  fontSize: '0.9rem'
                }}
              >
                Close ✕
              </button>
            </div>

            {/* Account Status */}
            <div className="section-title" style={{ marginTop: 0 }}>Account Status</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '-10px', marginBottom: '20px' }}>
              Update the billing status for this organization. Changes are applied immediately.
            </p>
            <div id="orgStatusButtons" className="grid grid-3">
              <button 
                className="btn btn-primary" 
                onClick={() => handleStatusChange('active')}
                disabled={updating}
              >
                {updating ? (
                  <>
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Set to Active'
                )}
              </button>
              <button 
                className="btn btn-info" 
                onClick={() => handleStatusChange('waived')}
                disabled={updating}
              >
                Set to Waived
              </button>
              <button 
                className="btn btn-warning" 
                onClick={() => handleStatusChange('trial')}
                disabled={updating}
              >
                Start 30-Day Trial
              </button>
            </div>
            <div 
              id="org-status-feedback" 
              style={{ 
                textAlign: 'center', 
                marginTop: '20px', 
                fontWeight: 700, 
                opacity: feedback.visible ? 1 : 0, 
                transition: 'opacity 0.3s',
                color: feedback.type === 'success' ? 'var(--accentA)' : 
                       feedback.type === 'error' ? 'var(--accentD)' : 'var(--muted)'
              }}
            >
              {feedback.message}
            </div>

            {/* Usage Statistics */}
            <div className="section-title">Usage Statistics</div>
            <div className="grid grid-2">
              <div className="field">
                <label className="label">Total Users</label>
                <div id="orgModalUserCount" style={{ fontWeight: 600 }}>
                  {selectedOrg.memberships?.length || 0} users
                </div>
              </div>
              <div className="field">
                <label className="label">Last Activity</label>
                <div id="orgModalLastActivity" style={{ fontWeight: 600 }}>
                  N/A (Requires DB trigger)
                </div>
              </div>
            </div>

            {/* Billing */}
            <div className="section-title">Billing</div>
            <div className="grid grid-2">
              <div className="field">
                <label className="label">Trial Expires</label>
                <div id="orgModalTrialExpires" style={{ fontWeight: 600 }}>
                  {trialExpires}
                </div>
              </div>
              <div>
                <button 
                  className="btn" 
                  onClick={handleExtendTrial}
                  disabled={updating}
                  style={{ width: '100%' }}
                >
                  + 7 Days to Trial
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="section-title" style={{ borderColor: 'var(--accentD)' }}>Danger Zone</div>
            <div className="grid grid-2" style={{ alignItems: 'center' }}>
              <div>
                <button 
                  className="btn" 
                  onClick={handleImpersonate}
                  style={{ width: '100%' }}
                >
                  Login as User
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '6px' }}>
                  Temporarily log in as this organization's owner to troubleshoot issues.
                </p>
              </div>
              <div>
                <button 
                  className="btn btn-danger" 
                  onClick={handleDeleteOrg}
                  style={{ width: '100%' }}
                >
                  Delete Organization
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '6px' }}>
                  This will permanently delete the organization and all associated data.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}