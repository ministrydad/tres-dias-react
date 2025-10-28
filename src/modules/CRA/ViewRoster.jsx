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

      <div className="card pad">
        <style>{`
          #cra-apps th[style*="cursor: pointer"]:hover {
            background-color: var(--panel-header);
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
                onClick={() => handleSort('church')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Church {sortColumn === 'church' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('city')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                City/State {sortColumn === 'city' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('sponsor')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Sponsor {sortColumn === 'sponsor' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th>Weekend Fee</th>
              <th>Sponsor Fee</th>
              <th 
                onClick={() => handleSort('status')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Status {sortColumn === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
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
            ) : sortedApps.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
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