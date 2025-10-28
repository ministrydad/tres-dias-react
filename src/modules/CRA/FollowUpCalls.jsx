import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function FollowUpCalls() {
  const { orgId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('men');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentApp, setCurrentApp] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cra_applications')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    setShowForm(false);
    setCurrentApp(null);
    setExpandedRows(new Set());
  };

  const toggleRowExpansion = (appId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

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
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
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

      window.showMainStatus('Follow-up saved successfully.');
      await loadApplications();
      closeForm();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      window.showMainStatus(`Error saving follow-up: ${error.message}`, true);
    }
  };

  const getCalculatedStatus = (app) => {
    if (app.attendance === 'yes') return 'Confirmed';
    if (app.attendance === 'no') return 'Withdrawn';
    if (app.letter_sent_sponsor && app.letter_sent_candidate) return 'Letters Sent';
    return 'Pending Follow-up';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Confirmed': return 'badge-success';
      case 'Letters Sent': return 'badge-info';
      case 'Withdrawn': return 'badge-danger';
      case 'Pending Follow-up': return 'badge-warning';
      default: return 'badge-default';
    }
  };

  const pendingApps = applications.filter(app => {
    const hasPerson = (currentFilter === 'men' && app.m_first) || (currentFilter === 'women' && app.f_first);
    return hasPerson;
  });

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

  const getCandidateDetails = (app) => {
    const prefix = currentFilter === 'men' ? 'm_' : 'f_';
    return {
      smoker: app[`${prefix}smoke`] || false,
      wheelchair: app[`${prefix}wheelchair`] || false,
      diet: app[`${prefix}diet`] || false,
      dietDetails: app[`${prefix}diettext`] || ''
    };
  };

  return (
    <div id="cra-followup" className="cra-view">
      <div className="card pad" style={{ marginBottom: '12px' }}>
        <div style={{ maxWidth: '300px' }}>
          <label className="label">Filter by Gender</label>
          <div className="toggle" id="craFollowupFilter">
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
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div 
          className="card pad" 
          style={{ 
            width: showForm ? '45%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
          <div className="section-title">Follow-up Call List</div>
          <p style={{ color: 'var(--muted)', marginTop: '-10px', marginBottom: '20px' }}>
            Click "Start Call" to record follow-up information. Click a row to expand and see details.
          </p>
          <div id="followup-list-container">
            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px' }}>Loading follow-up list...</p>
            ) : pendingApps.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                No {currentFilter} candidates found.
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Sponsor</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map(app => {
                    const isExpanded = expandedRows.has(app.id);
                    const status = getCalculatedStatus(app);
                    const details = getCandidateDetails(app);
                    const rowStyle = status === 'Withdrawn'
                      ? { backgroundColor: 'rgba(220, 53, 69, 0.08)' }
                      : currentApp?.id === app.id
                      ? { backgroundColor: 'rgba(40, 167, 69, 0.08)' }
                      : {};

                    return (
                      <>
                        <tr 
                          key={app.id}
                          style={rowStyle}
                          onClick={() => toggleRowExpansion(app.id)}
                          className="followup-row"
                        >
                          <td style={{ cursor: 'pointer' }}>
                            <span style={{ marginRight: '8px', fontSize: '0.9rem' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            {getCandidateName(app)}
                          </td>
                          <td>{app.s_first} {app.s_last}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="btn btn-small btn-primary"
                              onClick={() => openFollowupForm(app)}
                              style={{
                                backgroundColor: currentApp?.id === app.id ? 'var(--accentA)' : undefined
                              }}
                            >
                              Start Call
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${app.id}-details`}>
                            <td colSpan="4" style={{ backgroundColor: 'var(--panel-header)', padding: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                  <strong>Contact Info:</strong>
                                  <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                                    <div><strong>Sponsor Phone:</strong> {app.s_phone || 'N/A'}</div>
                                    <div><strong>Candidate Phone:</strong> {getCandidatePhone(app)}</div>
                                  </div>
                                </div>
                                <div>
                                  <strong>Special Needs:</strong>
                                  <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                                    <div><strong>Smoker:</strong> {details.smoker ? 'Yes' : 'No'}</div>
                                    <div><strong>Wheelchair:</strong> {details.wheelchair ? 'Yes' : 'No'}</div>
                                    <div><strong>Special Diet:</strong> {details.diet ? 'Yes' : 'No'}</div>
                                    {details.diet && details.dietDetails && (
                                      <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--muted)' }}>
                                        {details.dietDetails}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {showForm && currentApp && (
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
                Follow-up Call: {getCandidateName(currentApp)}
              </h3>
              <button 
                className="btn btn-small"
                onClick={closeForm}
                style={{ padding: '4px 12px', fontSize: '0.9rem' }}
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-3" style={{ marginBottom: '20px' }}>
              <div className="field">
                <label className="label">Sponsor Name</label>
                <div style={{ fontWeight: 600 }}>
                  {currentApp.s_first} {currentApp.s_last}
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
              <div className="toggle" id="followup_attendance" style={{ display: 'flex', gap: '0' }}>
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
                <div className="toggle" id="followup_smoker">
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
                <div className="toggle" id="followup_wheelchair">
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
                <div className="toggle" id="followup_diet">
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
                  id="followup_diet_details"
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
                <div className="toggle" id="followup_sponsor_letter">
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
                <div className="toggle" id="followup_candidate_letter">
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
                onClick={closeForm}
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
        
        .followup-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .followup-row:hover {
          background-color: rgba(0, 163, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
}