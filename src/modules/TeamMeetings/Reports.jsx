// src/modules/TeamMeetings/Reports.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function Reports() {
  const { orgId, user } = useAuth();
  const [currentGender, setCurrentGender] = useState('men');
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [memberDetails, setMemberDetails] = useState({});
  const [checkinData, setCheckinData] = useState({});
  const [totals, setTotals] = useState(null);
  const [noAttendanceMembers, setNoAttendanceMembers] = useState([]);
  const [showNoAttendanceModal, setShowNoAttendanceModal] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  // Fee settings loaded from database
  const [weekendFee, setWeekendFee] = useState(265); // Default fallback
  const [teamFee, setTeamFee] = useState(30); // Default fallback
  const [feesLoaded, setFeesLoaded] = useState(false);

  // Constants
  const MEETING_COUNT = 6;
  const feeExemptRoles = ['Rector', 'Head Spiritual Director', 'Spiritual Director'];

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  // Helper function to format recorded_by name
  const formatRecordedBy = (email, fullName) => {
    if (fullName) {
      // "John Smith" → "J. Smith"
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}. ${parts[parts.length - 1]}`;
      }
      return fullName;
    }
    // Fallback: parse from email
    // "john.smith@example.com" → "J. Smith"
    const name = email.split('@')[0];
    const parts = name.split('.');
    if (parts.length >= 2) {
      return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1].charAt(0).toUpperCase()}${parts[parts.length - 1].slice(1)}`;
    }
    return email.split('@')[0];
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  // Load fee settings from database
  useEffect(() => {
    async function loadFeeSettings() {
      if (!orgId) return;
      
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('weekend_fee, team_fee')
          .eq('org_id', orgId)
          .single();

        if (error) {
          console.warn('Error loading fee settings, using defaults:', error);
          setFeesLoaded(true);
          return;
        }

        if (data) {
          setWeekendFee(parseFloat(data.weekend_fee) || 265);
          setTeamFee(parseFloat(data.team_fee) || 30);
          console.log('Loaded fee settings:', data);
        }
        
        setFeesLoaded(true);
      } catch (error) {
        console.error('Failed to load fee settings:', error);
        setFeesLoaded(true);
      }
    }

    loadFeeSettings();
  }, [orgId]);

  const handleGenderToggle = async (gender) => {
    setCurrentGender(gender);
    setMemberDetails({});
    setCheckinData({});
    setTotals(null);
    setExpandedMemberId(null);
    await loadLatestTeamByGender(gender);
  };

  const loadLatestTeamByGender = async (gender) => {
    const rosterTable = gender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    
    try {
      const { data: teams, error } = await supabase
        .from(rosterTable)
        .select('weekend_identifier')
        .eq('org_id', orgId);
      
      if (error) throw error;

      const prefix = gender.charAt(0).toUpperCase() + gender.slice(1) + "'s ";
      let latest = { number: 0, identifier: null };
      
      (teams || []).forEach(team => {
        const idStr = (team.weekend_identifier || '').trim();
        if (idStr.startsWith(prefix)) {
          const num = parseInt(idStr.match(/\d+/)?.[0] || '0', 10);
          if (num > latest.number) {
            latest = { number: num, identifier: idStr };
          }
        }
      });

      if (latest.identifier) {
        await loadTeamData(latest.identifier, gender);
      } else {
        setCurrentTeamId(null);
        setMemberDetails({});
        setCheckinData({});
        setTotals(null);
      }
    } catch (error) {
      console.error('Error loading latest team:', error);
    }
  };

  const loadTeamData = async (teamId, gender) => {
    const rosterTable = gender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    const rawTable = gender === 'men' ? 'men_raw' : 'women_raw';
    
    try {
      const { data: roster, error: rosterError } = await supabase
        .from(rosterTable)
        .select('*')
        .eq('weekend_identifier', teamId)
        .eq('org_id', orgId);
      
      if (rosterError) throw rosterError;

      const keys = [...new Set(roster.map(r => r.pescadore_key))];

      const { data: profiles, error: profilesError } = await supabase
        .from(rawTable)
        .select('PescadoreKey, First, Last, Email')
        .in('PescadoreKey', keys)
        .eq('org_id', orgId);
      
      if (profilesError) throw profilesError;

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[String(p.PescadoreKey)] = p;
        return acc;
      }, {});

      const details = {};
      (roster || []).forEach(r => {
        const prof = profileMap[String(r.pescadore_key)];
        const name = prof ? `${prof.First || ''} ${prof.Last || ''}`.trim() : 'Unknown Member';
        const role = (r.role || '').replace('Prof_', '');
        details[String(r.pescadore_key)] = {
          name,
          role,
          email: prof ? prof.Email : ''
        };
      });

      const { data: saved, error: loadErr } = await supabase
        .from('mci_checkin_data')
        .select('member_id, checkin_details')
        .eq('team_id', teamId)
        .eq('org_id', orgId);

      if (loadErr) console.warn('Checkin load error:', loadErr);

      const checkins = {};
      Object.keys(details).forEach(id => {
        const row = (saved || []).find(x => String(x.member_id) === String(id));
        const savedData = row?.checkin_details || {};
        
        let weekendFeeData = savedData.weekendFee || [];
        if (!Array.isArray(weekendFeeData)) {
          if (weekendFeeData.amount) {
            weekendFeeData = [{ method: 'cash', amount: weekendFeeData.amount }];
          } else {
            weekendFeeData = [];
          }
        }
        
        checkins[id] = {
          attendance: savedData.attendance || {},
          weekendFee: weekendFeeData,
          teamFee: savedData.teamFee || {},
          palancaLetter: savedData.palancaLetter || false
        };
      });

      setCurrentTeamId(teamId);
      setMemberDetails(details);
      setCheckinData(checkins);
      
      setTimeout(() => {
        computeTotals(details, checkins);
      }, 0);
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  const computeTotals = (details, checkins) => {
    const t = {
      expected: 0,
      collected: 0,
      weekendExpected: 0,
      teamExpected: 0,
      weekendCollected: 0,
      teamCollected: 0,
      overdue: 0,
      cashCollected: 0,
      checkCollected: 0,
      onlineCollected: 0,
      noAttendanceMembers: [],
      meetings: {}
    };

    for (let i = 1; i <= MEETING_COUNT; i++) {
      t.meetings[i] = { attended: 0, percentage: 0 };
    }

    Object.keys(details).forEach(id => {
      const m = details[id];
      const chk = checkins[id];
      if (!m || !chk) return;

      const isFeeWaived = feeExemptRoles.includes(m.role);

      const wkExp = isFeeWaived ? 0 : weekendFee;
      const tmExp = teamFee;

      const wkColl = isFeeWaived ? 0 : (chk.weekendFee || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const tmColl = chk.teamFee?.paid ? tmExp : 0;

      t.weekendExpected += wkExp;
      t.teamExpected += tmExp;
      t.weekendCollected += wkColl;
      t.teamCollected += tmColl;
      t.expected += wkExp + tmExp;
      t.collected += wkColl + tmColl;

      (chk.weekendFee || []).forEach(payment => {
        if (payment.amount > 0) {
          if (payment.method === 'cash') t.cashCollected += payment.amount;
          else if (payment.method === 'check') t.checkCollected += payment.amount;
          else if (payment.method === 'online') t.onlineCollected += payment.amount;
        }
      });

      if (chk.teamFee?.paid) {
        t.cashCollected += tmExp;
      }

      const due = (wkExp - wkColl) + (tmExp - tmColl);
      if (due > 0.01) t.overdue += 1;

      const meetingsAttended = Object.values(chk.attendance || {}).filter(Boolean).length;
      if (meetingsAttended === 0) {
        t.noAttendanceMembers.push({ name: m.name, email: m.email });
      }

      for (let i = 1; i <= MEETING_COUNT; i++) {
        if (chk.attendance?.[i] === true || chk.attendance?.[i] === 'zoom') {
          t.meetings[i].attended++;
        }
      }
    });

    const totalMembers = Object.keys(details).length;
    if (totalMembers > 0) {
      for (let i = 1; i <= MEETING_COUNT; i++) {
        t.meetings[i].percentage = (t.meetings[i].attended / totalMembers) * 100;
      }
    }

    setTotals(t);
    setNoAttendanceMembers(t.noAttendanceMembers);
  };

  const copyEmails = () => {
    const emails = noAttendanceMembers
      .map(m => m.email)
      .filter(Boolean)
      .join(', ');

    if (!emails) {
      window.showMainStatus('No emails to copy for this list.', true);
      return;
    }

    navigator.clipboard.writeText(emails).then(() => {
      window.showMainStatus('Emails copied to clipboard!');
    }).catch(() => {
      window.showMainStatus('Failed to copy emails.', true);
    });
  };

  const printStatusReport = () => {
    console.log('Print report - TODO: Implement with printJS library');
  };

  useEffect(() => {
    if (orgId && feesLoaded) {
      handleGenderToggle('men');
    }
  }, [orgId, feesLoaded]);

  const renderMeetingDots = (chk) => {
    const dots = [];
    for (let i = 1; i <= MEETING_COUNT; i++) {
      const attended = chk.attendance?.[i] === true || chk.attendance?.[i] === 'zoom';
      dots.push(
        <span 
          key={i}
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: attended ? 'var(--accentA)' : 'transparent',
            border: `2px solid ${attended ? 'var(--accentA)' : 'var(--muted)'}`,
            marginRight: i < MEETING_COUNT ? '4px' : '0'
          }}
        />
      );
    }
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '12px' }}>{dots}</div>;
  };

  const renderOverallStatus = (chk, member) => {
    const isFeeWaived = feeExemptRoles.includes(member.role);
    const wkPaid = isFeeWaived ? weekendFee : (chk.weekendFee || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const wkDue = isFeeWaived ? 0 : Math.max(0, weekendFee - wkPaid);
    
    const meetingsAttended = Object.values(chk.attendance || {}).filter(Boolean).length;
    const overall = (meetingsAttended >= 3 && wkDue < 0.01 && chk.teamFee?.paid && chk.palancaLetter) 
      ? 'Complete' 
      : 'Pending';
    
    return (
      <span style={{ 
        fontWeight: overall === 'Complete' ? 800 : 'normal',
        color: overall === 'Complete' ? 'var(--accentA)' : 'inherit'
      }}>
        {overall}
      </span>
    );
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 80) return 'var(--accentA)';
    if (percentage >= 50) return 'var(--accentC)';
    return 'var(--accentD)';
  };

  const toggleExpandMember = (memberId) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  const renderPaymentHistory = (memberId) => {
    const chk = checkinData[memberId];
    if (!chk) return null;

    const hasWeekendPayments = chk.weekendFee && chk.weekendFee.length > 0;
    const hasTeamPayment = chk.teamFee?.paid && chk.teamFee.timestamp;

    if (!hasWeekendPayments && !hasTeamPayment) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic' }}>
          No payment history recorded yet.
        </div>
      );
    }

    return (
      <div style={{ 
        padding: '16px 24px', 
        background: 'var(--surface)',
        display: 'grid',
        gridTemplateColumns: hasWeekendPayments && hasTeamPayment ? '1fr 1fr' : '1fr',
        gap: '24px'
      }}>
        {hasWeekendPayments && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '0.9rem' }}>
              Weekend Fee Payments:
            </div>
            {chk.weekendFee.map((payment, idx) => (
              <div key={idx} style={{ 
                padding: '8px 12px',
                marginBottom: '6px',
                background: 'var(--panel)',
                borderRadius: '4px',
                fontSize: '0.85rem',
                borderLeft: '3px solid var(--accentB)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                    {payment.method}
                  </span>
                  <span style={{ fontWeight: '700' }}>
                    {fmt(payment.amount)}
                  </span>
                </div>
                {payment.timestamp && (
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {formatTimestamp(payment.timestamp)} by{' '}
                    {formatRecordedBy(payment.recorded_by, user?.full_name)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {hasTeamPayment && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '0.9rem' }}>
              Team Fee Payment:
            </div>
            <div style={{ 
              padding: '8px 12px',
              background: 'var(--panel)',
              borderRadius: '4px',
              fontSize: '0.85rem',
              borderLeft: '3px solid var(--accentA)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontWeight: '600' }}>Cash</span>
                <span style={{ fontWeight: '700' }}>
                  {fmt(chk.teamFee.amount)}
                </span>
              </div>
              {chk.teamFee.timestamp && (
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                  {formatTimestamp(chk.teamFee.timestamp)} by{' '}
                  {formatRecordedBy(chk.teamFee.recorded_by, user?.full_name)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section id="meeting-check-in-app" className="app-panel mci-app" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div id="mciControls" style={{ marginBottom: '16px', display: 'flex', maxWidth: '250px' }}>
        <div>
          <label className="label">Select Team</label>
          <div className="toggle" id="mciGenderToggle">
            <div 
              className={`opt ${currentGender === 'men' ? 'active' : ''}`}
              onClick={() => handleGenderToggle('men')}
            >
              Men
            </div>
            <div 
              className={`opt ${currentGender === 'women' ? 'active' : ''}`}
              onClick={() => handleGenderToggle('women')}
            >
              Women
            </div>
          </div>
        </div>
      </div>

      <div id="reportsScreen" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="detail-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="reports-header">
            <h2>Team Reports</h2>
          </div>
          
          <div style={{ overflowY: 'auto', flexGrow: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="card pad">
                <div className="label">Total Expected</div>
                <div id="totalExpected" style={{ fontSize: '28px', fontWeight: 900 }}>
                  {totals ? fmt(totals.expected) : '$0.00'}
                </div>
              </div>
              <div className="card pad">
                <div className="label">Total Collected</div>
                <div id="totalCollected" style={{ fontSize: '28px', fontWeight: 900 }}>
                  {totals ? fmt(totals.collected) : '$0.00'}
                </div>
              </div>
              <div className="card pad">
                <div className="label">Balance Due</div>
                <div id="balanceDue" style={{ fontSize: '28px', fontWeight: 900 }}>
                  {totals ? fmt(totals.expected - totals.collected) : '$0.00'}
                </div>
              </div>
              <div className="card pad">
                <div className="label">Overdue Items</div>
                <div id="overdueItems" style={{ fontSize: '28px', fontWeight: 900 }}>
                  {totals ? totals.overdue : 0}
                </div>
              </div>
            </div>

            <div 
              className="card pad"
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: showNoAttendanceModal ? '1px solid var(--accentB)' : '1px solid var(--border)'
              }}
              onClick={() => setShowNoAttendanceModal(!showNoAttendanceModal)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="label" style={{ marginBottom: '4px' }}>No Attendance</div>
                  <div style={{ fontSize: '28px', fontWeight: 900 }}>
                    {totals ? totals.noAttendanceMembers.length : 0}
                  </div>
                </div>
                <span 
                  style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700,
                    transition: 'transform 0.2s',
                    transform: showNoAttendanceModal ? 'rotate(90deg)' : 'rotate(0deg)',
                    display: 'inline-block'
                  }}
                >
                  ›
                </span>
              </div>
              
              {showNoAttendanceModal && (
                <div 
                  style={{ 
                    marginTop: '16px', 
                    paddingTop: '16px', 
                    borderTop: '2px solid var(--accentB)',
                    animation: 'slideDown 0.3s ease-out'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {noAttendanceMembers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--muted)', margin: 0 }}>
                      All members have recorded attendance.
                    </p>
                  ) : (
                    <>
                      <ul style={{ 
                        listStyle: 'none', 
                        padding: 0, 
                        margin: '0 0 16px 0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px'
                      }}>
                        {noAttendanceMembers.sort((a, b) => a.name.localeCompare(b.name)).map((member, idx) => (
                          <li key={idx} style={{ 
                            padding: '8px 12px', 
                            background: 'var(--bg)',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}>
                            {member.name}
                          </li>
                        ))}
                      </ul>
                      <button 
                        className="btn btn-info" 
                        onClick={copyEmails}
                        style={{ width: '100%' }}
                      >
                        Copy Emails
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="card pad">
              <div className="section-title">Meeting Summary</div>
              <div className="grid grid-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="card pad">
                    <div className="small-card-header">Meeting {i}</div>
                    <div className="financial-line">
                      <span>Attended:</span>
                      <span id={`meeting${i}Attendees`}>
                        {totals ? totals.meetings[i].attended : 0}
                      </span>
                    </div>
                    <div className="financial-line">
                      <span>Percent:</span>
                      <span 
                        id={`meeting${i}Percentage`}
                        style={{ color: totals ? getPercentageColor(totals.meetings[i].percentage) : 'inherit' }}
                      >
                        {totals ? `${totals.meetings[i].percentage.toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card pad">
              <div className="section-title">Financial Summary</div>
              <div className="grid grid-3">
                <div className="card pad">
                  <div className="small-card-header">Weekend</div>
                  <div className="financial-line">
                    <span>Expected:</span>
                    <span id="weekendExpected">{totals ? fmt(totals.weekendExpected) : '$0.00'}</span>
                  </div>
                  <div className="financial-line">
                    <span>Collected:</span>
                    <span id="weekendCollected" style={{ color: 'var(--accentA)' }}>
                      {totals ? fmt(totals.weekendCollected) : '$0.00'}
                    </span>
                  </div>
                  <div className="financial-line">
                    <span>Balance:</span>
                    <span 
                      id="weekendBalance"
                      style={{ color: totals && (totals.weekendExpected - totals.weekendCollected) > 0.01 ? 'var(--accentD)' : 'var(--accentA)' }}
                    >
                      {totals ? fmt(totals.weekendExpected - totals.weekendCollected) : '$0.00'}
                    </span>
                  </div>
                </div>
                <div className="card pad">
                  <div className="small-card-header">Team</div>
                  <div className="financial-line">
                    <span>Expected:</span>
                    <span id="teamExpected">{totals ? fmt(totals.teamExpected) : '$0.00'}</span>
                  </div>
                  <div className="financial-line">
                    <span>Collected:</span>
                    <span id="teamCollected" style={{ color: 'var(--accentA)' }}>
                      {totals ? fmt(totals.teamCollected) : '$0.00'}
                    </span>
                  </div>
                  <div className="financial-line">
                    <span>Balance:</span>
                    <span 
                      id="teamBalance"
                      style={{ color: totals && (totals.teamExpected - totals.teamCollected) > 0.01 ? 'var(--accentD)' : 'var(--accentA)' }}
                    >
                      {totals ? fmt(totals.teamExpected - totals.teamCollected) : '$0.00'}
                    </span>
                  </div>
                </div>
                <div className="card pad">
                  <div className="small-card-header">Payment Methods</div>
                  <div className="financial-line">
                    <span>Cash:</span>
                    <span id="cashCollected" style={{ color: 'var(--accentA)' }}>
                      {totals ? fmt(totals.cashCollected) : '$0.00'}
                    </span>
                  </div>
                  <div className="financial-line">
                    <span>Check:</span>
                    <span id="checkCollected" style={{ color: 'var(--accentB)' }}>
                      {totals ? fmt(totals.checkCollected) : '$0.00'}
                    </span>
                  </div>
                  <div className="financial-line">
                    <span>Online:</span>
                    <span id="onlineCollected" style={{ color: 'var(--accentC)' }}>
                      {totals ? fmt(totals.onlineCollected) : '$0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Team Summary</div>
                <button className="btn btn-warning" onClick={printStatusReport}>Print PDF Report</button>
              </div>
              <table className="table" id="statusReportTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'left', paddingLeft: '12px' }}>Meetings</th>
                    <th colSpan="2" style={{ textAlign: 'center', borderBottom: '2px solid var(--accentB)' }}>Weekend Fee</th>
                    <th colSpan="2" style={{ textAlign: 'center', borderBottom: '2px solid var(--accentB)' }}>Team Fee</th>
                    <th style={{ textAlign: 'center' }}>Palanca</th>
                    <th style={{ textAlign: 'center' }}>Overall</th>
                    <th style={{ textAlign: 'center', width: '50px' }}>Details</th>
                  </tr>
                  <tr>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th style={{ textAlign: 'left', fontSize: '0.85rem', paddingLeft: '12px' }}>Status</th>
                    <th style={{ textAlign: 'left', fontSize: '0.85rem', paddingLeft: '8px' }}>Payment</th>
                    <th style={{ textAlign: 'left', fontSize: '0.85rem', paddingLeft: '12px' }}>Status</th>
                    <th style={{ textAlign: 'left', fontSize: '0.85rem', paddingLeft: '8px' }}>Payment</th>
                    <th></th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="statusTableBody">
                  {Object.keys(memberDetails).length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                        No team data loaded.
                      </td>
                    </tr>
                  ) : (
                    Object.keys(memberDetails)
                      .sort((a, b) => memberDetails[a].name.localeCompare(memberDetails[b].name))
                      .map(id => {
                        const m = memberDetails[id];
                        const chk = checkinData[id];
                        const isExpanded = expandedMemberId === id;
                        
                        const isFeeWaived = feeExemptRoles.includes(m.role);
                        const wkPaid = isFeeWaived ? weekendFee : (chk.weekendFee || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                        const wkDue = isFeeWaived ? 0 : Math.max(0, weekendFee - wkPaid);
                        let weekendStatus = 'DUE';
                        let weekendDetail = '';
                        
                        if (isFeeWaived) {
                          weekendStatus = 'WAIVED';
                          weekendDetail = '';
                        } else if (wkDue < 0.01) {
                          weekendStatus = 'PAID';
                          const methods = [...new Set((chk.weekendFee || []).map(p => p.method).filter(Boolean))];
                          weekendDetail = methods.join(' + ');
                        } else if (wkPaid > 0) {
                          weekendStatus = 'PARTIAL';
                          const methods = [...new Set((chk.weekendFee || []).map(p => p.method).filter(Boolean))];
                          weekendDetail = `${methods.join(' + ')} · ${fmt(wkDue)} due`;
                        } else {
                          weekendDetail = `${fmt(weekendFee)} due`;
                        }
                        
                        const tmPaid = chk.teamFee?.paid ? teamFee : 0;
                        const tmDue = teamFee - tmPaid;
                        let teamStatus = 'DUE';
                        let teamDetail = '';
                        
                        if (tmDue < 0.01) {
                          teamStatus = 'PAID';
                          teamDetail = 'cash';
                        } else {
                          teamDetail = `${fmt(teamFee)} due`;
                        }
                        
                        return (
                          <>
                            <tr key={id}>
                              <td>{m.name}</td>
                              <td>{m.role || ''}</td>
                              <td style={{ textAlign: 'center' }}>{renderMeetingDots(chk)}</td>
                              <td style={{ textAlign: 'left', paddingLeft: '12px' }}>
                                <span className={`payment-status-text ${weekendStatus.toLowerCase()}`}>
                                  {weekendStatus}
                                </span>
                              </td>
                              <td style={{ textAlign: 'left', paddingLeft: '8px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                {weekendDetail}
                              </td>
                              <td style={{ textAlign: 'left', paddingLeft: '12px' }}>
                                <span className={`payment-status-text ${teamStatus.toLowerCase()}`}>
                                  {teamStatus}
                                </span>
                              </td>
                              <td style={{ textAlign: 'left', paddingLeft: '8px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                {teamDetail}
                              </td>
                              <td style={{ textAlign: 'center' }}>{chk.palancaLetter ? 'Yes' : 'No'}</td>
                              <td style={{ textAlign: 'center' }}>{renderOverallStatus(chk, m)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => toggleExpandMember(id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    color: 'var(--accentB)',
                                    padding: '4px 8px',
                                    transition: 'transform 0.2s',
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    display: 'inline-block'
                                  }}
                                >
                                  ›
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${id}-expanded`}>
                                <td colSpan="10" style={{ padding: 0, background: 'var(--surface)' }}>
                                  {renderPaymentHistory(id)}
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
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
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
    </section>
  );
}