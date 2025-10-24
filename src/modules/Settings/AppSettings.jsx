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
    phone: '',  // ✅ ADDED
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
      console.error('Error loading data:', error);
      window.showMainStatus?.('Failed to load settings: ' + error.message, true);
      setLoading(false);
    }
  }

  async function handleSaveGeneralSettings() {
    if (!orgId) {
      window.showMainStatus?.('Organization ID not found', true);
      return;
    }

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          org_id: orgId,
          community_name: communityName,
          weekend_fee: weekendFee,
          team_fee: teamFee,
          sponsor_fee: sponsorFee
        }, {
          onConflict: 'org_id'
        });

      if (error) throw error;
      window.showMainStatus?.('General settings saved successfully', false);
    } catch (error) {
      console.error('Error saving general settings:', error);
      window.showMainStatus?.('Failed to save general settings: ' + error.message, true);
    }
  }

  async function handleSaveBudgets() {
    try {
      const budgetData = { id: 1 };
      BUDGET_KEYS.forEach(key => {
        const dbKey = `budget_${key.toLowerCase()}`;
        budgetData[dbKey] = budgetSettings[key] || '';
      });

      const { error } = await supabase
        .from('app_budgets')
        .upsert(budgetData);

      if (error) throw error;
      window.showMainStatus?.('Budget settings saved successfully', false);
    } catch (error) {
      console.error('Error saving budget settings:', error);
      window.showMainStatus?.('Failed to save budget settings: ' + error.message, true);
    }
  }

  async function handleSaveRoster() {
    if (!orgId) {
      window.showMainStatus?.('Organization ID not found', true);
      return;
    }

    try {
      const rosterEntries = Object.entries(rosterData).map(([key, value]) => ({
        org_id: orgId,
        position_key: key,
        pescadore_key: value.pescadore_key || null,
        spouse_pescadore_key: value.spouse_pescadore_key || null,
        full_name: value.full_name || null,
        spouse_full_name: value.spouse_full_name || null,
        email: value.email || null,
        term_expiry_date: value.term_expiry_date || null
      }));

      const { error } = await supabase
        .from('secretariat_roster')
        .upsert(rosterEntries, {
          onConflict: 'org_id,position_key'
        });

      if (error) throw error;
      window.showMainStatus?.('Secretariat roster saved successfully', false);
    } catch (error) {
      console.error('Error saving roster:', error);
      window.showMainStatus?.('Failed to save roster: ' + error.message, true);
    }
  }

  async function handleInviteUser() {
    // ✅ UPDATED VALIDATION - Now includes phone
    if (!inviteFormData.email || !inviteFormData.firstName || !inviteFormData.lastName || !inviteFormData.phone) {
      window.showMainStatus?.('Please fill in all required fields (including phone number).', true);
      return;
    }

    setInviteLoading(true);
    
    try {
      console.log('🔵 Step 1: Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Could not get user session: ' + sessionError.message);
      }
      
      if (!session) {
        console.error('❌ No session found');
        throw new Error('User not authenticated.');
      }
      
      console.log('✅ Session retrieved');
      console.log('🔵 Step 2: Calling Edge Function...');

      // ✅ UPDATED - Now passes phone to Edge Function
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteFormData.email,
          full_name: `${inviteFormData.firstName} ${inviteFormData.lastName}`,
          phone: inviteFormData.phone,  // ✅ ADDED
          role: inviteFormData.role,
          permissions: inviteFormData.permissions,
          org_id: orgId
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw error;
      }

      console.log('✅ Edge Function response:', data);

      // ✅ UPDATED - Reset form now includes phone
      setInviteFormData({
        firstName: '',
        lastName: '',
        phone: '',  // ✅ ADDED
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
      
      setShowInviteForm(false);
      window.showMainStatus?.('User invited successfully!', false);
      await loadAllData();
    } catch (error) {
      console.error('❌ Error inviting user:', error);
      window.showMainStatus?.('Failed to invite user: ' + error.message, true);
    } finally {
      setInviteLoading(false);
    }
  }

  // ✅ UPDATED - openInviteForm now includes phone
  function openInviteForm() {
    setShowInviteForm(true);
    setSelectedPerson(null);
    setInviteFormData({
      firstName: '',
      lastName: '',
      phone: '',  // ✅ ADDED
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
  }

  function selectPersonForInvite(person) {
    setSelectedPerson(person);
    setInviteFormData(prev => ({
      ...prev,
      firstName: person.First || person.Preferred || '',
      lastName: person.Last || '',
      email: person.Email || ''
    }));
  }

  if (loading) {
    return (
      <section className="app-panel" style={{ display: 'block' }}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--muted)' }}>Loading settings...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="app-panel" style={{ display: 'block' }}>
      {/* General Settings */}
      <div className="card pad">
        <div className="section-title">General Settings</div>
        <div className="grid grid-2">
          <div className="field">
            <label className="label">Community Name</label>
            <input
              type="text"
              className="input"
              placeholder="Enter community name"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Weekend Fee</label>
            <input
              type="text"
              className="input"
              placeholder="$0.00"
              value={weekendFee}
              onChange={(e) => setWeekendFee(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Team Fee</label>
            <input
              type="text"
              className="input"
              placeholder="$0.00"
              value={teamFee}
              onChange={(e) => setTeamFee(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Sponsor Fee</label>
            <input
              type="text"
              className="input"
              placeholder="$0.00"
              value={sponsorFee}
              onChange={(e) => setSponsorFee(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: '24px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveGeneralSettings}
          >
            Save General Settings
          </button>
        </div>
      </div>

      {/* Budget Settings */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div className="section-title">Budget Settings</div>
        <div className="grid grid-3">
          {BUDGET_KEYS.map(key => (
            <div className="field" key={key}>
              <label className="label">{key}</label>
              <input
                type="text"
                className="input"
                placeholder="$0.00"
                value={budgetSettings[key] || ''}
                onChange={(e) => setBudgetSettings(prev => ({
                  ...prev,
                  [key]: e.target.value
                }))}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '24px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveBudgets}
          >
            Save Budget Settings
          </button>
        </div>
      </div>

      {/* Secretariat Roster */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div className="section-title">Secretariat Roster</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {POSITIONS.map(position => (
            <div key={position.key} style={{ 
              padding: '16px', 
              background: 'var(--bg)', 
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                  {position.name}
                </h4>
                <span style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--muted)',
                  background: 'var(--bg-darker)',
                  padding: '4px 12px',
                  borderRadius: '12px'
                }}>
                  {position.type === 'couple' ? 'Couple' : 'Single'}
                </span>
              </div>
              
              <div className="grid grid-2" style={{ gap: '12px' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">{position.type === 'couple' ? 'Primary' : 'Name'}</label>
                  <select
                    className="input"
                    value={rosterData[position.key]?.pescadore_key || ''}
                    onChange={(e) => {
                      const selectedMember = allMembers.find(m => m.PescadoreKey === parseInt(e.target.value));
                      setRosterData(prev => ({
                        ...prev,
                        [position.key]: {
                          ...prev[position.key],
                          pescadore_key: parseInt(e.target.value) || null,
                          full_name: selectedMember ? `${selectedMember.First} ${selectedMember.Last}` : null,
                          email: selectedMember?.Email || null
                        }
                      }));
                    }}
                  >
                    <option value="">Select person...</option>
                    {allMembers.map(member => (
                      <option key={member.PescadoreKey} value={member.PescadoreKey}>
                        {member.Preferred || member.First} {member.Last}
                      </option>
                    ))}
                  </select>
                </div>

                {position.type === 'couple' && (
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label">Spouse</label>
                    <select
                      className="input"
                      value={rosterData[position.key]?.spouse_pescadore_key || ''}
                      onChange={(e) => {
                        const selectedMember = allMembers.find(m => m.PescadoreKey === parseInt(e.target.value));
                        setRosterData(prev => ({
                          ...prev,
                          [position.key]: {
                            ...prev[position.key],
                            spouse_pescadore_key: parseInt(e.target.value) || null,
                            spouse_full_name: selectedMember ? `${selectedMember.First} ${selectedMember.Last}` : null
                          }
                        }));
                      }}
                    >
                      <option value="">Select spouse...</option>
                      {allMembers.map(member => (
                        <option key={member.PescadoreKey} value={member.PescadoreKey}>
                          {member.Preferred || member.First} {member.Last}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Term Expiry</label>
                  <input
                    type="date"
                    className="input"
                    value={rosterData[position.key]?.term_expiry_date || ''}
                    onChange={(e) => setRosterData(prev => ({
                      ...prev,
                      [position.key]: {
                        ...prev[position.key],
                        term_expiry_date: e.target.value
                      }
                    }))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '24px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveRoster}
          >
            Save Roster
          </button>
        </div>
      </div>

      {/* User Management */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-title">User Management</div>
          <button 
            className="btn btn-primary"
            onClick={openInviteForm}
          >
            + Invite User
          </button>
        </div>

        {users.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: 'var(--muted)',
            background: 'var(--bg)',
            borderRadius: '8px'
          }}>
            No users yet. Invite your first user to get started!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Object.entries(user.permissions || {})
                          .filter(([_, value]) => value)
                          .map(([key]) => (
                            <span 
                              key={key}
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                background: 'var(--bg-darker)',
                                borderRadius: '4px',
                                color: 'var(--muted)'
                              }}
                            >
                              {key.replace('-app', '').replace('-', ' ')}
                            </span>
                          ))
                        }
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-small btn-danger"
                        onClick={() => console.log('Delete user:', user.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="modal-overlay" onClick={() => setShowInviteForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0 }}>Invite New User</h2>
              <button 
                className="btn-close"
                onClick={() => setShowInviteForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Select from directory */}
            <div className="field">
              <label className="label">Select from Directory (Optional)</label>
              <select
                className="input"
                value={selectedPerson?.PescadoreKey || ''}
                onChange={(e) => {
                  const person = allMembers.find(m => m.PescadoreKey === parseInt(e.target.value));
                  if (person) selectPersonForInvite(person);
                }}
              >
                <option value="">Choose a person...</option>
                {allMembers.map(member => (
                  <option key={member.PescadoreKey} value={member.PescadoreKey}>
                    {member.Preferred || member.First} {member.Last} ({member.Email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ 
              height: '1px', 
              background: 'var(--border)', 
              margin: '24px 0' 
            }}></div>

            {/* Manual entry */}
            <div className="grid grid-2">
              <div className="field">
                <label className="label">First Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="John"
                  value={inviteFormData.firstName}
                  onChange={(e) => setInviteFormData(prev => ({ 
                    ...prev, 
                    firstName: e.target.value 
                  }))}
                />
              </div>
              <div className="field">
                <label className="label">Last Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Doe"
                  value={inviteFormData.lastName}
                  onChange={(e) => setInviteFormData(prev => ({ 
                    ...prev, 
                    lastName: e.target.value 
                  }))}
                />
              </div>
            </div>

            {/* ✅ ADDED - Phone Number Field */}
            <div className="field">
              <label className="label">Phone Number *</label>
              <input
                type="tel"
                className="input"
                placeholder="5551234567"
                value={inviteFormData.phone}
                onChange={(e) => setInviteFormData(prev => ({ 
                  ...prev, 
                  phone: e.target.value 
                }))}
              />
              <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '4px' }}>
                Digits only - this will be their temporary password
              </p>
            </div>

            <div className="field">
              <label className="label">Email *</label>
              <input
                type="email"
                className="input"
                placeholder="john.doe@example.com"
                value={inviteFormData.email}
                onChange={(e) => setInviteFormData(prev => ({ 
                  ...prev, 
                  email: e.target.value 
                }))}
              />
            </div>

            <div className="field">
              <label className="label">Role</label>
              <select
                className="input"
                value={inviteFormData.role}
                onChange={(e) => setInviteFormData(prev => ({ 
                  ...prev, 
                  role: e.target.value 
                }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <div className="field">
              <label className="label">Permissions</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                padding: '12px',
                background: 'var(--bg)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                {Object.keys(inviteFormData.permissions).map(key => (
                  <label 
                    key={key}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={inviteFormData.permissions[key]}
                      onChange={(e) => setInviteFormData(prev => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          [key]: e.target.checked
                        }
                      }))}
                    />
                    <span>{key.replace(/-/g, ' ').replace(/app/g, '').trim()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button 
                className="btn"
                onClick={() => setShowInviteForm(false)}
                disabled={inviteLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleInviteUser}
                disabled={inviteLoading}
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Management */}
      <div className="card pad" style={{ marginTop: '16px' }}>
        <div className="section-title">Data Management</div>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
          Manage your application data and perform maintenance tasks.
        </p>
        <div className="grid grid-3">
          <div className="card pad data-management-card">
            <h4>Candidate Registration</h4>
            <p>Clear candidate registration data from views or database.</p>
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