// src/modules/CRA/ViewRoster.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ViewRoster() {
  const { orgId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('men');
  const [loading, setLoading] = useState(true);

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
      console.error('Error loading CRA applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
  };

  const handleEdit = (id) => {
    // TODO: Navigate to edit view
    console.log('Edit application:', id);
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

      // Reload applications
      await loadApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      alert(`Failed to delete application: ${error.message}`);
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

  // Filter applications based on gender
  const filteredApps = applications.filter(app => {
    const hasMan = app.m_first && app.m_first.trim() !== '';
    const hasWoman = app.f_first && app.f_first.trim() !== '';
    if (currentFilter === 'men') return hasMan;
    if (currentFilter === 'women') return hasWoman;
    return false;
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
          <div className="team-total-title">Total Candidates</div>
          <div className="team-total-count">{filteredApps.length}</div>
        </div>
      </div>

      <div className="card pad">
        <table className="table">
          <thead>
            <tr>
              <th>Candidate(s)</th>
              <th>Church</th>
              <th>City/State</th>
              <th>Sponsor</th>
              <th>Weekend Fee</th>
              <th>Sponsor Fee</th>
              <th>Status</th>
              <th style={{ width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="apps_tbody">
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  Loading applications...
                </td>
              </tr>
            ) : filteredApps.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  No {currentFilter} applications found.
                </td>
              </tr>
            ) : (
              filteredApps.map(app => {
                // Build candidate name based on filter
                let candName = '';
                if (currentFilter === 'men') {
                  candName = `${app.m_first} ${app.m_pref ? `(${app.m_pref}) ` : ''}${app.c_lastname}`;
                } else {
                  candName = `${app.f_first} ${app.f_pref ? `(${app.f_pref}) ` : ''}${app.c_lastname}`;
                }

                const cityState = [app.c_city, app.c_state].filter(Boolean).join(', ') || 'N/A';
                const sponsor = app.s_sponsor || 'N/A';
                const weekendFee = getPaymentStatusString(app, 'wk');
                const sponsorFee = getPaymentStatusString(app, 'sp');
                const status = getCalculatedStatus(app);

                // Highlight withdrawn applications with red background
                const rowStyle = status === 'Withdrawn' 
                  ? { backgroundColor: 'rgba(220, 53, 69, 0.08)' }
                  : {};

                return (
                  <tr key={app.id} style={rowStyle}>
                    <td>{candName}</td>
                    <td>{app.c_church || 'N/A'}</td>
                    <td>{cityState}</td>
                    <td>{sponsor}</td>
                    <td>{weekendFee}</td>
                    <td>{sponsorFee}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
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
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}