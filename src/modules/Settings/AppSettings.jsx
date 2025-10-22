// src/modules/Settings/AppSettings.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

// Position definitions from original (same as Secretariat)
const POSITIONS = [
  { key: 'chairman', name: 'Chairman', type: 'single', defaultTerm: 3 },
  { key: 'spiritual_director', name: 'Spiritual Director', type: 'couple', defaultTerm: 3 },
  { key: 'mens_leader', name: 'Mens Leader', type: 'single', defaultTerm: 3 },
  { key: 'womens_leader', name: 'Womens Leader', type: 'single', defaultTerm: 3 },
  { key: 'secretary', name: 'Secretary', type: 'single', defaultTerm: 3 },
  { key: 'treasurer', name: 'Treasurer', type: 'single', defaultTerm: 3 },
  { key: 'pre_weekend_couple', name: 'Pre-Weekend Couple', type: 'couple', defaultTerm: 3 },
  { key: 'fourth_day_couple', name: 'Fourth Day', type: 'couple', defaultTerm: 3 },
  { key: 'database_website', name: 'Database/Website', type: 'single', defaultTerm: 3 },
  { key: 'weekend_couple', name: 'Weekend Couple', type: 'couple', defaultTerm: 3 },
  { key: 'palanca_couple', name: 'Palanca Couple', type: 'couple', defaultTerm: 3 },
  { key: 'newsletter', name: 'Newsletter', type: 'single', defaultTerm: 3 }
];

const BUDGET_KEYS = [
  'Rector', 'Head', 'AsstHead', 'Prayer', 'Kitchen', 'Dorm',
  'Chapel', 'Table', 'Worship', 'Palanca', 'Storeroom'
];

