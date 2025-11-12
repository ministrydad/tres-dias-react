// src/modules/Secretariat/SecretariatDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import DatePicker from '../../components/common/DatePicker';
import CloseOutWeekend from '../../components/common/CloseOutWeekend';

// Configuration constant from original
const MEETING_COUNT = 6; // Number of meetings per team (matches CONFIG.MEETING_COUNT in original)

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
  
  // Edit panel state
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    theme: '',
    verse: '',
    theme_song: '',
    image: null,
    imagePreview: '',
    start_date: '',
    end_date: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const mainContentRef = useRef(null);
  
  // Close Out Weekend modal state
  const [showCloseOutModal, setShowCloseOutModal] = useState(false);

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

  function handleEditHistory(record) {
    setEditingRecord(record);
    setEditFormData({
      theme: record.theme || '',
      verse: record.verse || '',
      theme_song: record.theme_song || '',
      image: null,
      imagePreview: record.image || '',
      start_date: record.start_date || '',
      end_date: record.end_date || ''
    });
    setShowEditPanel(true);
  }

  function handleCloseEditPanel() {
    setShowEditPanel(false);
    setEditingRecord(null);
    setEditFormData({
      theme: '',
      verse: '',
      theme_song: '',
      image: null,
      imagePreview: '',
      start_date: '',
      end_date: ''
    });
  }

  async function handleSaveEdit() {
    if (!editingRecord) return;

    setIsSaving(true);

    try {
      let imageUrl = editFormData.imagePreview;

      // Upload new image if one was selected
      if (editFormData.image) {
        const fileExt = editFormData.image.name.split('.').pop();
        const fileName = `${orgId}/${editingRecord.weekend_identifier.replace(/[^a-zA-Z0-9]/g, '_')}_${editingRecord.gender}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('weekend-images')
          .upload(fileName, editFormData.image, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('weekend-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Update the record
      const { error: updateError } = await supabase
        .from('weekend_history')
        .update({
          theme: editFormData.theme.trim(),
          verse: editFormData.verse.trim(),
          theme_song: editFormData.theme_song.trim(),
          image: imageUrl,
          start_date: editFormData.start_date || null,
          end_date: editFormData.end_date || null
        })
        .eq('id', editingRecord.id)
        .eq('org_id', orgId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update record: ${updateError.message}`);
      }

      // Reload data
      await loadAllData();

      window.showMainStatus('Weekend history updated successfully!', false);
      handleCloseEditPanel();

    } catch (error) {
      console.error('Error saving edit:', error);
      window.showMainStatus(`Error: ${error.message}`, true);
    } finally {
      setIsSaving(false);
    }
  }

  function renderDetailRow(gender, data, isActive) {
    if (!data) {
      return (
        <tr key={gender}>
          <td><strong>{gender}</strong></td>
          <td colSpan="10" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
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
      : <button className="btn btn-small" onClick={() => handleEditHistory(data)}>Edit</button>;

    return (
      <tr key={gender}>
        <td><strong>{gender}</strong></td>
        <td>{rectorName}</td>
        <td>{data.team_member_count || 0}</td>
        <td>{data.candidate_count || 0}</td>
        <td>{meetingAttdDisplay}</td>
        <td>{data.theme || 'N/A'}</td>
        <td>{data.theme_song || 'N/A'}</td>
        <td>{data.verse || 'N/A'}</td>
        <td>
          {data.start_date && data.end_date 
            ? `${new Date(data.start_date).toLocaleDateString()} - ${new Date(data.end_date).toLocaleDateString()}`
            : 'N/A'
          }
        </td>
        <td>
          {data.image ? (
            <img 
              src={data.image} 
              alt="Weekend" 
              style={{ 
                maxWidth: '60px', 
                maxHeight: '60px', 
                borderRadius: '4px',
                cursor: 'pointer',
                border: '1px solid var(--border)'
              }}
              onClick={() => window.open(data.image, '_blank')}
            />
          ) : (
            'N/A'
          )}
        </td>
        <td>{editButton}</td>
      </tr>
    );
  }

  function renderDashboardCards() {
    // Calculate term progress for each position
    const cards = POSITIONS.map(position => {
      const rosterEntry = secretariatRoster.find(r => r.position_key === position.key);
      
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

      // Calculate term progress - start_date and term_length_years are used
      const startDate = rosterEntry.start_date ? new Date(rosterEntry.start_date) : null;
      const termLengthYears = rosterEntry.term_length_years || position.defaultTerm;
      const isInterim = rosterEntry.is_interim || false;

      let endDate = null;
      if (startDate) {
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + termLengthYears);
      }

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
        } else if (remainingMonths < 12) {
          timeRemainingText = `${remainingMonths} mo. remaining`;
          segmentColor = 'yellow';
        } else {
          timeRemainingText = `${remainingMonths} mo. remaining`;
          segmentColor = 'green';
        }
      }

      // Build member name - handle couples
      let memberName = 'Unknown';
      if (position.type === 'couple') {
        const member1 = findMemberName(rosterEntry.member1_id);
        const member2 = findMemberName(rosterEntry.member2_id);
        
        if (member1 && member2) {
          // Check if they have the same last name
          const member1Obj = allMembers.find(m => String(m.PescadoreKey) === String(rosterEntry.member1_id));
          const member2Obj = allMembers.find(m => String(m.PescadoreKey) === String(rosterEntry.member2_id));
          
          if (member1Obj && member2Obj && member1Obj.Last === member2Obj.Last) {
            // Same last name: "First1 & First2 Last"
            const first1 = member1Obj.Preferred || member1Obj.First;
            const first2 = member2Obj.Preferred || member2Obj.First;
            memberName = `${first1} & ${first2} ${member1Obj.Last}`;
          } else {
            // Different last names: "Full1 & Full2"
            memberName = `${member1} & ${member2}`;
          }
        } else if (member1) {
          memberName = member1;
        } else if (member2) {
          memberName = member2;
        }
      } else {
        // Single position
        memberName = findMemberName(rosterEntry.member1_id) || 'Unknown';
      }

      // Build intern info - handle couples
      let internInfo = null;
      if (position.type === 'couple' && (rosterEntry.intern1_id || rosterEntry.intern2_id)) {
        const intern1 = findMemberName(rosterEntry.intern1_id);
        const intern2 = findMemberName(rosterEntry.intern2_id);
        
        if (intern1 && intern2) {
          internInfo = `Interns: ${intern1} & ${intern2}`;
        } else if (intern1) {
          internInfo = `Intern: ${intern1}`;
        } else if (intern2) {
          internInfo = `Intern: ${intern2}`;
        }
      } else if (rosterEntry.intern1_id) {
        internInfo = `Intern: ${findMemberName(rosterEntry.intern1_id)}`;
      }

      return (
        <div key={position.key} className={`secretariat-card ${isInterim ? 'is-interim' : ''}`}>
          <div className="secretariat-card-header">
            <div className="position-title">{position.name}</div>
            <div className="member-name" style={{ minHeight: 'auto', fontSize: '0.85rem', fontWeight: '600' }}>
              {memberName}
            </div>
          </div>
          <div className="secretariat-card-body">
            {/* Reserved space for intern - always takes up space even when empty */}
            <div style={{ minHeight: '20px', marginBottom: '8px' }}>
              {internInfo && <div className="intern-info" style={{ margin: 0 }}>{internInfo}</div>}
            </div>
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
                      <th style={{ width: '150px' }}>Rector</th>
                      <th style={{ width: '80px' }}>Team</th>
                      <th style={{ width: '100px' }}>Candidates</th>
                      <th style={{ width: '100px' }}>Avg. Meeting</th>
                      <th style={{ width: '120px' }}>Theme</th>
                      <th style={{ width: '120px' }}>Song</th>
                      <th style={{ width: '120px' }}>Verse</th>
                      <th style={{ width: '140px' }}>Dates</th>
                      <th style={{ width: '80px' }}>Image</th>
                      <th style={{ width: '80px' }}>Actions</th>
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
                      <th style={{ width: '150px' }}>Rector</th>
                      <th style={{ width: '80px' }}>Team</th>
                      <th style={{ width: '100px' }}>Candidates</th>
                      <th style={{ width: '100px' }}>Avg. Meeting</th>
                      <th style={{ width: '120px' }}>Theme</th>
                      <th style={{ width: '120px' }}>Song</th>
                      <th style={{ width: '120px' }}>Verse</th>
                      <th style={{ width: '140px' }}>Dates</th>
                      <th style={{ width: '80px' }}>Image</th>
                      <th style={{ width: '80px' }}>Actions</th>
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
      <div className="app-panel" >
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          Loading Secretariat Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel" id="secretariat-app" >
      {/* Dashboard Cards - Always Full Width */}
      <div className="secretariat-dashboard-grid">
        {renderDashboardCards()}
      </div>

      {/* Weekend History Section with Edit Panel */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginTop: '24px' }}>
        {/* Weekend History Card */}
        <div 
          ref={mainContentRef}
          style={{ 
            width: showEditPanel ? '62%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
          <div className="card pad">
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
              {calculateActiveWeekend() && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCloseOutModal(true)}
                  style={{ fontSize: '0.9rem' }}
                >
                  Close Out Weekend
                </button>
              )}
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

        {/* Edit Panel - Slide Out */}
        {showEditPanel && editingRecord && (
          <div 
            className="card pad"
            style={{
              width: '38%',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              height: mainContentRef.current ? `${mainContentRef.current.offsetHeight}px` : 'auto',
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
                Edit: {editingRecord.weekend_identifier}
              </h3>
              <button 
                className="btn btn-small"
                onClick={handleCloseEditPanel}
                style={{ padding: '4px 12px', fontSize: '0.9rem' }}
              >
                Close ✕
              </button>
            </div>

            <div className="field">
              <label className="label">Rector</label>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {findMemberName(editingRecord.rector_pescadore_key) || 'N/A'}
              </div>
            </div>

            <div className="field">
              <label className="label">Weekend Number</label>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {editingRecord.weekend_number}
              </div>
            </div>

            <div className="field">
              <label className="label">Start Date</label>
              <DatePicker
                value={editFormData.start_date}
                onChange={(dateValue) => {
                  setEditFormData(prev => {
                    // Auto-calculate end date (4 days after start)
                    let endDate = '';
                    if (dateValue) {
                      const start = new Date(dateValue);
                      start.setDate(start.getDate() + 4);
                      endDate = start.toISOString().split('T')[0];
                    }
                    return {
                      ...prev,
                      start_date: dateValue,
                      end_date: endDate
                    };
                  });
                }}
                placeholder="Select start date"
              />
            </div>

            <div className="field">
              <label className="label">End Date</label>
              <DatePicker
                value={editFormData.end_date}
                onChange={(dateValue) => setEditFormData(prev => ({ ...prev, end_date: dateValue }))}
                placeholder="Select end date"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                Auto-fills to 4 days after start date
              </div>
            </div>

            <div className="field">
              <label className="label">Theme</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Stand Firm"
                value={editFormData.theme}
                onChange={(e) => setEditFormData(prev => ({ ...prev, theme: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Theme Song</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Amazing Grace"
                value={editFormData.theme_song}
                onChange={(e) => setEditFormData(prev => ({ ...prev, theme_song: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Scripture Verse</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., John 3:16"
                value={editFormData.verse}
                onChange={(e) => setEditFormData(prev => ({ ...prev, verse: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="label">Weekend Image</label>
              <div style={{ 
                position: 'relative',
                border: '2px dashed var(--border)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: 'var(--panel-header)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accentB)';
                e.currentTarget.style.backgroundColor = 'rgba(0, 163, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.backgroundColor = 'var(--panel-header)';
              }}
              onClick={() => document.getElementById('editWeekendImageUpload').click()}
              >
                <input
                  id="editWeekendImageUpload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        window.showMainStatus?.('Image must be 5MB or less', true);
                        e.target.value = '';
                        return;
                      }
                      // Create preview URL
                      const previewUrl = URL.createObjectURL(file);
                      setEditFormData(prev => ({
                        ...prev,
                        image: file,
                        imagePreview: previewUrl
                      }));
                    }
                  }}
                  style={{ display: 'none' }}
                />
                {!editFormData.imagePreview ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px', color: 'var(--ink)' }}>
                      Click to upload image
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      JPG, PNG, or WebP • Max 5MB
                    </div>
                  </>
                ) : (
                  <>
                    <img 
                      src={editFormData.imagePreview} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '150px', 
                        maxHeight: '150px',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}
                    />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accentA)' }}>
                      {editFormData.image ? editFormData.image.name : 'Current Image'}
                    </div>
                    {editFormData.image && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                        {(editFormData.image.size / 1024).toFixed(1)} KB
                      </div>
                    )}
                    <button
                      className="btn btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditFormData(prev => ({
                          ...prev,
                          image: null,
                          imagePreview: ''
                        }));
                        document.getElementById('editWeekendImageUpload').value = '';
                      }}
                      style={{ 
                        marginTop: '8px',
                        padding: '4px 12px',
                        fontSize: '0.75rem'
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ 
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              marginTop: 'auto'
            }}>
              <button 
                className="btn"
                onClick={handleCloseEditPanel}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={!editFormData.theme.trim() || !editFormData.verse.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
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
      `}</style>

      {/* Close Out Weekend Modal */}
      <CloseOutWeekend
        isOpen={showCloseOutModal}
        onClose={() => {
          setShowCloseOutModal(false);
          // Reload data after closing (in case weekend was archived)
          loadAllData();
        }}
        weekendNumber={calculateActiveWeekend()?.num || 0}
        orgId={orgId}
      />
    </div>
  );
}