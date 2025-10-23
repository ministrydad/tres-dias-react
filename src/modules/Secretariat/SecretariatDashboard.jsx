// src/modules/Secretariat/SecretariatDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

// Configuration constant from original
const MEETING_COUNT = 8; // Number of meetings per team

export default function SecretariatDashboard() {
  const { orgId } = useAuth();
  
  // State for secretariat data
  const [loading, setLoading] = useState(true);
  const [secretariatRoster, setSecretariatRoster] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  
  // State for weekend history
  const [weekendHistoryData, setWeekendHistoryData] = useState([]);
  const [menRoster, setMenRoster] = useState([]);
  const [womenRoster, setWomenRoster] = useState([]);
  const [craApps, setCraApps] = useState([]);
  const [mciData, setMciData] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Positions array from original
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

  useEffect(() => {
    if (orgId) {
      loadAllData();
    }
  }, [orgId]);

  async function loadAllData() {
    try {
      setLoading(true);

      const [
        rosterResult,
        menResult,
        womenResult,
        historyResult,
        menRosterResult,
        womenRosterResult,
        craAppsResult,
        mciDataResult
      ] = await Promise.all([
        supabase.from('secretariat_roster').select('*').eq('org_id', orgId),
        supabase.from('men_raw').select('PescadoreKey, First, Last, Preferred').eq('org_id', orgId),
        supabase.from('women_raw').select('PescadoreKey, First, Last, Preferred').eq('org_id', orgId),
        supabase.from('weekend_history').select('*').eq('org_id', orgId),
        supabase.from('men_team_rosters').select('*').eq('org_id', orgId),
        supabase.from('women_team_rosters').select('*').eq('org_id', orgId),
        supabase.from('cra_applications').select('m_first, f_first').eq('org_id', orgId),
        supabase.from('mci_checkin_data').select('team_id, member_id, checkin_details').eq('org_id', orgId)
      ]);

      if (rosterResult.error) throw rosterResult.error;
      if (menResult.error) throw menResult.error;
      if (womenResult.error) throw womenResult.error;
      if (historyResult.error) throw historyResult.error;
      if (menRosterResult.error) throw menRosterResult.error;
      if (womenRosterResult.error) throw womenRosterResult.error;
      if (craAppsResult.error) throw craAppsResult.error;
      if (mciDataResult.error) throw mciDataResult.error;

      setSecretariatRoster(rosterResult.data || []);
      
      // Combine men and women for member lookup
      const allPeople = [
        ...(menResult.data || []),
        ...(womenResult.data || [])
      ];
      setAllMembers(allPeople);

      setWeekendHistoryData(historyResult.data || []);
      setMenRoster(menRosterResult.data || []);
      setWomenRoster(womenRosterResult.data || []);
      setCraApps(craAppsResult.data || []);
      setMciData(mciDataResult.data || []);

    } catch (error) {
      console.error('Error loading secretariat data:', error);
      window.showMainStatus(`Error loading data: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  }

  function findMemberName(memberId) {
    if (!memberId) return null;
    const member = allMembers.find(m => String(m.PescadoreKey) === String(memberId));
    if (!member) return `Unknown (ID: ${memberId})`;
    return `${member.Preferred || member.First} ${member.Last}`.trim();
  }

  function calculateActiveWeekend() {
    if (menRoster.length === 0 && womenRoster.length === 0) return null;

    const menWeekendId = menRoster.length > 0 ? menRoster[0].weekend_identifier : null;
    const womenWeekendId = womenRoster.length > 0 ? womenRoster[0].weekend_identifier : null;
    
    const activeWeekendNum = Math.max(
      parseInt(menWeekendId?.match(/\d+$/)?.[0] || '0'),
      parseInt(womenWeekendId?.match(/\d+$/)?.[0] || '0')
    );

    if (activeWeekendNum === 0) return null;

    const activeWeekend = { num: activeWeekendNum, men: null, women: null };

    // Process Men's Active Data
    if (menRoster.length > 0) {
      const rector = menRoster.find(m => m.role === 'Rector');
      const teamCount = menRoster.length;
      const candidateCount = craApps.filter(app => app.m_first && app.m_first.trim() !== '').length;

      // Calculate avg meeting attendance for men
      const menMciForTeam = mciData.filter(d => d.team_id === menWeekendId);
      let totalMeetingsAttended = 0;
      menMciForTeam.forEach(memberData => {
        const attendance = memberData.checkin_details?.attendance || {};
        totalMeetingsAttended += Object.values(attendance).filter(att => att === true || att === 'zoom').length;
      });
      const totalPossibleMeetings = teamCount * MEETING_COUNT;
      const avgMeetingAttd = totalPossibleMeetings > 0 ? (totalMeetingsAttended / totalPossibleMeetings) * 100 : 0;

      activeWeekend.men = {
        rector_pescadore_key: rector ? rector.pescadore_key : null,
        team_member_count: teamCount,
        candidate_count: candidateCount,
        avg_meeting_attd: avgMeetingAttd
      };
    }

    // Process Women's Active Data
    if (womenRoster.length > 0) {
      const rector = womenRoster.find(m => m.role === 'Rector');
      const teamCount = womenRoster.length;
      const candidateCount = craApps.filter(app => app.f_first && app.f_first.trim() !== '').length;

      // Calculate avg meeting attendance for women
      const womenMciForTeam = mciData.filter(d => d.team_id === womenWeekendId);
      let totalMeetingsAttended = 0;
      womenMciForTeam.forEach(memberData => {
        const attendance = memberData.checkin_details?.attendance || {};
        totalMeetingsAttended += Object.values(attendance).filter(att => att === true || att === 'zoom').length;
      });
      const totalPossibleMeetings = teamCount * MEETING_COUNT;
      const avgMeetingAttd = totalPossibleMeetings > 0 ? (totalMeetingsAttended / totalPossibleMeetings) * 100 : 0;

      activeWeekend.women = {
        rector_pescadore_key: rector ? rector.pescadore_key : null,
        team_member_count: teamCount,
        candidate_count: candidateCount,
        avg_meeting_attd: avgMeetingAttd
      };
    }

    return activeWeekend;
  }

  function toggleRow(weekendId) {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekendId)) {
        newSet.delete(weekendId);
      } else {
        newSet.add(weekendId);
      }
      return newSet;
    });
  }

  function renderDetailRow(gender, data, isActive) {
    if (!data) {
      return (
        <tr key={gender}>
          <td><strong>{gender}</strong></td>
          <td colSpan="5" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
            No data for this weekend
          </td>
        </tr>
      );
    }

    const rectorName = findMemberName(data.rector_pescadore_key) || 'N/A';
    const meetingAttdDisplay = data.avg_meeting_attd !== undefined
      ? <strong style={{ color: 'var(--accentA)' }}>{data.avg_meeting_attd.toFixed(1)}%</strong>
      : 'N/A';

    const editButton = isActive
      ? <button className="btn btn-small" disabled title="Active weekend data cannot be edited here.">Edit</button>
      : <button className="btn btn-small" onClick={() => handleEditHistory(data.id)}>Edit</button>;

    return (
      <tr key={gender}>
        <td><strong>{gender}</strong></td>
        <td>{rectorName}</td>
        <td>{data.team_member_count || 0}</td>
        <td>{data.candidate_count || 0}</td>
        <td>{meetingAttdDisplay}</td>
        <td>{editButton}</td>
      </tr>
    );
  }

  function handleEditHistory(recordId) {
    // TODO: Implement edit history modal
    window.showMainStatus('Edit history functionality coming soon!', false);
  }

  function renderDashboardCards() {
    // Calculate term progress for each position
    const cards = POSITIONS.map(position => {
      const rosterEntry = secretariatRoster.find(r => r.position === position.key);
      
      if (!rosterEntry) {
        return (
          <div key={position.key} className="secretariat-card">
            <div className="secretariat-card-header">
              <div className="position-title">{position.name}</div>
            </div>
            <div className="secretariat-card-body">
              <div className="member-name unfilled">Unfilled Position</div>
              <div className="term-info-footer">
                <div className="term-dates">—</div>
                <div className="time-remaining" style={{ color: 'var(--muted)' }}>No Active Term</div>
              </div>
              <div className="timeline-container">
                <div className="timeline-segment">
                  <div className="timeline-fill" style={{ width: '0%', backgroundColor: 'var(--border)' }}></div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Calculate term progress
      const startDate = rosterEntry.term_start_date ? new Date(rosterEntry.term_start_date) : null;
      const endDate = rosterEntry.term_end_date ? new Date(rosterEntry.term_end_date) : null;
      const isInterim = rosterEntry.is_interim || false;

      let progressPercent = 0;
      let timeRemainingText = '';
      let segmentColor = 'green';

      if (startDate && endDate) {
        const today = new Date();
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const elapsedDays = (today - startDate) / (1000 * 60 * 60 * 24);
        progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

        const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const remainingMonths = Math.floor(remainingDays / 30);

        if (remainingDays < 0) {
          timeRemainingText = 'Term Expired';
          segmentColor = 'red';
        } else if (remainingMonths < 6) {
          timeRemainingText = `${remainingMonths} mo. remaining`;
          segmentColor = 'yellow';
        } else {
          timeRemainingText = `${remainingMonths} mo. remaining`;
          segmentColor = 'green';
        }
      }

      const memberName = position.type === 'couple' && rosterEntry.spouse_pescadore_key
        ? `${findMemberName(rosterEntry.member_pescadore_key)} & ${findMemberName(rosterEntry.spouse_pescadore_key)}`
        : findMemberName(rosterEntry.member_pescadore_key);

      const internInfo = rosterEntry.intern_pescadore_key
        ? `Intern: ${findMemberName(rosterEntry.intern_pescadore_key)}`
        : null;

      return (
        <div key={position.key} className={`secretariat-card ${isInterim ? 'is-interim' : ''}`}>
          <div className="secretariat-card-header">
            <div className="position-title">{position.name}</div>
          </div>
          <div className="secretariat-card-body">
            <div className="member-name">{memberName || 'Unknown'}</div>
            {internInfo && <div className="intern-info">{internInfo}</div>}
            <div className="term-info-footer">
              <div className="term-dates">
                {startDate && endDate
                  ? `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                  : '—'}
              </div>
              <div className="time-remaining" style={{ color: segmentColor === 'red' ? 'var(--accentD)' : segmentColor === 'yellow' ? 'var(--accentC)' : 'var(--accentA)' }}>
                {timeRemainingText}
              </div>
            </div>
            <div className="timeline-container">
              <div className="timeline-segment">
                <div 
                  className={`timeline-fill ${segmentColor}`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      );
    });

    return cards;
  }

  function renderWeekendHistoryTable() {
    const activeWeekend = calculateActiveWeekend();

    if (weekendHistoryData.length === 0 && !activeWeekend) {
      return (
        <tr>
          <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
            No weekend history data found.
          </td>
        </tr>
      );
    }

    const rows = [];

    // Render Active Weekend Row First
    if (activeWeekend) {
      const menData = activeWeekend.men;
      const womenData = activeWeekend.women;
      const totalParticipants = 
        (menData?.team_member_count || 0) + 
        (menData?.candidate_count || 0) + 
        (womenData?.team_member_count || 0) + 
        (womenData?.candidate_count || 0);

      const weekendId = `active-${activeWeekend.num}`;
      const isExpanded = expandedRows.has(weekendId);

      rows.push(
        <tr 
          key={weekendId}
          className="history-parent-row active"
          onClick={() => toggleRow(weekendId)}
        >
          <td>
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>›</span>
          </td>
          <td><strong>Weekend #{activeWeekend.num} (Active)</strong></td>
          <td style={{ textAlign: 'right', fontWeight: '600' }}>{totalParticipants}</td>
        </tr>
      );

      if (isExpanded) {
        rows.push(
          <tr key={`${weekendId}-detail`} className="history-detail-row">
            <td colSpan="3" style={{ padding: 0 }}>
              <div className="detail-container">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Gender</th>
                      <th>Rector</th>
                      <th style={{ width: '100px' }}>Team</th>
                      <th style={{ width: '120px' }}>Candidates</th>
                      <th style={{ width: '150px' }}>Avg. Meeting Attd.</th>
                      <th style={{ width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderDetailRow('Men', menData, true)}
                    {renderDetailRow('Women', womenData, true)}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        );
      }
    }

    // Render Historical Rows
    const groupedByWeekend = weekendHistoryData.reduce((acc, record) => {
      const num = record.weekend_number;
      if (!acc[num]) {
        acc[num] = { men: null, women: null };
      }
      acc[num][record.gender] = record;
      return acc;
    }, {});

    const sortedWeekendNumbers = Object.keys(groupedByWeekend).sort((a, b) => b - a);

    sortedWeekendNumbers.forEach(num => {
      // Don't show historical record if it matches the active weekend number
      if (activeWeekend && parseInt(num, 10) === activeWeekend.num) return;

      const weekend = groupedByWeekend[num];
      const menData = weekend.men;
      const womenData = weekend.women;
      const totalParticipants = 
        (menData?.team_member_count || 0) + 
        (menData?.candidate_count || 0) + 
        (womenData?.team_member_count || 0) + 
        (womenData?.candidate_count || 0);

      const weekendId = num;
      const isExpanded = expandedRows.has(weekendId);

      rows.push(
        <tr 
          key={weekendId}
          className="history-parent-row"
          onClick={() => toggleRow(weekendId)}
        >
          <td>
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>›</span>
          </td>
          <td><strong>Weekend #{num}</strong></td>
          <td style={{ textAlign: 'right', fontWeight: '600' }}>{totalParticipants}</td>
        </tr>
      );

      if (isExpanded) {
        rows.push(
          <tr key={`${weekendId}-detail`} className="history-detail-row">
            <td colSpan="3" style={{ padding: 0 }}>
              <div className="detail-container">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Gender</th>
                      <th>Rector</th>
                      <th style={{ width: '100px' }}>Team</th>
                      <th style={{ width: '120px' }}>Candidates</th>
                      <th style={{ width: '150px' }}>Avg. Meeting Attd.</th>
                      <th style={{ width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderDetailRow('Men', menData, false)}
                    {renderDetailRow('Women', womenData, false)}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        );
      }
    });

    return rows;
  }

  if (loading) {
    return (
      <div className="app-panel" style={{ display: 'block' }}>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          Loading Secretariat Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel" id="secretariat-app" style={{ display: 'block' }}>
      {/* Dashboard Cards */}
      <div className="secretariat-dashboard-grid">
        {renderDashboardCards()}
      </div>

      {/* Weekend History Section */}
      <div className="card pad" style={{ marginTop: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '2px solid var(--accentB)', 
          paddingBottom: '10px', 
          marginBottom: '14px' 
        }}>
          <div className="section-title" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
            Weekend History
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 0, marginBottom: '20px' }}>
          A historical record of past weekends. Click a row to expand and see details for the Men's and Women's weekends.
        </p>
        <table className="table" id="weekend-history-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}></th>
              <th>Weekend</th>
              <th style={{ textAlign: 'right' }}>Total Participants</th>
            </tr>
          </thead>
          <tbody id="weekend-history-tbody">
            {renderWeekendHistoryTable()}
          </tbody>
        </table>
      </div>
    </div>
  );
}