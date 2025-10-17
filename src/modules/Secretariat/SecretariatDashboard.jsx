import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

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

export default function SecretariatDashboard() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rosterData, setRosterData] = useState({});
  const [allMembers, setAllMembers] = useState([]);
  const [weekendHistoryData, setWeekendHistoryData] = useState([]);

  useEffect(() => {
    if (orgId) {
      loadDataAndRenderAll();
    }
  }, [orgId]);

  async function loadDataAndRenderAll() {
    try {
      const [rosterResult, menResult, womenResult, historyResult] = await Promise.all([
        supabase.from('secretariat_roster').select('*').eq('org_id', orgId),
        supabase.from('men_raw').select('PescadoreKey, First, Last, Preferred').eq('org_id', orgId),
        supabase.from('women_raw').select('PescadoreKey, First, Last, Preferred').eq('org_id', orgId),
        supabase.from('weekend_history').select('*').eq('org_id', orgId).order('weekend_number', { ascending: false })
      ]);

      // Convert roster array to object
      const roster = (rosterResult.data || []).reduce((acc, item) => {
        acc[item.position_key] = item;
        return acc;
      }, {});
      setRosterData(roster);

      // Combine members
      const members = [...(menResult.data || []), ...(womenResult.data || [])];
      setAllMembers(members);

      // Set history
      setWeekendHistoryData(historyResult.data || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading Secretariat data:', error);
      setLoading(false);
    }
  }

  function findMember(memberId) {
    if (!memberId) return null;
    return allMembers.find(m => String(m.PescadoreKey) === String(memberId));
  }

  function findMemberName(memberId) {
    if (!memberId) return null;
    const member = findMember(memberId);
    if (!member) return `Unknown (ID: ${memberId})`;
    return `${member.Preferred || member.First} ${member.Last}`.trim();
  }

  function renderCard(pos) {
    const data = rosterData[pos.key] || {};
    const termLength = data.term_length_years || pos.defaultTerm;

    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);

    let memberName = 'Unfilled';
    if (pos.type === 'couple') {
      const member1 = findMember(data.member1_id);
      const member2 = findMember(data.member2_id);
      if (member1 && member2) {
        const firstName1 = member1.Preferred || member1.First;
        const lastName1 = member1.Last;
        const firstName2 = member2.Preferred || member2.First;
        const lastName2 = member2.Last;
        if (lastName1 && lastName1.toLowerCase() === lastName2.toLowerCase()) {
          memberName = `${firstName1} & ${firstName2} ${lastName1}`;
        } else {
          memberName = `${firstName1} ${lastName1} & ${firstName2} ${lastName2}`;
        }
      } else if (member1) {
        memberName = `${member1.Preferred || member1.First} ${member1.Last}`;
      } else if (member2) {
        memberName = `${member2.Preferred || member2.First} ${member2.Last}`;
      }
    } else {
      const name1 = findMemberName(data.member1_id);
      if (name1) memberName = name1;
    }

    // Add Interim tag
    if (data.is_interim && data.member1_id) {
      memberName += ` <span style="font-weight: 600; font-style: italic; color: var(--muted);">(Interim)</span>`;
    }

    // Intern logic
    let internHTML = '';
    const hasIntern = data.intern1_id && data.intern_start_date;
    if (hasIntern) {
      const internStartDate = new Date(data.intern_start_date);
      const internStartDateFormatted = internStartDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const startVerb = internStartDate <= today ? 'Started' : 'Starts';
      
      let internName = '';
      if (pos.type === 'couple') {
        const intern1 = findMember(data.intern1_id);
        const intern2 = findMember(data.intern2_id);
        if (intern1 && intern2) {
          const firstName1 = intern1.Preferred || intern1.First;
          const lastName1 = intern1.Last;
          const firstName2 = intern2.Preferred || intern2.First;
          const lastName2 = intern2.Last;
          if (lastName1 && lastName1.toLowerCase() === lastName2.toLowerCase()) {
            internName = `${firstName1} & ${firstName2} ${lastName1}`;
          } else {
            internName = `${firstName1} ${lastName1} & ${firstName2} ${lastName2}`;
          }
        } else if (intern1) {
          internName = `${intern1.Preferred || intern1.First} ${intern1.Last}`;
        } else if (intern2) {
          internName = `${intern2.Preferred || intern2.First} ${intern2.Last}`;
        }
      } else {
        const intern1 = findMemberName(data.intern1_id);
        if (intern1) internName = intern1;
      }
      if (internName) {
        internHTML = `<div class="intern-info">Intern: ${internName} (${startVerb}: ${internStartDateFormatted})</div>`;
      }
    }

    let startDate, endDate, progressPercent = 0, timeRemainingText = 'N/A', barColor = 'grey';
    
    if (data.start_date) {
      startDate = new Date(data.start_date);
      endDate = new Date(startDate);
      endDate.setFullYear(startDate.getFullYear() + termLength);

      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsedDuration = today.getTime() - startDate.getTime();
      progressPercent = Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100));

      if (today > endDate) {
        const monthsPastDue = Math.round((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const monthString = monthsPastDue === 1 ? 'month' : 'months';
        timeRemainingText = `${monthsPastDue} ${monthString} past due`;
        barColor = 'red';
      } else {
        const monthsRemaining = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const monthString = monthsRemaining === 1 ? 'month' : 'months';
        timeRemainingText = `${monthsRemaining} ${monthString} remaining`;
        if (endDate < oneYearFromNow) barColor = 'yellow';
        else barColor = 'green';
      }
    }

    const formattedStartDate = startDate ? startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A';
    const formattedEndDate = endDate ? endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A';
    const timeRemainingColor = barColor === 'green' ? 'var(--muted)' : (barColor === 'yellow' ? 'var(--accentC)' : 'var(--accentD)');

    // Segmented Timeline Logic
    let timelineHTML = '';
    const totalMonthsInTerm = termLength * 12;

    if (data.start_date) {
      const elapsedMonths = Math.max(0, (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      let segmentFills = [];
      for (let i = 0; i < termLength; i++) {
        const yearStartMonths = i * 12;
        const yearEndMonths = (i + 1) * 12;
        let fillPercent = 0;
        if (elapsedMonths >= yearEndMonths) {
          fillPercent = 100;
        } else if (elapsedMonths > yearStartMonths) {
          fillPercent = ((elapsedMonths - yearStartMonths) / 12) * 100;
        }
        segmentFills.push(Math.min(100, fillPercent));
      }
      
      timelineHTML = segmentFills.map((fill, i) => {
        const transitionOverlay = (i === termLength - 1 && hasIntern) 
          ? '<div class="timeline-transition-overlay"></div>' 
          : '';

        return `
          <div class="timeline-segment">
            <div class="timeline-fill ${barColor}" style="width: ${fill}%;"></div>
            ${transitionOverlay}
          </div>
        `;
      }).join('');
    } else {
      timelineHTML = Array(termLength).fill(`
        <div class="timeline-segment">
          <div class="timeline-fill" style="width: 0%;"></div>
        </div>
      `).join('');
    }

    return (
      <div key={pos.key} className={`secretariat-card ${data.is_interim ? 'is-interim' : ''}`}>
        <div className="secretariat-card-header">
          <div className="position-title">{pos.name} {data.is_interim ? ' (INTERIM)' : ''}</div>
        </div>
        <div className="secretariat-card-body">
          <div>
            <div 
              className={`member-name ${memberName === 'Unfilled' ? 'unfilled' : ''}`}
              dangerouslySetInnerHTML={{ __html: memberName.replace(' (Interim)', '') }}
            />
            {internHTML && <div dangerouslySetInnerHTML={{ __html: internHTML }} />}
          </div>
          <div className="timeline-container" dangerouslySetInnerHTML={{ __html: timelineHTML }} />
          <div className="term-info-footer">
            <span className="term-dates">{formattedStartDate} – {formattedEndDate}</span>
            <span className="time-remaining" style={{ color: timeRemainingColor }}>{timeRemainingText}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderWeekendHistory() {
    const tbody = document.getElementById('weekend-history-tbody');
    if (!tbody || weekendHistoryData.length === 0) {
      return (
        <tr>
          <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
            No weekend history data found.
          </td>
        </tr>
      );
    }

    // Group by weekend number
    const groupedByWeekend = weekendHistoryData.reduce((acc, record) => {
      const num = record.weekend_number;
      if (!acc[num]) {
        acc[num] = { men: null, women: null };
      }
      acc[num][record.gender] = record;
      return acc;
    }, {});

    const sortedWeekendNumbers = Object.keys(groupedByWeekend).sort((a, b) => b - a);

    return sortedWeekendNumbers.map(num => {
      const weekend = groupedByWeekend[num];
      const menData = weekend.men;
      const womenData = weekend.women;
      const totalParticipants = (menData?.team_member_count || 0) + (menData?.candidate_count || 0) + 
                               (womenData?.team_member_count || 0) + (womenData?.candidate_count || 0);

      return (
        <WeekendHistoryRow 
          key={num}
          weekendNum={num}
          menData={menData}
          womenData={womenData}
          totalParticipants={totalParticipants}
          findMemberName={findMemberName}
        />
      );
    });
  }

  if (loading) {
    return (
      <section id="secretariat-app" className="app-panel">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
          Loading Secretariat data...
        </div>
      </section>
    );
  }

  return (
    <section id="secretariat-app" className="app-panel" style={{ display: 'block' }}>
      <div id="secretariat-dashboard-container" className="secretariat-dashboard-grid">
        {POSITIONS.map(pos => renderCard(pos))}
      </div>

      <div id="weekend-history-container" className="card pad" style={{ marginTop: '24px' }}>
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
          <button className="btn btn-primary" onClick={() => console.log('Add New History')}>
            Add New History
          </button>
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
            {renderWeekendHistory()}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Separate component for expandable weekend rows
function WeekendHistoryRow({ weekendNum, menData, womenData, totalParticipants, findMemberName }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const createDetailRow = (gender, data) => {
    if (!data) {
      return (
        <tr key={gender}>
          <td><strong>{gender}</strong></td>
          <td colSpan="5" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No data for this weekend</td>
        </tr>
      );
    }
    
    const rectorName = findMemberName(data.rector_pescadore_key) || 'N/A';
    const meetingAttdHTML = (data.avg_meeting_attd !== undefined) 
      ? <strong style={{ color: 'var(--accentA)' }}>{data.avg_meeting_attd.toFixed(1)}%</strong>
      : 'N/A';

    return (
      <tr key={gender}>
        <td style={{ fontWeight: 600 }}>{gender}</td>
        <td>{rectorName}</td>
        <td style={{ textAlign: 'right' }}>{data.team_member_count || 0}</td>
        <td style={{ textAlign: 'right' }}>{data.candidate_count || 0}</td>
        <td style={{ textAlign: 'right' }}>{meetingAttdHTML}</td>
        <td style={{ textAlign: 'center' }}>
          <button 
            className="btn btn-small" 
            onClick={() => console.log('Edit', gender, weekendNum)}
          >
            Edit
          </button>
        </td>
      </tr>
    );
  };

  return (
    <>
      <tr 
        className={`history-parent-row ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <td><span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>›</span></td>
        <td><strong>Weekend #{weekendNum}</strong></td>
        <td style={{ textAlign: 'right', fontWeight: 600 }}>{totalParticipants}</td>
      </tr>
      {isExpanded && (
        <tr className="history-detail-row">
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
                  {createDetailRow('Men', menData)}
                  {createDetailRow('Women', womenData)}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}