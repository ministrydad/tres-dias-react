// src/modules/CRA/ViewRoster.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ViewRoster({ onNavigate }) {
  const { orgId } = useAuth();
  
  // Constants
  const WEEKEND_FEE = 265; // TODO: Load from app_settings table
  
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('men');
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState('status');
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Table height measurement
  const tableRef = useRef(null);
  const [editPanelHeight, setEditPanelHeight] = useState('auto');
  
  // Follow-up form state
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [currentApp, setCurrentApp] = useState(null);
  const [followupData, setFollowupData] = useState({
    attendance: null,
    smoker: null,
    wheelchair: null,
    diet: null,
    diet_details: '',
    letter_sent_sponsor: false,
    letter_sent_candidate: false
  });

  // Edit form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentEditApp, setCurrentEditApp] = useState(null);
  const [editData, setEditData] = useState({
    // Candidate info
    m_first: '', m_pref: '', m_last: '',
    f_first: '', f_pref: '', f_last: '',
    m_cell: '', f_cell: '',
    m_email: '', f_email: '',
    c_address: '', c_city: '', c_state: '', c_zip: '',
    c_church: '', c_lastname: '',
    
    // Sponsor info
    s_first: '', s_last: '', s_phone: '',
    
    // Special needs
    m_smoke: null, f_smoke: null,
    m_wheelchair: null, f_wheelchair: null,
    m_diet: null, f_diet: null,
    m_diettext: '', f_diettext: '',
    
    // Payments
    payment_wk_cash: false,
    payment_wk_check: false,
    payment_wk_scholarship: false,
    payment_wk_scholarshiptype: '',
    payment_wk_partialamount: '',
    payment_wk_candidate_paid: 0,  // NEW FIELD
    payment_sp_cash: false,
    payment_sp_check: false,
    
    // Letters
    letter_sent_sponsor: false,
    letter_sent_candidate: false
  });

  useEffect(() => {
    if (orgId) {
      loadApplications();
    }
  }, [orgId]);

  // Measure table height when edit panel opens
  useEffect(() => {
    if ((showEditForm || showFollowupForm) && tableRef.current) {
      const height = tableRef.current.offsetHeight;
      setEditPanelHeight(`${height}px`);
    }
  }, [showEditForm, showFollowupForm]);

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
    // Close any open panels when switching gender
    setShowFollowupForm(false);
    setShowEditForm(false);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
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

  // ============================================================
  // FOLLOW-UP FORM HANDLERS (Existing)
  // ============================================================
  const openFollowupForm = (app) => {
    setCurrentApp(app);
    setShowEditForm(false); // Close edit form if open
    
    const prefix = currentFilter === 'men' ? 'm_' : 'f_';
    const smokeCol = `${prefix}smoke`;
    const wheelchairCol = `${prefix}wheelchair`;
    const dietCol = `${prefix}diet`;
    const dietTextCol = `${prefix}diettext`;
    
    const mapBoolToState = (value) => {
      if (value === true) return 'yes';
      if (value === false) return 'no';
      return null;
    };
    
    setFollowupData({
      attendance: app.attendance || null,
      smoker: mapBoolToState(app[smokeCol]),
      wheelchair: mapBoolToState(app[wheelchairCol]),
      diet: mapBoolToState(app[dietCol]),
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

  const handle3StateToggle = (field, value) => {
    setFollowupData(prev => ({
      ...prev,
      [field]: value
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
      
      const mapStateToBool = (value) => {
        if (value === 'yes') return true;
        if (value === 'no') return false;
        return null;
      };
      
      const payload = {
        attendance: followupData.attendance,
        [`${prefix}smoke`]: mapStateToBool(followupData.smoker),
        [`${prefix}wheelchair`]: mapStateToBool(followupData.wheelchair),
        [`${prefix}diet`]: mapStateToBool(followupData.diet),
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
      // Keep panel open as requested
    } catch (error) {
      console.error('Error saving follow-up:', error);
      window.showMainStatus(`Error saving follow-up: ${error.message}`, true);
    }
  };

  // ============================================================
  // EDIT FORM HANDLERS (New)
  // ============================================================
  const openEditForm = (app) => {
    setCurrentEditApp(app);
    setShowFollowupForm(false); // Close follow-up form if open
    
    // Map database booleans to null/'no'/'yes' strings for 3-state toggles
    const mapBoolToState = (value) => {
      if (value === true) return 'yes';
      if (value === false) return 'no';
      return null;
    };
    
    // Pre-populate all fields
    setEditData({
      // Candidate info
      m_first: app.m_first || '',
      m_pref: app.m_pref || '',
      m_last: app.m_last || '',
      f_first: app.f_first || '',
      f_pref: app.f_pref || '',
      f_last: app.f_last || '',
      m_cell: app.m_cell || '',
      f_cell: app.f_cell || '',
      m_email: app.m_email || '',
      f_email: app.f_email || '',
      c_address: app.c_address || '',
      c_city: app.c_city || '',
      c_state: app.c_state || '',
      c_zip: app.c_zip || '',
      c_church: app.c_church || '',
      c_lastname: app.c_lastname || '',
      
      // Sponsor info
      s_first: app.s_first || '',
      s_last: app.s_last || '',
      s_phone: app.s_phone || '',
      
      // Special needs
      m_smoke: mapBoolToState(app.m_smoke),
      f_smoke: mapBoolToState(app.f_smoke),
      m_wheelchair: mapBoolToState(app.m_wheelchair),
      f_wheelchair: mapBoolToState(app.f_wheelchair),
      m_diet: mapBoolToState(app.m_diet),
      f_diet: mapBoolToState(app.f_diet),
      m_diettext: app.m_diettext || '',
      f_diettext: app.f_diettext || '',
      
      // Payments
      payment_wk_cash: app.payment_wk_cash || false,
      payment_wk_check: app.payment_wk_check || false,
      payment_wk_scholarship: app.payment_wk_scholarship || false,
      payment_wk_scholarshiptype: app.payment_wk_scholarshiptype || '',
      payment_wk_partialamount: app.payment_wk_partialamount || '',
      payment_wk_candidate_paid: app.payment_wk_candidate_paid || 0,
      payment_sp_cash: app.payment_sp_cash || false,
      payment_sp_check: app.payment_sp_check || false,
      
      // Letters
      letter_sent_sponsor: app.letter_sent_sponsor || false,
      letter_sent_candidate: app.letter_sent_candidate || false
    });
    
    setShowEditForm(true);
  };

  const closeEditForm = () => {
    setShowEditForm(false);
    setCurrentEditApp(null);
  };

  const handleEditFieldChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit3StateToggle = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditToggle = (field) => {
    setEditData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Phone formatting function
  const formatPhone = (phone) => {
    if (!phone) return '';
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as (xxx) xxx-xxxx
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Return as-is if not 10 digits
    return phone;
  };

  const handlePhoneBlur = (field) => {
    const formatted = formatPhone(editData[field]);
    handleEditFieldChange(field, formatted);
  };

  // Email validation function
  const validateEmail = (email) => {
    if (!email) return true; // Empty is OK (no required fields)
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = (field) => {
    const email = editData[field];
    if (email && !validateEmail(email)) {
      window.showMainStatus('Invalid email format', true);
    }
  };

  const saveEdit = async () => {
    if (!currentEditApp) return;

    try {
      // Validate emails before saving
      const emailFields = ['m_email', 'f_email'];
      for (const field of emailFields) {
        if (editData[field] && !validateEmail(editData[field])) {
          window.showMainStatus(`Invalid email format in ${field.includes('m_') ? 'Men' : 'Women'} email field`, true);
          return;
        }
      }

      // Map null/'no'/'yes' strings back to booleans for database
      const mapStateToBool = (value) => {
        if (value === 'yes') return true;
        if (value === 'no') return false;
        return null;
      };
      
      const payload = {
        // Candidate info
        m_first: editData.m_first,
        m_pref: editData.m_pref,
        m_last: editData.m_last,
        f_first: editData.f_first,
        f_pref: editData.f_pref,
        f_last: editData.f_last,
        m_cell: editData.m_cell,
        f_cell: editData.f_cell,
        m_email: editData.m_email,
        f_email: editData.f_email,
        c_address: editData.c_address,
        c_city: editData.c_city,
        c_state: editData.c_state,
        c_zip: editData.c_zip,
        c_church: editData.c_church,
        c_lastname: editData.c_lastname,
        
        // Sponsor info
        s_first: editData.s_first,
        s_last: editData.s_last,
        s_phone: editData.s_phone,
        
        // Special needs
        m_smoke: mapStateToBool(editData.m_smoke),
        f_smoke: mapStateToBool(editData.f_smoke),
        m_wheelchair: mapStateToBool(editData.m_wheelchair),
        f_wheelchair: mapStateToBool(editData.f_wheelchair),
        m_diet: mapStateToBool(editData.m_diet),
        f_diet: mapStateToBool(editData.f_diet),
        m_diettext: editData.m_diettext,
        f_diettext: editData.f_diettext,
        
        // Payments
        payment_wk_cash: editData.payment_wk_cash,
        payment_wk_check: editData.payment_wk_check,
        payment_wk_scholarship: editData.payment_wk_scholarship,
        payment_wk_scholarshiptype: editData.payment_wk_scholarshiptype,
        payment_wk_partialamount: editData.payment_wk_partialamount,
        payment_wk_candidate_paid: editData.payment_wk_candidate_paid,
        payment_sp_cash: editData.payment_sp_cash,
        payment_sp_check: editData.payment_sp_check,
        
        // Letters
        letter_sent_sponsor: editData.letter_sent_sponsor,
        letter_sent_candidate: editData.letter_sent_candidate
      };

      const { error } = await supabase
        .from('cra_applications')
        .update(payload)
        .eq('id', currentEditApp.id)
        .eq('org_id', orgId);

      if (error) throw error;

      window.showMainStatus('Application updated successfully!', false);
      await loadApplications();
      // Keep panel open as requested
    } catch (error) {
      console.error('Error saving edit:', error);
      window.showMainStatus(`Error saving changes: ${error.message}`, true);
    }
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
      await loadApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      window.showMainStatus(`Failed to delete application: ${error.message}`, true);
    }
  };

  const getPaymentStatusString = (app, type) => {
    if (type === 'wk') {
      if (app.payment_wk_scholarship) {
        if (app.payment_wk_scholarshiptype === 'full') {
          return 'Full Scholarship';
        } else {
          // Partial scholarship with candidate payment
          const candidatePaid = app.payment_wk_candidate_paid || 0;
          const scholarshipAmount = app.payment_wk_partialamount || 0;
          const method = app.payment_wk_cash ? 'Cash' : app.payment_wk_check ? 'Check' : '';
          return `Partial ($${candidatePaid} ${method}, $${scholarshipAmount} scholarship)`;
        }
      } else {
        return (app.payment_wk_cash || app.payment_wk_check) ? 'Paid' : 'Due';
      }
    } else if (type === 'sp') {
      return (app.payment_sp_cash || app.payment_sp_check) ? 'Paid' : 'Due';
    }
    return 'Due';
  };

  const getCalculatedStatus = (app) => {
    if (app.attendance === 'yes') {
      return 'Confirmed';
    }
    if (app.attendance === 'no') {
      return 'Withdrawn';
    }
    if (app.letter_sent_sponsor && app.letter_sent_candidate) {
      return 'Letters Sent';
    }
    return 'Pending Follow-up';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'badge-success';
      case 'Letters Sent':
        return 'badge-info';
      case 'Withdrawn':
        return 'badge-danger';
      case 'Pending Follow-up':
        return 'badge-warning';
      default:
        return 'badge-default';
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

  const filteredApps = applications.filter(app => {
    const hasMan = app.m_first && app.m_first.trim() !== '';
    const hasWoman = app.f_first && app.f_first.trim() !== '';
    if (currentFilter === 'men') return hasMan;
    if (currentFilter === 'women') return hasWoman;
    return false;
  });

  const activeCandidateCount = filteredApps.filter(app => {
    const status = getCalculatedStatus(app);
    return status !== 'Withdrawn';
  }).length;

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
        const nameA = currentFilter === 'men' 
          ? `${a.m_first} ${a.c_lastname}`.toLowerCase()
          : `${a.f_first} ${a.c_lastname}`.toLowerCase();
        const nameB = currentFilter === 'men'
          ? `${b.m_first} ${b.c_lastname}`.toLowerCase()
          : `${b.f_first} ${b.c_lastname}`.toLowerCase();
        compareA = nameA;
        compareB = nameB;
        break;

      case 'sponsor':
        compareA = (a.s_sponsor || '').toLowerCase();
        compareB = (b.s_sponsor || '').toLowerCase();
        break;

      case 'status':
        const statusA = getCalculatedStatus(a);
        const statusB = getCalculatedStatus(b);
        compareA = statusPriority[statusA] || 99;
        compareB = statusPriority[statusB] || 99;
        break;

      default:
        return 0;
    }

    if (sortColumn === 'status') {
      return sortDirection === 'asc' 
        ? compareA - compareB 
        : compareB - compareA;
    } else {
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
  });

  return (
    <div id="cra-apps" className="cra-view">
      <div style={{ fontSize: '10px', color: 'red', padding: '4px' }}>
        DEBUG: showEditForm={showEditForm ? 'TRUE' : 'FALSE'}, showFollowupForm={showFollowupForm ? 'TRUE' : 'FALSE'}
      </div>
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

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '100%' }}>
        <div 
          ref={tableRef}
          className="card pad"
          style={{
            width: (showFollowupForm || showEditForm) ? '60%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
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

          #cra-apps .card.pad > .table {
            display: block;
            overflow-y: auto;
            flex: 1;
          }

          #cra-apps .card.pad > .table thead {
            position: sticky;
            top: 0;
            background: var(--panel);
            z-index: 10;
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
                let candName = '';
                if (currentFilter === 'men') {
                  candName = `${app.m_first} ${app.m_pref ? `(${app.m_pref}) ` : ''}${app.c_lastname}`;
                } else {
                  candName = `${app.f_first} ${app.f_pref ? `(${app.f_pref}) ` : ''}${app.c_lastname}`;
                }

                const weekendFee = getPaymentStatusString(app, 'wk');
                const sponsorFee = getPaymentStatusString(app, 'sp');
                const status = getCalculatedStatus(app);
                const isExpanded = expandedRows.has(app.id);

                const rowStyle = status === 'Withdrawn' 
                  ? { backgroundColor: 'rgba(220, 53, 69, 0.08)' }
                  : (currentApp?.id === app.id && showFollowupForm)
                  ? { backgroundColor: 'rgba(40, 167, 69, 0.08)' }
                  : (currentEditApp?.id === app.id && showEditForm)
                  ? { backgroundColor: 'rgba(0, 163, 255, 0.08)' }
                  : {};

                const sponsorName = [app.s_first, app.s_last].filter(Boolean).join(' ') || 'N/A';
                const candPhone = currentFilter === 'men' ? (app.m_cell || 'N/A') : (app.f_cell || 'N/A');
                const candEmail = currentFilter === 'men' ? (app.m_email || 'N/A') : (app.f_email || 'N/A');
                const candDiet = currentFilter === 'men' ? (app.m_diettext || 'None') : (app.f_diettext || 'None');
                const candSmoking = currentFilter === 'men' ? (app.m_smoke ? 'Yes' : 'No') : (app.f_smoke ? 'Yes' : 'No');

                return (
                  <>
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
                            onClick={() => openEditForm(app)}
                            style={{
                              backgroundColor: (currentEditApp?.id === app.id && showEditForm) ? 'var(--accentB)' : undefined,
                              color: (currentEditApp?.id === app.id && showEditForm) ? 'white' : undefined
                            }}
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
                              backgroundColor: (currentApp?.id === app.id && showFollowupForm) ? 'var(--accentA)' : undefined
                            }}
                          >
                            Contact
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="expanded-row" style={{ ...rowStyle, borderTop: '1px solid var(--border)' }}>
                        <td colSpan="6" style={{ padding: '16px 24px', backgroundColor: 'var(--panel-header)' }}>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '16px',
                            fontSize: '0.9rem'
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                SPONSOR
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{sponsorName}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{app.s_phone || 'No phone'}</div>
                            </div>

                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                CANDIDATE CONTACT
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{candPhone}</div>
                              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{candEmail}</div>
                            </div>

                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                CHURCH
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{app.c_church || 'N/A'}</div>
                            </div>

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

                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '4px' }}>
                                DIET
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{candDiet}</div>
                            </div>

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
              width: '38%',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              height: editPanelHeight,
              display: 'flex',
              flexDirection: 'column',
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
                <div className="toggle toggle-compact">
                  <div 
                    className={`opt ${followupData.smoker === null ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('smoker', null)}
                  >
                    N/A
                  </div>
                  <div 
                    className={`opt ${followupData.smoker === 'no' ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('smoker', 'no')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.smoker === 'yes' ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('smoker', 'yes')}
                  >
                    Yes
                  </div>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Wheelchair?</label>
                <div className="toggle toggle-compact">
                  <div 
                    className={`opt ${followupData.wheelchair === null ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('wheelchair', null)}
                  >
                    N/A
                  </div>
                  <div 
                    className={`opt ${followupData.wheelchair === 'no' ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('wheelchair', 'no')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.wheelchair === 'yes' ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('wheelchair', 'yes')}
                  >
                    Yes
                  </div>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Special Diet?</label>
                <div className="toggle toggle-compact">
                  <div 
                    className={`opt ${followupData.diet === null ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('diet', null)}
                  >
                    N/A
                  </div>
                  <div 
                    className={`opt ${followupData.diet === 'no' ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('diet', 'no')}
                  >
                    No
                  </div>
                  <div 
                    className={`opt ${followupData.diet === 'yes' ? 'active' : ''}`}
                    onClick={() => handle3StateToggle('diet', 'yes')}
                  >
                    Yes
                  </div>
                </div>
              </div>
            </div>

            {followupData.diet === 'yes' && (
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

        {/* EDIT APPLICATION FORM - Side Panel */}
        {showEditForm && currentEditApp && (
          <div 
            className="card pad"
            style={{
              width: '38%',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              height: editPanelHeight,
              display: 'flex',
              flexDirection: 'column',
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
                Edit Application: {getCandidateName(currentEditApp)}
              </h3>
              <button 
                className="btn btn-small"
                onClick={closeEditForm}
                style={{ padding: '4px 12px', fontSize: '0.9rem' }}
              >
                Close ✕
              </button>
            </div>

            {/* CANDIDATE INFORMATION */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                Candidate Information
              </h4>
              
              <div className="grid grid-3" style={{ marginBottom: '12px' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    className="input"
                    value={currentFilter === 'men' ? editData.m_first : editData.f_first}
                    onChange={(e) => handleEditFieldChange(currentFilter === 'men' ? 'm_first' : 'f_first', e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Preferred Name</label>
                  <input
                    type="text"
                    className="input"
                    value={currentFilter === 'men' ? editData.m_pref : editData.f_pref}
                    onChange={(e) => handleEditFieldChange(currentFilter === 'men' ? 'm_pref' : 'f_pref', e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={editData.c_lastname}
                    onChange={(e) => handleEditFieldChange('c_lastname', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ marginBottom: '12px' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Cell Phone</label>
                  <input
                    type="text"
                    className="input"
                    value={currentFilter === 'men' ? editData.m_cell : editData.f_cell}
                    onChange={(e) => handleEditFieldChange(currentFilter === 'men' ? 'm_cell' : 'f_cell', e.target.value)}
                    onBlur={() => handlePhoneBlur(currentFilter === 'men' ? 'm_cell' : 'f_cell')}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={currentFilter === 'men' ? editData.m_email : editData.f_email}
                    onChange={(e) => handleEditFieldChange(currentFilter === 'men' ? 'm_email' : 'f_email', e.target.value)}
                    onBlur={() => handleEmailBlur(currentFilter === 'men' ? 'm_email' : 'f_email')}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: '12px' }}>
                <label className="label">Address</label>
                <input
                  type="text"
                  className="input"
                  value={editData.c_address}
                  onChange={(e) => handleEditFieldChange('c_address', e.target.value)}
                />
              </div>

              <div className="grid grid-3" style={{ marginBottom: '12px' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">City</label>
                  <input
                    type="text"
                    className="input"
                    value={editData.c_city}
                    onChange={(e) => handleEditFieldChange('c_city', e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">State</label>
                  <input
                    type="text"
                    className="input"
                    value={editData.c_state}
                    onChange={(e) => handleEditFieldChange('c_state', e.target.value)}
                    maxLength={2}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Zip</label>
                  <input
                    type="text"
                    className="input"
                    value={editData.c_zip}
                    onChange={(e) => handleEditFieldChange('c_zip', e.target.value)}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Church</label>
                <input
                  type="text"
                  className="input"
                  value={editData.c_church}
                  onChange={(e) => handleEditFieldChange('c_church', e.target.value)}
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            {/* SPONSOR INFORMATION */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                Sponsor Information
              </h4>
              
              <div className="grid grid-2" style={{ marginBottom: '12px' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    className="input"
                    value={editData.s_first}
                    onChange={(e) => handleEditFieldChange('s_first', e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={editData.s_last}
                    onChange={(e) => handleEditFieldChange('s_last', e.target.value)}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Phone</label>
                <input
                  type="text"
                  className="input"
                  value={editData.s_phone}
                  onChange={(e) => handleEditFieldChange('s_phone', e.target.value)}
                  onBlur={() => handlePhoneBlur('s_phone')}
                  placeholder="(xxx) xxx-xxxx"
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            {/* SPECIAL NEEDS */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                Special Needs
              </h4>

              <div className="grid grid-3">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Smoker?</label>
                  <div className="toggle toggle-compact">
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_smoke : editData.f_smoke) === null ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_smoke' : 'f_smoke', null)}
                    >
                      N/A
                    </div>
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_smoke : editData.f_smoke) === 'no' ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_smoke' : 'f_smoke', 'no')}
                    >
                      No
                    </div>
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_smoke : editData.f_smoke) === 'yes' ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_smoke' : 'f_smoke', 'yes')}
                    >
                      Yes
                    </div>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Wheelchair?</label>
                  <div className="toggle toggle-compact">
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_wheelchair : editData.f_wheelchair) === null ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_wheelchair' : 'f_wheelchair', null)}
                    >
                      N/A
                    </div>
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_wheelchair : editData.f_wheelchair) === 'no' ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_wheelchair' : 'f_wheelchair', 'no')}
                    >
                      No
                    </div>
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_wheelchair : editData.f_wheelchair) === 'yes' ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_wheelchair' : 'f_wheelchair', 'yes')}
                    >
                      Yes
                    </div>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Special Diet?</label>
                  <div className="toggle toggle-compact">
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_diet : editData.f_diet) === null ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_diet' : 'f_diet', null)}
                    >
                      N/A
                    </div>
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_diet : editData.f_diet) === 'no' ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_diet' : 'f_diet', 'no')}
                    >
                      No
                    </div>
                    <div 
                      className={`opt ${(currentFilter === 'men' ? editData.m_diet : editData.f_diet) === 'yes' ? 'active' : ''}`}
                      onClick={() => handleEdit3StateToggle(currentFilter === 'men' ? 'm_diet' : 'f_diet', 'yes')}
                    >
                      Yes
                    </div>
                  </div>
                </div>
              </div>

              {(currentFilter === 'men' ? editData.m_diet : editData.f_diet) === 'yes' && (
                <div className="field" style={{ marginTop: '12px', marginBottom: 0 }}>
                  <label className="label">Dietary Details</label>
                  <textarea 
                    className="textarea"
                    value={currentFilter === 'men' ? editData.m_diettext : editData.f_diettext}
                    onChange={(e) => handleEditFieldChange(currentFilter === 'men' ? 'm_diettext' : 'f_diettext', e.target.value)}
                    placeholder="e.g., Gluten-free, lactose intolerant, etc."
                    rows={3}
                  />
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            {/* WEEKEND FEE */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                Weekend Fee Payment
              </h4>

              {/* Main Payment Status - 3 Options */}
              <div className="toggle" style={{ display: 'flex', gap: '0', marginBottom: '12px' }}>
                <div 
                  className={`opt ${!editData.payment_wk_scholarship && !editData.payment_wk_cash && !editData.payment_wk_check ? 'active' : ''}`}
                  onClick={() => {
                    handleEditFieldChange('payment_wk_scholarship', false);
                    handleEditFieldChange('payment_wk_cash', false);
                    handleEditFieldChange('payment_wk_check', false);
                    handleEditFieldChange('payment_wk_scholarshiptype', '');
                    handleEditFieldChange('payment_wk_partialamount', '');
                    handleEditFieldChange('payment_wk_candidate_paid', 0);
                  }}
                  style={{ flex: 1 }}
                >
                  Unpaid
                </div>
                <div 
                  className={`opt ${!editData.payment_wk_scholarship && (editData.payment_wk_cash || editData.payment_wk_check) ? 'active' : ''}`}
                  onClick={() => {
                    handleEditFieldChange('payment_wk_scholarship', false);
                    handleEditFieldChange('payment_wk_cash', true);
                    handleEditFieldChange('payment_wk_check', false);
                    handleEditFieldChange('payment_wk_scholarshiptype', '');
                    handleEditFieldChange('payment_wk_partialamount', '');
                    handleEditFieldChange('payment_wk_candidate_paid', WEEKEND_FEE);
                  }}
                  style={{ flex: 1 }}
                >
                  Paid
                </div>
                <div 
                  className={`opt ${editData.payment_wk_scholarship ? 'active' : ''}`}
                  onClick={() => {
                    handleEditFieldChange('payment_wk_scholarship', true);
                    handleEditFieldChange('payment_wk_scholarshiptype', 'full');
                    handleEditFieldChange('payment_wk_cash', false);
                    handleEditFieldChange('payment_wk_check', false);
                    handleEditFieldChange('payment_wk_candidate_paid', 0);
                    handleEditFieldChange('payment_wk_partialamount', WEEKEND_FEE);
                  }}
                  style={{ flex: 1 }}
                >
                  Scholarship
                </div>
              </div>

              {/* If Paid - Show Payment Method & Amount */}
              {!editData.payment_wk_scholarship && (editData.payment_wk_cash || editData.payment_wk_check) && (
                <div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Payment Method</label>
                    <div className="toggle" style={{ display: 'flex', gap: '0' }}>
                      <div 
                        className={`opt ${editData.payment_wk_cash ? 'active' : ''}`}
                        onClick={() => {
                          handleEditFieldChange('payment_wk_cash', true);
                          handleEditFieldChange('payment_wk_check', false);
                        }}
                        style={{ flex: 1 }}
                      >
                        Cash
                      </div>
                      <div 
                        className={`opt ${editData.payment_wk_check ? 'active' : ''}`}
                        onClick={() => {
                          handleEditFieldChange('payment_wk_cash', false);
                          handleEditFieldChange('payment_wk_check', true);
                        }}
                        style={{ flex: 1 }}
                      >
                        Check
                      </div>
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label">Amount Paid</label>
                    <input
                      type="number"
                      className="input"
                      value={editData.payment_wk_candidate_paid}
                      onChange={(e) => handleEditFieldChange('payment_wk_candidate_paid', parseFloat(e.target.value) || 0)}
                      placeholder="Amount"
                    />
                  </div>
                </div>
              )}

              {/* If Scholarship - Show Type & Partial Details */}
              {editData.payment_wk_scholarship && (
                <div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Scholarship Type</label>
                    <div className="toggle" style={{ display: 'flex', gap: '0' }}>
                      <div 
                        className={`opt ${editData.payment_wk_scholarshiptype === 'full' ? 'active' : ''}`}
                        onClick={() => {
                          handleEditFieldChange('payment_wk_scholarshiptype', 'full');
                          handleEditFieldChange('payment_wk_candidate_paid', 0);
                          handleEditFieldChange('payment_wk_partialamount', WEEKEND_FEE);
                          handleEditFieldChange('payment_wk_cash', false);
                          handleEditFieldChange('payment_wk_check', false);
                        }}
                        style={{ flex: 1 }}
                      >
                        Full
                      </div>
                      <div 
                        className={`opt ${editData.payment_wk_scholarshiptype === 'partial' ? 'active' : ''}`}
                        onClick={() => {
                          handleEditFieldChange('payment_wk_scholarshiptype', 'partial');
                          handleEditFieldChange('payment_wk_cash', true);
                          handleEditFieldChange('payment_wk_check', false);
                          handleEditFieldChange('payment_wk_candidate_paid', 0);
                          handleEditFieldChange('payment_wk_partialamount', WEEKEND_FEE);
                        }}
                        style={{ flex: 1 }}
                      >
                        Partial
                      </div>
                    </div>
                  </div>

                  {/* If Partial Scholarship - Show Candidate Payment */}
                  {editData.payment_wk_scholarshiptype === 'partial' && (
                    <div style={{ 
                      background: 'var(--surface)', 
                      padding: '16px', 
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                        Candidate Payment
                      </h5>
                      
                      <div className="field" style={{ marginBottom: '12px' }}>
                        <label className="label">Payment Method</label>
                        <div className="toggle" style={{ display: 'flex', gap: '0' }}>
                          <div 
                            className={`opt ${editData.payment_wk_cash ? 'active' : ''}`}
                            onClick={() => {
                              handleEditFieldChange('payment_wk_cash', true);
                              handleEditFieldChange('payment_wk_check', false);
                            }}
                            style={{ flex: 1 }}
                          >
                            Cash
                          </div>
                          <div 
                            className={`opt ${editData.payment_wk_check ? 'active' : ''}`}
                            onClick={() => {
                              handleEditFieldChange('payment_wk_cash', false);
                              handleEditFieldChange('payment_wk_check', true);
                            }}
                            style={{ flex: 1 }}
                          >
                            Check
                          </div>
                        </div>
                      </div>

                      <div className="field" style={{ marginBottom: '12px' }}>
                        <label className="label">Amount Candidate Paid</label>
                        <input
                          type="number"
                          className="input"
                          value={editData.payment_wk_candidate_paid}
                          onChange={(e) => {
                            const candidatePaid = parseFloat(e.target.value) || 0;
                            const scholarshipAmount = WEEKEND_FEE - candidatePaid;
                            handleEditFieldChange('payment_wk_candidate_paid', candidatePaid);
                            handleEditFieldChange('payment_wk_partialamount', scholarshipAmount);
                          }}
                          placeholder="Amount paid by candidate"
                        />
                      </div>

                      <div style={{ 
                        padding: '12px', 
                        background: 'var(--panel)', 
                        borderRadius: '6px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        fontSize: '0.85rem'
                      }}>
                        <div>
                          <div style={{ color: 'var(--muted)', marginBottom: '4px' }}>Weekend Fee</div>
                          <div style={{ fontWeight: 700 }}>${WEEKEND_FEE}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--muted)', marginBottom: '4px' }}>Candidate Paid</div>
                          <div style={{ fontWeight: 700, color: 'var(--accentA)' }}>
                            ${editData.payment_wk_candidate_paid || 0}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--muted)', marginBottom: '4px' }}>Scholarship</div>
                          <div style={{ fontWeight: 700, color: 'var(--accentB)' }}>
                            ${editData.payment_wk_partialamount || WEEKEND_FEE}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            {/* SPONSOR FEE */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                Sponsor Fee Payment Method
              </h4>

              <div className="toggle" style={{ display: 'flex', gap: '0' }}>
                <div 
                  className={`opt ${editData.payment_sp_cash && !editData.payment_sp_check ? 'active' : ''}`}
                  onClick={() => {
                    handleEditFieldChange('payment_sp_cash', true);
                    handleEditFieldChange('payment_sp_check', false);
                  }}
                  style={{ flex: 1 }}
                >
                  Cash
                </div>
                <div 
                  className={`opt ${editData.payment_sp_check && !editData.payment_sp_cash ? 'active' : ''}`}
                  onClick={() => {
                    handleEditFieldChange('payment_sp_cash', false);
                    handleEditFieldChange('payment_sp_check', true);
                  }}
                  style={{ flex: 1 }}
                >
                  Check
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            {/* LETTERS */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                Letters
              </h4>

              <div className="grid grid-2">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Sponsor Letter Sent?</label>
                  <div className="toggle">
                    <div 
                      className={`opt ${!editData.letter_sent_sponsor ? 'active' : ''}`}
                      onClick={() => handleEditToggle('letter_sent_sponsor')}
                    >
                      No
                    </div>
                    <div 
                      className={`opt ${editData.letter_sent_sponsor ? 'active' : ''}`}
                      onClick={() => handleEditToggle('letter_sent_sponsor')}
                    >
                      Yes
                    </div>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Candidate Letter Sent?</label>
                  <div className="toggle">
                    <div 
                      className={`opt ${!editData.letter_sent_candidate ? 'active' : ''}`}
                      onClick={() => handleEditToggle('letter_sent_candidate')}
                    >
                      No
                    </div>
                    <div 
                      className={`opt ${editData.letter_sent_candidate ? 'active' : ''}`}
                      onClick={() => handleEditToggle('letter_sent_candidate')}
                    >
                      Yes
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)'
            }}>
              <button 
                className="btn" 
                onClick={closeEditForm}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={saveEdit}
                style={{ flex: 1 }}
              >
                Save Changes
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