export default function AppSettings() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // General settings
  const [communityName, setCommunityName] = useState('');
  const [weekendFee, setWeekendFee] = useState('');
  const [teamFee, setTeamFee] = useState('');
  const [sponsorFee, setSponsorFee] = useState('');
  
  // Budget settings
  const [budgetSettings, setBudgetSettings] = useState({});
  
  // Secretariat roster data
  const [rosterData, setRosterData] = useState({});
  const [allMembers, setAllMembers] = useState([]);
  
  // User management
  const [users, setUsers] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [inviteFormData, setInviteFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    permissions: {
      'team-viewer-app': true,
      'team-book': true,
      'meeting-check-in-app': true,
      'candidate-registration': true,
      'secretariat-app': true,
      'app-settings': true
    }
  });
  
  // Subscription status state
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial');
  const [trialExpiresAt, setTrialExpiresAt] = useState(null);
  const [subscriptionText, setSubscriptionText] = useState('Loading subscription status...');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (orgId && !hasLoaded) {
      setHasLoaded(true);
      loadAllData();
    }
  }, [orgId, hasLoaded]);

  async function loadAllData() {
    try {
      console.log('Loading App Settings data for org:', orgId);
      
      const [settingsResult, budgetResult, rosterResult, menResult, womenResult, usersResult, orgResult] = await Promise.all([
        supabase.from('app_settings').select('*').eq('org_id', orgId).single(),
        supabase.from('app_budgets').select('*').eq('id', 1).single(),
        supabase.from('secretariat_roster').select('*').eq('org_id', orgId),
        supabase.from('men_raw').select('PescadoreKey, First, Last, Preferred, Email').eq('org_id', orgId),
        supabase.from('women_raw').select('PescadoreKey, First, Last, Preferred, Email').eq('org_id', orgId),
        supabase.from('memberships').select('role, permissions, profiles(user_id, full_name, email)').eq('org_id', orgId),
        supabase.from('organizations').select('billing_status, trial_expires_at').eq('id', orgId).single()
      ]);

      // Load general settings
      if (settingsResult.data) {
        setCommunityName(settingsResult.data.community_name || '');
        setWeekendFee(settingsResult.data.weekend_fee || '');
        setTeamFee(settingsResult.data.team_fee || '');
        setSponsorFee(settingsResult.data.sponsor_fee || '');
      }

      // Load budget settings
      if (budgetResult.data) {
        const budgets = {};
        BUDGET_KEYS.forEach(key => {
          const dbKey = `budget_${key.toLowerCase()}`;
          budgets[key] = budgetResult.data[dbKey] || '';
        });
        setBudgetSettings(budgets);
      }

      // Load secretariat roster
      const roster = (rosterResult.data || []).reduce((acc, item) => {
        acc[item.position_key] = item;
        return acc;
      }, {});
      setRosterData(roster);

      // Load all members (combine men + women, filter out those already users)
      const existingUserEmails = new Set(
        (usersResult.data || [])
          .map(member => member.profiles?.email)
          .filter(Boolean)
      );
      
      const allPeople = [...(menResult.data || []), ...(womenResult.data || [])]
        .filter(person => person.Email && !existingUserEmails.has(person.Email))
        .sort((a, b) => (a.Last || '').localeCompare(b.Last || ''));
      
      setAllMembers(allPeople);

      // Load users from memberships table
      if (usersResult.data && usersResult.data.length > 0) {
        const formattedUsers = usersResult.data.map(member => ({
          id: member.profiles?.user_id,
          email: member.profiles?.email,
          full_name: member.profiles?.full_name,
          role: member.role,
          permissions: member.permissions
        }));
        setUsers(formattedUsers);
      } else {
        setUsers([]);
      }

      // Load subscription status from organizations table
      if (orgResult.data) {
        const status = orgResult.data.billing_status || 'trial';
        const trialExpires = orgResult.data.trial_expires_at ? new Date(orgResult.data.trial_expires_at) : null;
        const now = new Date();
        
        setSubscriptionStatus(status);
        setTrialExpiresAt(trialExpires);
        
        let statusText = '';
        if (status === 'active') {
          statusText = 'Your subscription is active.';
        } else if (status === 'waived') {
          statusText = 'Your subscription is provided free of charge.';
        } else {
          if (trialExpires && trialExpires > now) {
            const daysLeft = Math.ceil((trialExpires - now) / (1000 * 60 * 60 * 24));
            statusText = `Your trial expires in ${daysLeft} day(s).`;
          } else {
            statusText = 'Your trial has expired. Please subscribe to continue.';
          }
        }
        setSubscriptionText(statusText);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading app settings:', error);
      setLoading(false);
    }
  }

  async function saveGeneralSettings() {
    try {
      const payload = {
        org_id: orgId,
        community_name: communityName,
        weekend_fee: parseFloat(weekendFee) || 0,
        team_fee: parseFloat(teamFee) || 0,
        sponsor_fee: parseFloat(sponsorFee) || 0
      };

      const { error } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'org_id' });

      if (error) throw error;
      
      window.showMainStatus('General settings saved successfully.');
    } catch (error) {
      console.error('Error saving general settings:', error);
      window.showMainStatus(`Failed to save settings: ${error.message}`, true);
    }
  }

  async function saveBudgetSettings() {
    try {
      const payload = { id: 1 };
      
      BUDGET_KEYS.forEach(key => {
        const dbKey = `budget_${key.toLowerCase()}`;
        payload[dbKey] = parseFloat(budgetSettings[key]) || 0;
      });

      const { error } = await supabase
        .from('app_budgets')
        .upsert(payload);

      if (error) throw error;
      
      window.showMainStatus('Budget settings saved successfully.');
    } catch (error) {
      console.error('Error saving budget settings:', error);
      window.showMainStatus(`Failed to save budget settings: ${error.message}`, true);
    }
  }

  async function saveTermLengths() {
    const updates = POSITIONS.map(pos => {
      const input = document.getElementById(`term-${pos.key}`);
      const termLength = input ? parseInt(input.value, 10) : pos.defaultTerm;
      return {
        position_key: pos.key,
        term_length_years: isNaN(termLength) ? pos.defaultTerm : termLength,
        org_id: orgId
      };
    });

    try {
      const { error } = await supabase
        .from('secretariat_roster')
        .upsert(updates, { onConflict: 'position_key,org_id' });

      if (error) throw error;
      
      window.showMainStatus('Term lengths have been saved successfully.');
      setHasLoaded(false);
      await loadAllData();
    } catch (error) {
      console.error('Error saving term lengths:', error);
      window.showMainStatus(`Failed to save term lengths: ${error.message}`, true);
    }
  }

  function handleBudgetChange(key, value) {
    setBudgetSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }

  function openInviteForm() {
    setShowInviteForm(true);
    setSelectedPerson(null);
    setInviteFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'User',
      permissions: {
        'team-viewer-app': true,
        'team-book': true,
        'meeting-check-in-app': true,
        'candidate-registration': true,
        'secretariat-app': true,
        'app-settings': true
      }
    });
  }

  function closeInviteForm() {
    setShowInviteForm(false);
    setSelectedPerson(null);
  }

  function handlePersonSelection(e) {
    const personKey = e.target.value;
    if (!personKey) {
      setSelectedPerson(null);
      setInviteFormData(prev => ({
        ...prev,
        firstName: '',
        lastName: '',
        email: ''
      }));
      return;
    }

    const person = allMembers.find(p => p.PescadoreKey === personKey);
    if (person) {
      setSelectedPerson(person);
      setInviteFormData(prev => ({
        ...prev,
        firstName: person.Preferred || person.First || '',
        lastName: person.Last || '',
        email: person.Email || ''
      }));
    }
  }

  function handlePermissionToggle(permKey) {
    setInviteFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey]
      }
    }));
  }

 async function handleInviteUser() {
  if (!inviteFormData.email || !inviteFormData.firstName || !inviteFormData.lastName) {
    window.showMainStatus('Please fill in all required fields.', true);
    return;
  }

  setInviteLoading(true);  // ⬅️ ADD THIS
  
  try {
    // ✅ Get the current session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error("Could not get user session.");
    if (!session) throw new Error("User not authenticated.");

    // ✅ Call Edge Function with Authorization header
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: inviteFormData.email,
        full_name: `${inviteFormData.firstName} ${inviteFormData.lastName}`,
        role: inviteFormData.role.toLowerCase(),
        permissions: inviteFormData.permissions,
        org_id: orgId
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (error) {
  console.error('🔴 Full Edge Function Error:', error);
  console.error('🔴 Error message:', error.message);
  console.error('🔴 Error context:', error.context);
  console.error('🔴 Error stringified:', JSON.stringify(error, null, 2));
  throw error;
}

    window.showMainStatus('Invitation sent successfully! User will receive an email to set up their account.');
    closeInviteForm();
    setHasLoaded(false);
    await loadAllData();
  } catch (error) {
    console.error('Error inviting user:', error);
    window.showMainStatus(`Failed to invite user: ${error.message}`, true);
  } finally {
    setInviteLoading(false);
  }
}

  if (loading) {
    return (
      <section id="app-settings" className="app-panel">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
          Loading settings...
        </div>
      </section>
    );
  }

  return (
    <section id="app-settings" className="app-panel" style={{ display: 'block' }}>
      {/* General Configuration */}
      <div className="card pad" style={{ marginBottom: '16px' }}>
        <div className="section-title">General Configuration</div>
        <div className="grid grid-4">
          <div className="field">
            <label className="label">Community Name</label>
            <input 
              id="communityName" 
              className="input settings-input" 
              placeholder="Placeholder Inc."
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Weekend Fee ($)</label>
            <input 
              id="weekendFee" 
              className="input settings-input" 
              type="number" 
              min="0" 
              placeholder="265.00"
              value={weekendFee}
              onChange={(e) => setWeekendFee(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Team Fee ($)</label>
            <input 
              id="teamFee" 
              className="input settings-input" 
              type="number" 
              min="0" 
              placeholder="30.00"
              value={teamFee}
              onChange={(e) => setTeamFee(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Sponsor Fee ($)</label>
            <input 
              id="sponsorFee" 
              className="input settings-input" 
              type="number" 
              min="0" 
              placeholder="50.00"
              value={sponsorFee}
              onChange={(e) => setSponsorFee(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button className="btn btn-primary" onClick={saveGeneralSettings}>
            Save General Settings
          </button>
        </div>
      </div>

      {/* Budget Configuration */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div className="section-title">Budget Configuration</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '-10px', marginBottom: '20px' }}>
          Set the default budget amounts for each team role. These will be used in the MCI Budget screen.
        </p>
        <div className="grid grid-4" id="budgetSettingsContainer">
          {BUDGET_KEYS.map(key => (
            <div key={key} className="field">
              <label className="label">{key} ($)</label>
              <input 
                id={`budget${key}`}
                className="input settings-input" 
                type="number" 
                min="0" 
                step="0.01" 
                placeholder="0.00"
                value={budgetSettings[key] || ''}
                onChange={(e) => handleBudgetChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button className="btn btn-primary" onClick={saveBudgetSettings}>
            Save Budget Settings
          </button>
        </div>
      </div>

      {/* User Management with Sliding Panel */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginTop: '16px' }}>
        <div 
          className="card pad"
          style={{
            width: showInviteForm ? '45%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
          <div className="section-title">User Management</div>
          <div id="user-management-header">
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: '75%', margin: 0 }}>
              Invite new users to your organization and manage their access permissions.
            </p>
            <button 
              id="inviteUserBtn" 
              className="btn btn-primary"
              onClick={openInviteForm}
            >
              Invite New User
            </button>
          </div>
          <div id="user-list-container">
            <table id="user-list-table" className="table">
              <thead>
                <tr>
                  <th>User Email</th>
                  <th style={{ width: '120px' }}>Role</th>
                  <th style={{ width: '200px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody id="user-list-tbody">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.full_name || 'Name not found'}</strong><br />
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {user.email || 'Email not found'}
                        </span>
                      </td>
                      <td>
                        <span className={`role-badge ${(user.role || 'user').toLowerCase()}`}>
                          {user.role || 'USER'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="btn btn-small" onClick={() => console.log('Manage', user.id)}>
                          Manage
                        </button>
                        <button className="btn btn-small btn-danger" onClick={() => console.log('Delete', user.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showInviteForm && (
          <div
            className="card pad"
            style={{
              width: '53%',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div className="section-title">Invite New User</div>
              <button 
                className="btn btn-small"
                onClick={closeInviteForm}
                style={{ padding: '4px 12px', fontSize: '0.9rem' }}
              >
                Close ✕
              </button>
            </div>

            <div className="field">
              <label className="label">Select Person from Directory</label>
              <select 
                className="input"
                value={selectedPerson?.PescadoreKey || ''}
                onChange={handlePersonSelection}
              >
                <option value="">-- Select from directory (optional) --</option>
                {allMembers.map(person => (
                  <option key={person.PescadoreKey} value={person.PescadoreKey}>
                    {person.Last}, {person.Preferred || person.First}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label">First Name *</label>
                <input 
                  className="input"
                  type="text"
                  value={inviteFormData.firstName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  readOnly={!!selectedPerson}
                />
              </div>
              <div className="field">
                <label className="label">Last Name *</label>
                <input 
                  className="input"
                  type="text"
                  value={inviteFormData.lastName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  readOnly={!!selectedPerson}
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label">Email Address *</label>
                <input 
                  className="input"
                  type="email"
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                  readOnly={!!selectedPerson}
                />
              </div>
              <div className="field">
  <label className="label">Role</label>
  <select 
    className="input"
    value={inviteFormData.role}
    onChange={(e) => setInviteFormData(prev => ({ ...prev, role: e.target.value }))}
  >
    <option value="user">User</option>
    <option value="admin">Admin</option>
  </select>
</div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            <div className="field">
              <label className="label">Module Permissions</label>
              <div id="permissions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '20px' }}>
                {[
                  { key: 'team-viewer-app', label: 'Directory' },
                  { key: 'team-book', label: 'Team Book' },
                  { key: 'meeting-check-in-app', label: 'Team Meetings' },
                  { key: 'candidate-registration', label: 'Candidate Registration' },
                  { key: 'secretariat-app', label: 'Secretariat' },
                  { key: 'app-settings', label: 'Settings' }
                ].map(perm => (
                  <div key={perm.key} className="permission-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    padding: '7px 12px',
                    borderRadius: '8px'
                  }}>
                    <label className="label" style={{ margin: 0, flexGrow: 1, fontWeight: 600 }}>
                      {perm.label}
                    </label>
                    <label className="switch" style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '44px',
                      height: '24px'
                    }}>
                      <input 
                        type="checkbox"
                        checked={inviteFormData.permissions[perm.key]}
                        onChange={() => handlePermissionToggle(perm.key)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="slider" style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: inviteFormData.permissions[perm.key] ? 'var(--accentA)' : 'var(--border)',
                        transition: '.4s',
                        borderRadius: '24px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '""',
                          height: '18px',
                          width: '18px',
                          left: '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '.4s',
                          borderRadius: '50%',
                          transform: inviteFormData.permissions[perm.key] ? 'translateX(20px)' : 'translateX(0)'
                        }}></span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)'
            }}>
              <button 
                className="btn" 
                onClick={closeInviteForm}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
  className="btn btn-primary"
  onClick={handleInviteUser}
  disabled={inviteLoading}
  style={{ flex: 1 }}
>
  {inviteLoading ? 'Sending...' : 'Send Invitation'}
</button>
            </div>
          </div>
        )}
      </div>

      {/* Secretariat Configuration */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div className="section-title">Secretariat Configuration</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '-10px', marginBottom: '20px' }}>
          Define term lengths for each board position and manage the current roster assignments.
        </p>
        <div id="secretariat-config-container">
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              className="btn btn-info"
              onClick={() => console.log('Manage roster - navigate to Secretariat')}
            >
              Manage Board Roster
            </button>
            <button 
              className="btn btn-primary"
              onClick={saveTermLengths}
            >
              Save Term Lengths
            </button>
          </div>
          <div id="secretariat-positions-grid">
            {POSITIONS.map(pos => {
              const savedTerm = rosterData[pos.key]?.term_length_years;
              const termValue = savedTerm !== null && savedTerm !== undefined ? savedTerm : pos.defaultTerm;
              
              return (
                <div key={pos.key} className="secretariat-position-item">
                  <span className="position-name">{pos.name}</span>
                  <div className="term-input-group">
                    <input 
                      type="number" 
                      className="input term-input" 
                      id={`term-${pos.key}`} 
                      defaultValue={termValue} 
                      min="1" 
                      max="5"
                    />
                    <label className="label" htmlFor={`term-${pos.key}`} style={{ margin: 0 }}>
                      Years
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div className="section-title">Data Management</div>
        <div className="grid grid-2" id="dataManagementContainer">
          <div className="card pad data-management-card">
            <h4>Meeting Check-In (MCI)</h4>
            <p>Manage all stored check-in data including attendance, payments, and Palanca status.</p>
            <div className="actions">
              <button 
                className="btn btn-small" 
                onClick={() => console.log('Clear MCI view')}
              >
                Clear Current View
              </button>
              <button 
                className="btn btn-danger btn-small" 
                onClick={() => console.log('Delete MCI DB')}
              >
                Clear All Database Records
              </button>
            </div>
          </div>
          <div className="card pad data-management-card">
            <h4>Candidate Registration (CRA)</h4>
            <p>Manage all stored candidate applications. This data is now stored in Supabase.</p>
            <div className="actions">
              <button 
                className="btn btn-small" 
                onClick={() => console.log('Clear CRA form')}
              >
                Clear Current Form
              </button>
              <button 
                className="btn btn-danger btn-small" 
                onClick={() => console.log('Delete CRA DB')}
              >
                Clear All Database Applications
              </button>
            </div>
          </div>
          <div className="card pad data-management-card">
            <h4>Team Viewer</h4>
            <p>Functionality not yet implemented.</p>
            <div className="actions">
              <button className="btn btn-small" disabled>
                Clear View
              </button>
              <button className="btn btn-danger btn-small" disabled>
                Clear Database
              </button>
            </div>
          </div>
          <div className="card pad data-management-card">
            <h4>Team Book</h4>
            <p>Functionality not yet implemented.</p>
            <div className="actions">
              <button className="btn btn-small" disabled>
                Clear View
              </button>
              <button className="btn btn-danger btn-small" disabled>
                Clear Database
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription & Billing */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div className="section-title">Subscription & Billing</div>
        <div className="grid grid-2" style={{ gap: '24px', alignItems: 'start' }}>
          <div>
            <div className="label" style={{ fontSize: '1rem', marginBottom: '12px' }}>Current Plan</div>
            <div id="subscriptionStatusContainer" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span className="label" style={{ margin: 0 }}>Status:</span>
                <span className={`status-badge-admin ${subscriptionStatus}`}>
                  {subscriptionStatus === 'active' ? 'Active' : 
                   subscriptionStatus === 'waived' ? 'Waived' : 
                   (trialExpiresAt && trialExpiresAt > new Date()) ? 'In Trial' : 'Trial Expired'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{subscriptionText}</p>
            </div>
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Team Tools Pro</h3>
                <div>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accentA)' }}>$35</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>/mo</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px', marginBottom: '16px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Billed monthly</p>
              </div>

              <ul style={{ listStyle: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--accentA)', flexShrink: 0 }}>
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                  <span style={{ color: 'var(--ink)' }}>Directory & Team Management</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--accentA)', flexShrink: 0 }}>
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                  <span style={{ color: 'var(--ink)' }}>Candidate Registration</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--accentA)', flexShrink: 0 }}>
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                  <span style={{ color: 'var(--ink)' }}>Meeting Check-In & Budgeting</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--accentA)', flexShrink: 0 }}>
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                  <span style={{ color: 'var(--ink)' }}>Secretariat Dashboard</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--accentA)', flexShrink: 0 }}>
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                  <span style={{ color: 'var(--ink)' }}>Secure Cloud Data Storage</span>
                </li>
              </ul>

              <div id="subscription-action-container" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div id="subscribeBtnContainer">
                  <button 
                    id="subscribeBtn" 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => {
                      if (subscriptionStatus === 'active' || subscriptionStatus === 'waived') {
                        alert('Redirecting to billing management portal...');
                      } else {
                        console.log('Subscribe clicked - Square payment');
                      }
                    }}
                  >
                    {subscriptionStatus === 'active' || subscriptionStatus === 'waived' 
                      ? 'Manage Subscription' 
                      : 'Subscribe Now'}
                  </button>
                  <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--muted)', marginTop: '8px' }}>
                    {subscriptionStatus === 'active' || subscriptionStatus === 'waived'
                      ? 'Manage your billing in your provider portal.'
                      : 'Complete your subscription securely within the app.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="label" style={{ fontSize: '1rem', marginBottom: '12px' }}>Billing History</div>
            <div 
              style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: 'var(--muted)', 
                border: '2px dashed var(--border)', 
                borderRadius: '12px' 
              }}
            >
              Your billing history will appear here once you subscribe.
            </div>
          </div>
        </div>
      </div>

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