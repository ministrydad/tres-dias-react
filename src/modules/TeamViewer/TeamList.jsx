// src/modules/TeamViewer/TeamList.jsx
// UPDATED: Fixed "Print All Profiles" to use complete embedded CSS from profilePrintUtils
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import { generatePrintableProfileHTML, PRINT_PROFILE_CSS } from '../../utils/profilePrintUtils';

export default function TeamList() {
  const { user, orgId } = useAuth();
  const { allPescadores, loading: pescadoresLoading } = usePescadores();
  const [currentGender, setCurrentGender] = useState('men');
  const [weekendIdentifier, setWeekendIdentifier] = useState('');
  const [teamRoster, setTeamRoster] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [testMode, setTestMode] = useState(true); // Start in test mode by default

  const ROLE_CONFIG = {
    team: [
      { name: 'Rector', key: 'Rector' },
      { name: 'BUR', key: 'BUR' },
      { name: 'Rover', key: 'Rover' },
      { name: 'Head', key: 'Head' },
      { name: 'Asst Head', key: 'Asst Head' },
      { name: 'Head Spiritual Director', key: 'Head Spiritual Director' },
      { name: 'Spiritual Director', key: 'Spiritual Director' },
      { name: 'Head Prayer', key: 'Head Prayer' },
      { name: 'Prayer', key: 'Prayer' },
      { name: 'Head Kitchen', key: 'Head Kitchen' },
      { name: 'Asst Head Kitchen', key: 'Asst Head Kitchen' },
      { name: 'Kitchen', key: 'Kitchen' },
      { name: 'Head Table', key: 'Head Table' },
      { name: 'Table', key: 'Table' },
      { name: 'Head Chapel', key: 'Head Chapel' },
      { name: 'Chapel', key: 'Chapel' },
      { name: 'Head Dorm', key: 'Head Dorm' },
      { name: 'Dorm', key: 'Dorm' },
      { name: 'Head Palanca', key: 'Head Palanca' },
      { name: 'Palanca', key: 'Palanca' },
      { name: 'Head Gopher', key: 'Head Gopher' },
      { name: 'Gopher', key: 'Gopher' },
      { name: 'Head Storeroom', key: 'Head Storeroom' },
      { name: 'Storeroom', key: 'Storeroom' },
      { name: 'Head Floater Supply', key: 'Head Floater Supply' },
      { name: 'Floater Supply', key: 'Floater Supply' },
      { name: 'Head Worship', key: 'Head Worship' },
      { name: 'Worship', key: 'Worship' },
      { name: 'Head Media', key: 'Head Media' },
      { name: 'Media', key: 'Media' }
    ],
    professor: [
      { name: 'Silent', key: 'Prof_Silent' },
      { name: 'Ideals', key: 'Prof_Ideals' },
      { name: 'Church', key: 'Prof_Church' },
      { name: 'Piety', key: 'Prof_Piety' },
      { name: 'Study', key: 'Prof_Study' },
      { name: 'Action', key: 'Prof_Action' },
      { name: 'Leaders', key: 'Prof_Leaders' },
      { name: 'Environments', key: 'Prof_Environments' },
      { name: 'CCIA', key: 'Prof_CCIA' },
      { name: 'Reunion', key: 'Prof_Reunion' }
    ]
  };

  const unifiedTeamGroups = [
    { title: 'Kitchen Team', head: 'Head Kitchen', assistantHead: 'Asst Head Kitchen', team: 'Kitchen' },
    { title: 'Prayer Team', head: 'Head Prayer', team: 'Prayer' },
    { title: 'Table Team', head: 'Head Table', team: 'Table' },
    { title: 'Chapel Team', head: 'Head Chapel', team: 'Chapel' },
    { title: 'Dorm Team', head: 'Head Dorm', team: 'Dorm' },
    { title: 'Palanca Team', head: 'Head Palanca', team: 'Palanca' },
    { title: 'Gopher Team', head: 'Head Gopher', team: 'Gopher' },
    { title: 'Storeroom Team', head: 'Head Storeroom', team: 'Storeroom' },
    { title: 'Floater Supply Team', head: 'Head Floater Supply', team: 'Floater Supply' },
    { title: 'Worship Team', head: 'Head Worship', team: 'Worship' },
    { title: 'Media Team', head: 'Head Media', team: 'Media' }
  ];

  useEffect(() => {
    if (!pescadoresLoading && orgId && allPescadores[currentGender]?.length > 0) {
      console.log('TeamList: Loading latest team for', currentGender);
      loadLatestTeam();
    }
  }, [currentGender, pescadoresLoading, orgId, allPescadores]);

  const loadLatestTeam = async () => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    
    console.log('TeamList: loadLatestTeam for', currentGender, 'from table', rosterTable);
    
    setLoadingTeam(true);
    
    try {
      const { data: teams, error } = await supabase
        .from(rosterTable)
        .select('weekend_identifier')
        .eq('org_id', orgId);
      
      if (error) throw error;

      console.log('TeamList: Found', teams?.length || 0, 'teams');

      const prefix = currentGender.charAt(0).toUpperCase() + currentGender.slice(1) + "'s ";
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

      console.log('TeamList: Latest team identifier:', latest.identifier);

      if (latest.identifier) {
        setWeekendIdentifier(latest.identifier);
        await loadTeamRoster(latest.identifier);
      } else {
        console.log('TeamList: No team found for', currentGender);
        setWeekendIdentifier('');
        setTeamRoster([]);
        setLoadingTeam(false);
      }
    } catch (error) {
      console.error('TeamList: Error loading latest team:', error);
      setTeamRoster([]);
      setLoadingTeam(false);
    }
  };

  const loadTeamRoster = async (identifier) => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    const rawTableData = allPescadores[currentGender];

    try {
      const { data, error } = await supabase
        .from(rosterTable)
        .select('pescadore_key, role')
        .eq('weekend_identifier', identifier)
        .eq('org_id', orgId);

      if (error) throw error;

      const newRoster = [];
      if (data) {
        data.forEach(entry => {
          const profile = rawTableData.find(p => p.PescadoreKey === entry.pescadore_key);
          if (profile) {
            newRoster.push({
              id: profile.PescadoreKey,
              name: `${profile.Preferred || profile.First || ''} ${profile.Last || ''}`.trim(),
              role: entry.role
            });
          }
        });
      }

      setTeamRoster(newRoster);
    } catch (error) {
      console.error('Error loading team roster:', error);
      setTeamRoster([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleGenderToggle = (gender) => {
    setCurrentGender(gender);
  };

  const handleRemoveTeammate = async (personId, role) => {
    window.showConfirm({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove this member from ${role}? This action will update the team roster.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        setRemovingId(personId);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';

        try {
          const { error } = await supabase
            .from(rosterTable)
            .delete()
            .eq('weekend_identifier', weekendIdentifier)
            .eq('pescadore_key', personId)
            .eq('role', role)
            .eq('org_id', orgId);

          if (error) throw error;

          setTeamRoster(prevRoster => 
            prevRoster.filter(member => !(member.id === personId && member.role === role))
          );

          window.showMainStatus(`Successfully removed from ${role}`, false);
        } catch (error) {
          console.error('Error removing team member:', error);
          window.showMainStatus('Failed to remove team member', true);
        } finally {
          setRemovingId(null);
        }
      }
    });
  };

  const handleUpdateDatabaseClick = () => {
    setShowUpdateModal(true);
  };

  const handleConfirmUpdate = async () => {
    setIsUpdating(true);
    
    if (testMode) {
      console.log('🧪 TEST MODE: Would update these members:');
      const updates = [];
      
      teamRoster.forEach(member => {
        const profile = allPescadores[currentGender].find(p => p.PescadoreKey === member.id);
        if (!profile) return;
        
        const roleKey = member.role;
        const serviceField = `${roleKey} Service`;
        const qtyField = `${roleKey.replace(/ /g, '_')}_Service_Qty`;
        const statusField = roleKey;
        
        const currentStatus = (profile[statusField] || 'N').toUpperCase();
        let newStatus = currentStatus;
        if (currentStatus === 'N') newStatus = 'I';
        else if (currentStatus === 'I') newStatus = 'E';
        
        const currentQty = parseInt(profile[qtyField] || '0');
        const newQty = currentQty + 1;
        
        updates.push({
          PescadoreKey: member.id,
          Name: member.name,
          Role: member.role,
          Updates: {
            [serviceField]: weekendIdentifier,
            [qtyField]: newQty,
            [statusField]: newStatus
          }
        });
      });
      
      console.table(updates);
      console.log(`Total members to update: ${updates.length}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      window.showMainStatus(`🧪 Test complete! Check console for ${updates.length} update preview(s)`, false);
      setShowUpdateModal(false);
      setIsUpdating(false);
      return;
    }
    
    const rawTable = currentGender === 'men' ? 'men_raw' : 'women_raw';
    let successCount = 0;
    let errorCount = 0;
    
    for (const member of teamRoster) {
      const profile = allPescadores[currentGender].find(p => p.PescadoreKey === member.id);
      if (!profile) continue;
      
      const roleKey = member.role;
      const serviceField = `${roleKey} Service`;
      const qtyField = `${roleKey.replace(/ /g, '_')}_Service_Qty`;
      const statusField = roleKey;
      
      const currentStatus = (profile[statusField] || 'N').toUpperCase();
      let newStatus = currentStatus;
      if (currentStatus === 'N') newStatus = 'I';
      else if (currentStatus === 'I') newStatus = 'E';
      
      const currentQty = parseInt(profile[qtyField] || '0');
      const newQty = currentQty + 1;
      
      try {
        const { error } = await supabase
          .from(rawTable)
          .update({
            [serviceField]: weekendIdentifier,
            [qtyField]: newQty,
            [statusField]: newStatus
          })
          .eq('PescadoreKey', member.id)
          .eq('org_id', orgId);
        
        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Error updating ${member.name}:`, error);
        errorCount++;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (errorCount === 0) {
      window.showMainStatus(`✅ Successfully updated ${successCount} team member${successCount > 1 ? 's' : ''}!`, false);
    } else {
      window.showMainStatus(`⚠️ Updated ${successCount}, but ${errorCount} failed. Check console.`, true);
    }
    
    setShowUpdateModal(false);
    setIsUpdating(false);
  };

  const handlePrintRoster = () => {
    if (!teamRoster || teamRoster.length === 0) {
      window.showMainStatus('No team members to print', true);
      return;
    }

    const genderLabel = currentGender === 'men' ? "Men's" : "Women's";
    const generatedDate = new Date().toLocaleDateString();

    let tableRows = '';
    teamRoster.forEach(member => {
      tableRows += `
        <tr>
          <td>${member.name}</td>
          <td>${member.role}</td>
        </tr>
      `;
    });

    const printableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Team Roster - ${weekendIdentifier}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .printable-header { text-align: center; margin-bottom: 20px; }
          .printable-header h1 { font-size: 22pt; margin: 0; }
          .printable-header h2 { font-size: 16pt; font-weight: normal; margin: 5px 0; }
          .printable-header p { font-size: 12pt; color: #666; }
          .printable-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .printable-table th, .printable-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .printable-table th { background-color: #eee; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="printable-header">
          <h1>Team Roster</h1>
          <h2>${weekendIdentifier}</h2>
          <p>Generated on ${generatedDate}</p>
        </div>
        <table class="printable-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="printable-summary" style="margin-top: 20px; padding-top: 10px; border-top: 2px solid #000;">
          <div><strong>Total Team Members:</strong> ${teamRoster.length}</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintAllProfiles = () => {
    if (!teamRoster || teamRoster.length === 0) {
      window.showMainStatus('No team members to print', true);
      return;
    }

    let allProfilesHTML = '';
    
    teamRoster.forEach(member => {
      const fullProfile = allPescadores[currentGender].find(p => p.PescadoreKey === member.id);
      if (fullProfile) {
        const singleProfileHTML = generatePrintableProfileHTML(fullProfile);
        // Wrap each profile in a div that forces a page break after it
        allProfilesHTML += `<div style="page-break-after: always; padding: 0.2in;">${singleProfileHTML}</div>`;
      }
    });

    const printableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Team Profile Reports - ${weekendIdentifier}</title>
        <style>
          ${PRINT_PROFILE_CSS}
        </style>
      </head>
      <body>
        ${allProfilesHTML}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const renderRectorSection = () => {
    const rectorMembers = teamRoster.filter(m => m.role === 'Rector');
    if (rectorMembers.length === 0) return null;

    return (
      <div className="team-section-card" style={{ marginBottom: '20px', border: '2px solid var(--accentA)', backgroundColor: 'var(--panel)', borderRadius: '8px', padding: '15px' }}>
        <div className="section-header" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--ink)' }}>
          🎯 Rector
        </div>
        <div className="section-content">
          {rectorMembers.map(member => (
            <div key={`${member.id}-${member.role}`} className="team-member-item" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px', 
              backgroundColor: 'var(--bg)', 
              borderRadius: '6px', 
              marginBottom: '8px',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontWeight: '600', color: 'var(--ink)' }}>{member.name}</span>
              <button
                onClick={() => handleRemoveTeammate(member.id, member.role)}
                disabled={removingId === member.id}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: removingId === member.id ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  opacity: removingId === member.id ? 0.6 : 1
                }}
              >
                {removingId === member.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLeadershipSection = () => {
    const leadershipRoles = ['BUR', 'Rover', 'Head', 'Asst Head', 'Head Spiritual Director', 'Spiritual Director'];
    const leadershipMembers = teamRoster.filter(m => leadershipRoles.includes(m.role));
    if (leadershipMembers.length === 0) return null;

    return (
      <div className="team-section-card" style={{ marginBottom: '20px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', borderRadius: '8px', padding: '15px' }}>
        <div className="section-header" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--ink)' }}>
          👔 Leadership
        </div>
        <div className="section-content">
          {leadershipRoles.map(role => {
            const members = leadershipMembers.filter(m => m.role === role);
            if (members.length === 0) return null;
            return members.map(member => (
              <div key={`${member.id}-${member.role}`} className="team-member-item" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px', 
                backgroundColor: 'var(--bg)', 
                borderRadius: '6px', 
                marginBottom: '8px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <span style={{ fontWeight: '600', color: 'var(--ink)' }}>{member.name}</span>
                  <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--muted)' }}>({member.role})</span>
                </div>
                <button
                  onClick={() => handleRemoveTeammate(member.id, member.role)}
                  disabled={removingId === member.id}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: removingId === member.id ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    opacity: removingId === member.id ? 0.6 : 1
                  }}
                >
                  {removingId === member.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ));
          })}
        </div>
      </div>
    );
  };

  const renderProfessorSection = () => {
    const professorKeys = ROLE_CONFIG.professor.map(p => p.key);
    const professorMembers = teamRoster.filter(m => professorKeys.includes(m.role));
    if (professorMembers.length === 0) return null;

    return (
      <div className="team-section-card" style={{ marginBottom: '20px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', borderRadius: '8px', padding: '15px' }}>
        <div className="section-header" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--ink)' }}>
          📖 Professors
        </div>
        <div className="section-content">
          {ROLE_CONFIG.professor.map(role => {
            const members = professorMembers.filter(m => m.role === role.key);
            if (members.length === 0) return null;
            return members.map(member => (
              <div key={`${member.id}-${member.role}`} className="team-member-item" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px', 
                backgroundColor: 'var(--bg)', 
                borderRadius: '6px', 
                marginBottom: '8px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <span style={{ fontWeight: '600', color: 'var(--ink)' }}>{member.name}</span>
                  <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--muted)' }}>({role.name})</span>
                </div>
                <button
                  onClick={() => handleRemoveTeammate(member.id, member.role)}
                  disabled={removingId === member.id}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: removingId === member.id ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    opacity: removingId === member.id ? 0.6 : 1
                  }}
                >
                  {removingId === member.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ));
          })}
        </div>
      </div>
    );
  };

  const renderUnifiedTeamSection = (group) => {
    const allGroupMembers = teamRoster.filter(m => 
      m.role === group.head || 
      m.role === group.assistantHead || 
      m.role === group.team
    );

    if (allGroupMembers.length === 0) return null;

    const headMembers = allGroupMembers.filter(m => m.role === group.head);
    const assistantHeadMembers = group.assistantHead ? allGroupMembers.filter(m => m.role === group.assistantHead) : [];
    const teamMembers = allGroupMembers.filter(m => m.role === group.team);

    return (
      <div key={group.title} className="team-section-card" style={{ marginBottom: '20px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', borderRadius: '8px', padding: '15px' }}>
        <div className="section-header" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--ink)' }}>
          {group.title}
        </div>
        <div className="section-content">
          {headMembers.map(member => (
            <div key={`${member.id}-${member.role}`} className="team-member-item" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px', 
              backgroundColor: 'var(--bg)', 
              borderRadius: '6px', 
              marginBottom: '8px',
              border: '1px solid var(--border)'
            }}>
              <div>
                <span style={{ fontWeight: '700', color: 'var(--accentA)' }}>👑</span>
                <span style={{ marginLeft: '8px', fontWeight: '600', color: 'var(--ink)' }}>{member.name}</span>
                <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--muted)' }}>(Head)</span>
              </div>
              <button
                onClick={() => handleRemoveTeammate(member.id, member.role)}
                disabled={removingId === member.id}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: removingId === member.id ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  opacity: removingId === member.id ? 0.6 : 1
                }}
              >
                {removingId === member.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
          
          {assistantHeadMembers.map(member => (
            <div key={`${member.id}-${member.role}`} className="team-member-item" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px', 
              backgroundColor: 'var(--bg)', 
              borderRadius: '6px', 
              marginBottom: '8px',
              border: '1px solid var(--border)'
            }}>
              <div>
                <span style={{ fontWeight: '700', color: 'var(--accentB)' }}>⭐</span>
                <span style={{ marginLeft: '8px', fontWeight: '600', color: 'var(--ink)' }}>{member.name}</span>
                <span style={{ marginLeft: '10px', fontSize: '13px', color: 'var(--muted)' }}>(Asst Head)</span>
              </div>
              <button
                onClick={() => handleRemoveTeammate(member.id, member.role)}
                disabled={removingId === member.id}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: removingId === member.id ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  opacity: removingId === member.id ? 0.6 : 1
                }}
              >
                {removingId === member.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
          
          {teamMembers.map(member => (
            <div key={`${member.id}-${member.role}`} className="team-member-item" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px', 
              backgroundColor: 'var(--bg)', 
              borderRadius: '6px', 
              marginBottom: '8px',
              border: '1px solid var(--border)'
            }}>
              <div>
                <span style={{ marginLeft: '28px', fontWeight: '500', color: 'var(--ink)' }}>{member.name}</span>
              </div>
              <button
                onClick={() => handleRemoveTeammate(member.id, member.role)}
                disabled={removingId === member.id}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: removingId === member.id ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  opacity: removingId === member.id ? 0.6 : 1
                }}
              >
                {removingId === member.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const genderLabel = currentGender === 'men' ? "Men's" : "Women's";

  return (
    <section id="team-list-app" className="app-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="team-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'var(--ink)' }}>Team List</h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              {weekendIdentifier || 'No team loaded'}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '6px' }}>Gender</label>
              <div className="toggle" style={{ maxWidth: '200px' }}>
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
            
            {/* Test Mode Toggle */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '6px' }}>Update Mode</label>
              <div className="toggle" style={{ maxWidth: '250px' }}>
                <div 
                  className={`opt ${testMode ? 'active' : ''}`}
                  onClick={() => setTestMode(true)}
                  style={{ backgroundColor: testMode ? '#ffc107' : '' }}
                >
                  🧪 Test
                </div>
                <div 
                  className={`opt ${!testMode ? 'active' : ''}`}
                  onClick={() => setTestMode(false)}
                  style={{ backgroundColor: !testMode ? '#dc3545' : '' }}
                >
                  ⚡ Live
                </div>
              </div>
            </div>
            
            <div className="team-total-card">
              <div className="team-total-title">Team Total</div>
              <div className="team-total-count">{teamRoster.length}</div>
            </div>
          </div>
        </div>

        <div className="team-content" style={{ flexGrow: 1, padding: '20px 24px', overflowY: 'auto', position: 'relative' }}>
          <div id="teamListGrid">
            {pescadoresLoading ? (
              <div className="progress-bar-container">
                <div className="progress-bar-label">Loading Data...</div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill"></div>
                </div>
              </div>
            ) : (
              <>
                {renderRectorSection()}
                {renderLeadershipSection()}
                {renderProfessorSection()}
                {unifiedTeamGroups.map(group => renderUnifiedTeamSection(group))}
              </>
            )}
          </div>
        </div>

        <div className="team-actions" style={{ padding: '15px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
              Team for: <strong id="teamGenderDisplayPanel">{genderLabel}</strong>
            </span>
          </div>
          <div className="team-action-buttons" style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleUpdateDatabaseClick}
              disabled={!weekendIdentifier || teamRoster.length === 0 || isUpdating}
              style={{
                backgroundColor: testMode ? '#ffc107' : '#28a745',
                borderColor: testMode ? '#ffc107' : '#28a745',
                color: testMode ? '#333' : 'white',
                fontWeight: 'bold'
              }}
              title={testMode ? 'Test mode: No actual changes will be made' : 'Live mode: Will update database'}
            >
              {isUpdating ? 'Processing...' : testMode ? '🧪 Test Update' : '⚡ Update Database'}
            </button>
            <button className="btn btn-warning" onClick={handlePrintRoster}>
              Print Report
            </button>
            <button className="btn btn-warning" onClick={handlePrintAllProfiles}>
              Print All Profiles
            </button>
            <button className="btn btn-primary" onClick={() => console.log('Export for Team Book')}>
              Export for Team Book
            </button>
            <button className="btn btn-info" onClick={() => console.log('Export to Team Badges')}>
              Export to Team Badges
            </button>
            <button className="btn btn-danger" onClick={() => console.log('Clear All')}>
              Clear All
            </button>
          </div>
        </div>

        {/* Update Database Confirmation Modal */}
        {showUpdateModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
                {testMode ? '🧪 TEST MODE: Preview Changes' : 'Update Database'} for {weekendIdentifier}?
              </h3>
              {testMode && (
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <strong style={{ color: '#856404' }}>🧪 Test Mode Active</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#856404' }}>
                    No actual database changes will be made. Check browser console for preview.
                  </p>
                </div>
              )}
              <p style={{ marginBottom: '20px', color: '#666', lineHeight: '1.6' }}>
                This will {testMode ? 'preview updating' : 'update'} <strong>{teamRoster.length} team member{teamRoster.length > 1 ? 's' : ''}</strong> with their service information:
              </p>
              <ul style={{ marginBottom: '25px', paddingLeft: '20px', color: '#666' }}>
                <li><strong>Last Service:</strong> Set to "{weekendIdentifier}"</li>
                <li><strong>Quantity:</strong> Increment by 1</li>
                <li><strong>Status:</strong> Upgrade N→I or I→E (if applicable)</li>
              </ul>
              <p style={{ marginBottom: '25px', fontSize: '14px', color: testMode ? '#856404' : '#dc3545', fontWeight: 500 }}>
                {testMode 
                  ? '💡 Test mode: Results will be shown in browser console. No database changes will be made.' 
                  : '⚠️ This action cannot be undone. Only the specific roles assigned on this team will be updated.'}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  disabled={isUpdating}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: isUpdating ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpdate}
                  disabled={isUpdating}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: testMode ? '#ffc107' : '#28a745',
                    color: testMode ? '#333' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    opacity: isUpdating ? 0.6 : 1
                  }}
                >
                  {isUpdating ? 'Processing...' : testMode ? '🧪 Run Test' : '⚡ Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}