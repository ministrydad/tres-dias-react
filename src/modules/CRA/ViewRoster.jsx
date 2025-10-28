// src/modules/CRA/ViewRoster.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ViewRoster({ onNavigate }) {
  const { orgId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('men');
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState('status'); // Default sort by status
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Follow-up form state
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [currentApp, setCurrentApp] = useState(null);
  const [followupData, setFollowupData] = useState({
    attendance: null,
    smoker: false,
    wheelchair: false,
    diet: false,
    diet_details: '',
    letter_sent_sponsor: false,
    letter_sent_candidate: false
  });

  useEffect(() => {
    if (orgId) {
      loadApplications();
    }
  }, [orgId]);

 const loadApplications = async () => {
  console.log('🔍 ViewRoster: loadApplications called');
  console.log('📍 orgId:', orgId);
  
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('cra_applications')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    console.log('📊 Query result - Data count:', data?.length, 'Error:', error);

    if (error) throw error;

    setApplications(data || []);
  } catch (error) {
    console.error('❌ Error loading CRA applications:', error);
    console.error('❌ Error details:', error.message, error.code);
    setApplications([]);
  } finally {
    setLoading(false);
  }
};

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleRowExpansion = (appId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(appId)) {
      newExpanded.delete(appId);
    } else {
      newExpanded.add(appId);
    }
    setExpandedRows(newExpanded);
  };

  // Follow-up form handlers
  const openFollowupForm = (app) => {
    setCurrentApp(app);
    
    const prefix = currentFilter === 'men' ? 'm_' : 'f_';
    const smokeCol = `${prefix}smoke`;
    const wheelchairCol = `${prefix}wheelchair`;
    const dietCol = `${prefix}diet`;
    const dietTextCol = `${prefix}diettext`;
    
    setFollowupData({
      attendance: app.attendance || null,
      smoker: app[smokeCol] || false,
      wheelchair: app[wheelchairCol] || false,
      diet: app[dietCol] || false,
      diet_details: app[dietTextCol] || '',
      letter_sent_sponsor: app.letter_sent_sponsor || false,
      letter_sent_candidate: app.letter_sent_candidate || false
    });
    setShowFollowupForm(true);
  };

  const closeFollowupForm = () => {
    setShowFollowupForm(false);
    setCurrentApp(null);
  };

  const handleToggle = (field) => {
    setFollowupData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleAttendanceChange = (value) => {
    setFollowupData(prev => ({
      ...prev,
      attendance: value
    }));
  };

  const saveFollowup = async () => {
    if (!currentApp) return;

    try {
      const prefix = currentFilter === 'men' ? 'm_' : 'f_';
      const payload = {
        attendance: followupData.attendance,
        [`${prefix}smoke`]: followupData.smoker,
        [`${prefix}wheelchair`]: followupData.wheelchair,
        [`${prefix}diet`]: followupData.diet,
        [`${prefix}diettext`]: followupData.diet_details,
        letter_sent_sponsor: followupData.letter_sent_sponsor,
        letter_sent_candidate: followupData.letter_sent_candidate
      };

      const { error } = await supabase
        .from('cra_applications')
        .update(payload)
        .eq('id', currentApp.id)
        .eq('org_id', orgId);

      if (error) throw error;

      window.showMainStatus('Follow-up saved successfully.', false);
      await loadApplications();
      closeFollowupForm();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      window.showMainStatus(`Error saving follow-up: ${error.message}`, true);
    }
  };

  const handleEdit = (id) => {
    // Navigate to NewApplication view with editing ID
    onNavigate('cra-new-application', { editingAppId: id });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this application? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cra_applications')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) throw error;

      window.showMainStatus('Application deleted successfully', false);
      
      // Reload applications
      await loadApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      window.showMainStatus(`Failed to delete application: ${error.message}`, true);
    }
  };

  const getPaymentStatusString = (app, type) => {
    if (type === 'wk') {
      if (app.payment_wk_scholarship) {
        return app.payment_wk_scholarshiptype === 'full'
          ? 'Full Scholarship'
          : `Partial ($${app.payment_wk_partialamount})`;
      } else {
        return (app.payment_wk_cash || app.payment_wk_check) ? 'Paid' : 'Due';
      }
    } else if (type === 'sp') {
      return (app.payment_sp_cash || app.payment_sp_check) ? 'Paid' : 'Due';
    }
    return 'Due';
  };

  // Calculate status based on data fields
  const getCalculatedStatus = (app) => {
    // Check if candidate confirmed attendance
    if (app.attendance === 'yes') {
      return 'Confirmed';
    }
    
    // Check if candidate explicitly declined (withdrawn)
    if (app.attendance === 'no') {
      return 'Withdrawn';
    }
    
    // Check if both letters have been sent
    if (app.letter_sent_sponsor && app.letter_sent_candidate) {
      return 'Letters Sent';
    }
    
    // Default: pending follow-up (attendance not yet determined)
    return 'Pending Follow-up';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'badge-success';      // Green
      case 'Letters Sent':
        return 'badge-info';         // Blue
      case 'Withdrawn':
        return 'badge-danger';       // Red
      case 'Pending Follow-up':
        return 'badge-warning';      // Yellow
      default:
        return 'badge-default';      // Gray
    }
  };

  const getCandidateName = (app) => {
    if (currentFilter === 'men') {
      return `${app.m_first} ${app.m_pref ? `(${app.m_pref}) ` : ''}${app.c_lastname}`;
    } else {
      return `${app.f_first} ${app.f_pref ? `(${app.f_pref}) ` : ''}${app.c_lastname}`;
    }
  };

  const getCandidatePhone = (app) => {
    return currentFilter === 'men' ? (app.m_cell || 'N/A') : (app.f_cell || 'N/A');
  };

  // Filter applications based on gender
  const filteredApps = applications.filter(app => {
    const hasMan = app.m_first && app.m_first.trim() !== '';
    const hasWoman = app.f_first && app.f_first.trim() !== '';
    if (currentFilter === 'men') return hasMan;
    if (currentFilter === 'women') return hasWoman;
    return false;
  });

  // Calculate active candidates (excluding withdrawn)
  const activeCandidateCount = filteredApps.filter(app => {
    const status = getCalculatedStatus(app);
    return status !== 'Withdrawn';
  }).length;

  // Sort applications by status priority
  const statusPriority = {
    'Withdrawn': 1,
    'Confirmed': 2,
    'Letters Sent': 3,
    'Pending Follow-up': 4
  };

  const sortedApps = [...filteredApps].sort((a, b) => {
    let compareA, compareB;

    switch (sortColumn) {
      case 'name':
        // Sort by candidate name
        const nameA = currentFilter === 'men' 
          ? `${a.m_first} ${a.c_lastname}`.toLowerCase()
          : `${a.f_first} ${a.c_lastname}`.toLowerCase();
        const nameB = currentFilter === 'men'
          ? `${b.m_first} ${b.c_lastname}`.toLowerCase()
          : `${b.f_first} ${b.c_lastname}`.toLowerCase();
        compareA = nameA;
        compareB = nameB;
        break;

      case 'church':
        compareA = (a.c_church || '').toLowerCase();
        compareB = (b.c_church || '').toLowerCase();
        break;

      case 'city':
        const cityA = [a.c_city, a.c_state].filter(Boolean).join(', ').toLowerCase();
        const cityB = [b.c_city, b.c_state].filter(Boolean).join(', ').toLowerCase();
        compareA = cityA;
        compareB = cityB;
        break;

      case 'sponsor':
        compareA = (a.s_sponsor || '').toLowerCase();
        compareB = (b.s_sponsor || '').toLowerCase();
        break;

      case 'status':
        // Use status priority for sorting
        const statusA = getCalculatedStatus(a);
        const statusB = getCalculatedStatus(b);
        compareA = statusPriority[statusA] || 99;
        compareB = statusPriority[statusB] || 99;
        break;

      default:
        return 0;
    }

    // Apply sort direction
    if (sortColumn === 'status') {
      // For status, lower priority number = higher priority
      return sortDirection === 'asc' 
        ? compareA - compareB 
        : compareB - compareA;
    } else {
      // For text fields, standard alphabetical sort
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
  });

  return (
    <div id="cra-apps" className="cra-view">
      <div className="card pad" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ maxWidth: '300px' }}>
          <label className="label">Filter Applications</label>
          <div className="toggle" id="craAppsFilter">
            <div 
              className={`opt ${currentFilter === 'men' ? 'active' : ''}`}
              onClick={() => handleFilterChange('men')}
            >
              Men
            </div>
            <div 
              className={`opt ${currentFilter === 'women' ? 'active' : ''}`}
              onClick={() => handleFilterChange('women')}
            >
              Women
            </div>
          </div>
        </div>
        <div id="craCandidateCountCard" className="team-total-card">
          <div className="team-total-title">Active Candidates</div>
          <div className="team-total-count">{activeCandidateCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
            ({filteredApps.length} total)
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div 
          className="card pad"
          style={{
            width: showFollowupForm ? '45%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
        <style>{`
          #cra-apps th[style*="cursor: pointer"]:hover {
            background-color: var(--panel-header);
          }
          
          #cra-apps tr.expanded-row {
            animation: expandRow 0.2s ease-out;
          }
          
          @keyframes expandRow {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        <table className="table">
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('name')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Candidate(s) {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('sponsor')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Sponsor {sortColumn === 'sponsor' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('status')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Status {sortColumn === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th>Weekend Fee</th>
              <th>Sponsor Fee</th>
              <th style={{ width: '200px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="apps_tbody">
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  Loading applications...
                </td>
              </tr>
            ) : sortedApps.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  No {currentFilter} applications found.
                </td>
              </tr>
            ) : (
              sortedApps.map(app => {
                // Build candidate name based on filter
                let candName = '';
                if (currentFilter === 'men') {
                  candName = `${app.m_first} ${app.m_pref ? `(${app.m_pref}) ` : ''}${app.c_lastname}`;
                } else {
                  candName = `${app.f_first} ${app.f_pref ? `(${app.f_pref}) ` : ''}${app.c_lastname}`;
                }

                const sponsor = app.s_sponsor || 'N/A';
                const weekendFee = getPaymentStatusString(app, 'wk');
                const sponsorFee = getPaymentStatusString(app, 'sp');
                const status = getCalculatedStatus(app);
                const isExpanded = expandedRows.has(app.id);

                // Highlight withdrawn applications with red background
                const rowStyle = status === 'Withdrawn' 
                  ? { backgroundColor: 'rgba(220, 53, 69, 0.08)' }
                  : currentApp?.id === app.id
                  ? { backgroundColor: 'rgba(40, 167, 69, 0.08)' }
                  : {};

                // Construct sponsor name from s_first and s_last
                const sponsorName = [app.s_first, app.s_last].filter(Boolean).join(' ') || 'N/A';

                // Get gender-specific fields
                const candPhone = currentFilter === 'men' ? (app.m_cell || 'N/A') : (app.f_cell || 'N/A');
                const candEmail = currentFilter === 'men' ? (app.m_email || 'N/A') : (app.f_email || 'N/A');
                const candDiet = currentFilter === 'men' ? (app.m_diettext || 'None') : (app.f_diettext || 'None');
                const candSmoking = currentFilter === 'men' ? (app.m_smoke ? 'Yes' : 'No') : (app.f_smoke ? 'Yes' : 'No');

                return (
                  <>
                    {/* Main Row */}
                    <tr key={app.id} style={rowStyle}>
                      <td 
                        onClick={() => toggleRowExpansion(app.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                          {candName}
                        </span>
                      </td>
                      <td>{sponsorName}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td>{weekendFee}</td>
                      <td>{sponsorFee}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn btn-small"
                            onClick={() => handleEdit(app.id)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-small btn-danger"
                            onClick={() => handleDelete(app.id)}
                          >
                            Delete
                          </button>
                          <button 
                            className="btn btn-small btn-primary"
                            onClick={() => openFollowupForm(app)}
                            style={{
                              backgroundColor: currentApp?.id === app.id ? 'var(--accentA)' : undefined
                            }}
                          >
                            Contact
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="expanded-row" style={{ ...rowStyle, borderTop: '1px solid var(--border)' }}>
                        <td colSpan="6" style={{ padding: '16px 24px', backgroundColor: 'var(--panel-header)' }}>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '16px',
                            fontSize: '0.9rem'
                          }}>
                            {/* Sponsor Info */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                SPONSOR
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{sponsorName}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{app.s_phone || 'No phone'}</div>
                            </div>

                            {/* Candidate Contact */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                CANDIDATE CONTACT
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{candPhone}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{candEmail}</div>
                            </div>

                            {/* Church */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                CHURCH
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{app.c_church || 'N/A'}</div>
                            </div>

                            {/* Weekend Payment Details */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                WEEKEND FEE
                              </div>
                              {app.payment_wk_scholarship ? (
                                <div style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 600 }}>
                                  Paid - {app.payment_wk_scholarshiptype === 'full' 
                                    ? 'Full Scholarship' 
                                    : `Partial Scholarship ($${app.payment_wk_partialamount})`}
                                </div>
                              ) : (app.payment_wk_cash || app.payment_wk_check) ? (
                                <div style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 600 }}>
                                  Paid - {[
                                    app.payment_wk_cash ? 'Cash' : null,
                                    app.payment_wk_check ? 'Check' : null
                                  ].filter(Boolean).join(', ')}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: 600 }}>Due</div>
                              )}
                            </div>

                            {/* Sponsor Payment Details */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                SPONSOR FEE
                              </div>
                              {(app.payment_sp_cash || app.payment_sp_check) ? (
                                <div style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 600 }}>
                                  Paid - {[
                                    app.payment_sp_cash ? 'Cash' : null,
                                    app.payment_sp_check ? 'Check' : null
                                  ].filter(Boolean).join(', ')}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: 600 }}>Due</div>
                              )}
                            </div>

                            {/* Diet */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                DIET
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{candDiet}</div>
                            </div>

                            {/* Smoking */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                SMOKING
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{candSmoking}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Follow-up Contact Form - Side Panel */}
        {showFollowupForm && currentApp && (
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
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid var(--accentB)'
            }}>
              <h3 style={{ margin: 0, color: 'var(--accentB)', fontSize: '1.1rem' }}>
                Follow-up Contact: {getCandidateName(currentApp)}
              </h3>
              <button 
                className="btn btn-small"
                onClick={closeFollowupForm}
                style={{ padding: '4px 12px', fontSize: '0.9rem' }}
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-3" style={{ marginBottom: '20px' }}>
              <div className="field">
                <label className="label">Sponsor Name</label>
                <div style={{ fontWeight: 600 }}>
                  {[currentApp.s_first, currentApp.s_last].filter(Boolean).join(' ') || 'N/A'}
                </div>
              </div>
              <div className="field">
                <label className="label">Sponsor Phone</label>
                <div style={{ fontWeight: 600 }}>
                  {currentApp.s_phone || 'N/A'}
                </div>
              </div>
              <div className="field">
                <label className="label">Candidate Phone</label>
                <div style={{ fontWeight: 600 }}>
                  {getCandidatePhone(currentApp)}
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            <div className="field" style={{ marginBottom: '20px' }}>
              <label className="label">Are they attending the upcoming weekend?</label>
              <div className="toggle" style={{ display: 'flex', gap: '0' }}>
                <div 
                  className={`opt ${followupData.attendance === null ? 'active' : ''}`}
                  onClick={() => handleAttendanceChange(null)}
                  style={{ flex: 1 }}
                >
                  Not Asked
                </div>
                <div 
                  className={`opt ${followupData.attendance === 'no' ? 'active' : ''}`}
                  onClick={() => handleAttendanceChange('no')}
                  style={{ flex: 1 }}
                >
                  No
                </div>
                <div 
                  className={`opt ${followupData.attendance === 'yes' ? 'active' : ''}`}
                  onClick={() => handleAttendanceChange('yes')}
                  style={{ flex: 1 }}
                >
                  Yes
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            <div className="grid grid-3">
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Smoker?</label>
                <div className="toggle">
                  <div 
                    className={`opt ${!followupData.smoker ? 'active' : ''}`}
                    onClick={() => handleToggle('smoker')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.smoker ? 'active' : ''}`}
                    onClick={() => handleToggle('smoker')}
                  >
                    Yes
                  </div>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Wheelchair?</label>
                <div className="toggle">
                  <div 
                    className={`opt ${!followupData.wheelchair ? 'active' : ''}`}
                    onClick={() => handleToggle('wheelchair')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.wheelchair ? 'active' : ''}`}
                    onClick={() => handleToggle('wheelchair')}
                  >
                    Yes
                  </div>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Special Diet?</label>
                <div className="toggle">
                  <div 
                    className={`opt ${!followupData.diet ? 'active' : ''}`}
                    onClick={() => handleToggle('diet')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.diet ? 'active' : ''}`}
                    onClick={() => handleToggle('diet')}
                  >
                    Yes
                  </div>
                </div>
              </div>
            </div>

            {followupData.diet && (
              <div className="field" style={{ marginTop: '16px' }}>
                <label className="label">Dietary Details</label>
                <textarea 
                  className="textarea"
                  value={followupData.diet_details}
                  onChange={(e) => setFollowupData(prev => ({ ...prev, diet_details: e.target.value }))}
                  placeholder="e.g., Gluten-free, lactose intolerant, etc."
                />
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            <div className="grid grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Sponsor Letter Sent?</label>
                <div className="toggle">
                  <div 
                    className={`opt ${!followupData.letter_sent_sponsor ? 'active' : ''}`}
                    onClick={() => handleToggle('letter_sent_sponsor')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.letter_sent_sponsor ? 'active' : ''}`}
                    onClick={() => handleToggle('letter_sent_sponsor')}
                  >
                    Yes
                  </div>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Candidate Letter Sent?</label>
                <div className="toggle">
                  <div 
                    className={`opt ${!followupData.letter_sent_candidate ? 'active' : ''}`}
                    onClick={() => handleToggle('letter_sent_candidate')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.letter_sent_candidate ? 'active' : ''}`}
                    onClick={() => handleToggle('letter_sent_candidate')}
                  >
                    Yes
                  </div>
                </div>
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
                onClick={closeFollowupForm}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={saveFollowup}
                style={{ flex: 1 }}
              >
                Save & Complete
              </button>
            </div>
          </div>
        )}
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
        
        #cra-apps .followup-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        #cra-apps .followup-row:hover {
          background-color: rgba(0, 163, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
}