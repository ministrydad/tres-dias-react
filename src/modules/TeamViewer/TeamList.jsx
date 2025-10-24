// src/modules/TeamViewer/TeamList.jsx
// UPDATED: Added "Update Database" button to batch update team member service records
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';

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

          window.showMainStatus?.(`Removed from ${role}`, false);

          if (weekendIdentifier) {
            const rawTableData = allPescadores[currentGender];
            const { data, error: fetchError } = await supabase
              .from(rosterTable)
              .select('pescadore_key, role')
              .eq('weekend_identifier', weekendIdentifier)
              .eq('org_id', orgId);

            if (fetchError) throw fetchError;

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
          } else {
            console.error('No weekendIdentifier available for reload');
            window.showMainStatus?.('Error: Could not reload roster', true);
          }
        } catch (error) {
          console.error('Error removing teammate:', error);
          window.showMainStatus?.(`Failed to remove teammate: ${error.message}`, true);
        } finally {
          setRemovingId(null);
        }
      }
    });
  };

  // NEW: Update Database functionality
  const handleUpdateDatabaseClick = () => {
    if (!weekendIdentifier || teamRoster.length === 0) {
      window.showMainStatus?.('No team loaded to update', true);
      return;
    }
    setShowUpdateModal(true);
  };

  const handleConfirmUpdate = async () => {
    setIsUpdating(true);
    const tableName = currentGender === 'men' ? 'men_raw' : 'women_raw';
    const rawTableData = allPescadores[currentGender];
    
    let successCount = 0;
    let errorCount = 0;
    const previewChanges = []; // Store changes for test mode
    
    try {
      // Process each team member
      for (const member of teamRoster) {
        const profile = rawTableData.find(p => p.PescadoreKey === member.id);
        if (!profile) {
          console.warn(`Profile not found for ${member.name}`);
          errorCount++;
          continue;
        }
        
        const role = member.role;
        const updateData = {};
        
        // Determine field names based on role type
        let statusField = role;
        let lastField = `${role} Service`;
        let qtyField;
        
        // Handle professor roles (different naming convention)
        if (role.startsWith('Prof_')) {
          qtyField = `${role}_Service_Qty`;
        } else {
          qtyField = `${role.replace(/ /g, '_')}_Service_Qty`;
        }
        
        // Update STATUS (N → I, I → E, E stays E)
        const currentStatus = (profile[statusField] || 'N').toUpperCase();
        let newStatus = currentStatus;
        if (currentStatus === 'N') {
          newStatus = 'I';
          updateData[statusField] = 'I';
        } else if (currentStatus === 'I') {
          newStatus = 'E';
          updateData[statusField] = 'E';
        }
        // If already 'E', no change needed
        
        // Update LAST SERVICE to current weekend identifier
        const currentLast = profile[lastField] || '(none)';
        updateData[lastField] = weekendIdentifier;
        
        // Increment QUANTITY by 1
        const currentQty = parseInt(profile[qtyField] || 0, 10);
        const newQty = currentQty + 1;
        updateData[qtyField] = newQty;
        
        // Store preview for test mode
        previewChanges.push({
          name: member.name,
          role,
          statusChange: `${currentStatus} → ${newStatus}`,
          lastChange: `${currentLast} → ${weekendIdentifier}`,
          qtyChange: `${currentQty} → ${newQty}`,
          statusField,
          lastField,
          qtyField,
          updateData
        });
        
        // TEST MODE: Skip actual database update
        if (!testMode) {
          // Update database
          const { error } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('PescadoreKey', member.id)
            .eq('org_id', orgId);
          
          if (error) {
            console.error(`Error updating ${member.name}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          // In test mode, just count as success
          successCount++;
        }
      }
      
      // Show results
      if (testMode) {
        console.log('🧪 TEST MODE - No actual database changes made');
        console.log('📋 Preview of changes that WOULD be made:');
        console.table(previewChanges);
        window.showMainStatus?.(
          `TEST MODE: Would update ${successCount} team member${successCount > 1 ? 's' : ''} (check console for details)`,
          false
        );
      } else {
        if (errorCount === 0) {
          window.showMainStatus?.(
            `Successfully updated ${successCount} team member${successCount > 1 ? 's' : ''}!`,
            false
          );
        } else {
          window.showMainStatus?.(
            `Updated ${successCount} members, ${errorCount} error${errorCount > 1 ? 's' : ''}`,
            true
          );
        }
      }
      
      // Close modal
      setShowUpdateModal(false);
      
    } catch (error) {
      console.error('Error in batch update:', error);
      window.showMainStatus?.('An error occurred during update', true);
    } finally {
      setIsUpdating(false);
    }
  };


  const handlePrintRoster = () => {
    if (!teamRoster || teamRoster.length === 0) {
      window.showMainStatus('No team members to print', true);
      return;
    }

    const genderTitle = currentGender.charAt(0).toUpperCase() + currentGender.slice(1);
    const now = new Date();
    const dateGenerated = now.toLocaleDateString();
    const timeGenerated = now.toLocaleTimeString();
    
    // Helper function to get display name for role
    const getDisplayName = (role) => {
      // Check if it's a professor role
      const profRole = ROLE_CONFIG.professor.find(r => r.key === role);
      if (profRole) return profRole.name;
      
      // Otherwise return the role as-is
      return role;
    };
    
    // Get full profile data for phone and email
    const rawTableData = allPescadores[currentGender];
    
    let tableRows = '';
    teamRoster.forEach(member => {
      const displayRole = getDisplayName(member.role);
      const profile = rawTableData.find(p => p.PescadoreKey === member.id);
      const phone = profile?.Phone1 || '';
      const email = profile?.Email || '';
      
      tableRows += `
        <tr>
          <td>${member.name}</td>
          <td>${displayRole}</td>
          <td>${phone}</td>
          <td>${email}</td>
          <td style="text-align: center;">
            <div class="checkbox"></div>
          </td>
        </tr>
      `;
    });

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Team Roster - ${weekendIdentifier || genderTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              color: #333;
              padding: 40px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .header {
              text-align: center;
              margin-bottom: 32px;
              padding-bottom: 20px;
              border-bottom: 3px solid #333;
            }
            
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              color: #212529;
              margin-bottom: 8px;
            }
            
            .header .weekend {
              font-size: 18px;
              font-weight: 600;
              color: #495057;
              margin-bottom: 12px;
            }
            
            .header .meta {
              font-size: 13px;
              color: #6c757d;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
            }
            
            thead tr {
              background-color: #f8f9fa;
              border-bottom: 2px solid #dee2e6;
            }
            
            th {
              padding: 14px 12px;
              text-align: left;
              font-weight: 700;
              font-size: 14px;
              color: #495057;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            th:last-child {
              text-align: center;
            }
            
            tbody tr {
              border-bottom: 1px solid #dee2e6;
              page-break-inside: avoid;
            }
            
            tbody tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            tbody tr:hover {
              background-color: #e9ecef;
            }
            
            td {
              padding: 10px 8px;
              font-size: 12px;
              font-weight: 700;
              color: #212529;
            }
            
            td:first-child {
              font-weight: 700;
            }
            
            td:nth-child(2) {
              color: #495057;
            }
            
            td:nth-child(3),
            td:nth-child(4) {
              font-size: 11px;
              color: #6c757d;
            }
            
            .checkbox {
              width: 20px;
              height: 20px;
              border: 2px solid #6c757d;
              border-radius: 4px;
              margin: 0 auto;
              background-color: white;
            }
            
            .footer {
              margin-top: 32px;
              padding-top: 20px;
              border-top: 2px solid #333;
              display: flex;
              justify-content: space-between;
              align-items: center;
              page-break-inside: avoid;
            }
            
            .footer .total {
              font-size: 15px;
              font-weight: 700;
              color: #212529;
            }
            
            .footer .total span {
              color: #28a745;
              font-size: 18px;
            }
            
            @page {
              size: portrait;
              margin: 1.25in 0.75in 1.5in 0.75in;
            }
            
            @media print {
              body {
                padding-top: 0.75in;
                padding-bottom: 0.75in;
              }
              
              table {
                page-break-after: auto;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              tbody {
                orphans: 3;
                widows: 3;
              }
              
              thead {
                display: table-header-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Team Roster Print Out</h1>
            <div class="weekend">${weekendIdentifier || `${genderTitle}'s Team`}</div>
            <div class="meta">Generated on ${dateGenerated} at ${timeGenerated}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Contacted</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div class="footer">
            <div class="total">Total Team Members: <span>${teamRoster.length}</span></div>
          </div>
        </body>
      </html>
    `;

    if (typeof printJS !== 'undefined') {
      printJS({
        printable: printHTML,
        type: 'raw-html',
        documentTitle: `Team Roster - ${weekendIdentifier || genderTitle}`
      });
    } else {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };
  const renderRectorSection = () => {
    const rector = teamRoster.find(m => m.role === 'Rector');
    
    return (
      <div className="rector-section">
        <div className="rector-title">RECTOR</div>
        <div id="rectorContainer">
          {rector ? (
            <div 
              className={`rector-badge ${removingId === rector.id ? 'removing' : ''}`}
              onClick={() => handleRemoveTeammate(rector.id, 'Rector')}
            >
              <span className="rector-name">{rector.name}</span>
              <span className="remove-rector-btn">Remove</span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', padding: '10px' }}>
              No Rector Assigned
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeadershipSection = () => {
    const leadershipRoles = ['Head', 'Asst Head', 'BUR', 'Head Spiritual Director', 'Spiritual Director'];
    const leaders = leadershipRoles.map(role => ({
      role,
      members: teamRoster.filter(m => m.role === role)
    }));

    const totalCount = leaders.reduce((sum, l) => sum + l.members.length, 0);

    return (
      <div className="unified-team-section">
        <div className="unified-team-header">
          <span>Leadership Team</span>
          {totalCount > 0 && <span className="team-header-count-badge">{totalCount}</span>}
        </div>
        <div className="unified-team-members two-column">
          {leaders.map(({ role, members }) => (
            <div key={role}>
              {members.length > 0 ? (
                members.map(person => (
                  <div 
                    key={person.id} 
                    className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
                  >
                    <div className="single-role-name">{role}</div>
                    <div className="single-role-assigned">
                      <span className="unified-member-name">{person.name}</span>
                      <button 
                        className="remove-teammate-btn"
                        onClick={() => handleRemoveTeammate(person.id, role)}
                        disabled={removingId === person.id}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="unified-member-item">
                  <div className="single-role-name">{role}</div>
                  <div className="single-role-assigned">
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Not Assigned</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProfessorSection = () => {
    const professorRoles = ROLE_CONFIG.professor.map(r => r.key);
    const professors = professorRoles.map(role => ({
      role,
      displayName: ROLE_CONFIG.professor.find(r => r.key === role)?.name || role,
      members: teamRoster.filter(m => m.role === role)
    }));

    const totalCount = professors.reduce((sum, p) => sum + p.members.length, 0);

    return (
      <div className="unified-team-section">
        <div className="unified-team-header">
          <span>Professor Team</span>
          {totalCount > 0 && <span className="team-header-count-badge">{totalCount}</span>}
        </div>
        <div className="unified-team-members two-column">
          {professors.map(({ role, displayName, members }) => (
            <div key={role}>
              {members.length > 0 ? (
                members.map(person => (
                  <div 
                    key={person.id} 
                    className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
                  >
                    <div className="single-role-name">{displayName}</div>
                    <div className="single-role-assigned">
                      <span className="unified-member-name">{person.name}</span>
                      <button 
                        className="remove-teammate-btn"
                        onClick={() => handleRemoveTeammate(person.id, role)}
                        disabled={removingId === person.id}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="unified-member-item">
                  <div className="single-role-name">{displayName}</div>
                  <div className="single-role-assigned">
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Not Assigned</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUnifiedTeamSection = (group) => {
    const headMembers = teamRoster.filter(m => m.role === group.head);
    const assistantHeadMembers = group.assistantHead ? teamRoster.filter(m => m.role === group.assistantHead) : [];
    const teamMembers = teamRoster.filter(m => m.role === group.team);

    const totalCount = headMembers.length + assistantHeadMembers.length + teamMembers.length;

    return (
      <div key={group.title} className="unified-team-section">
        <div className="unified-team-header">
          <span>{group.title}</span>
          {totalCount > 0 && <span className="team-header-count-badge">{totalCount}</span>}
        </div>
        <div className="unified-team-members two-column">
          {headMembers.map(person => (
            <div 
              key={person.id} 
              className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
            >
              <div className="single-role-assigned">
                <span className="unified-member-name">
                  {person.name}
                  <span className="member-role-label head">HEAD</span>
                </span>
                <button 
                  className="remove-teammate-btn"
                  onClick={() => handleRemoveTeammate(person.id, group.head)}
                  disabled={removingId === person.id}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {assistantHeadMembers.map(person => (
            <div 
              key={person.id} 
              className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
            >
              <div className="single-role-assigned">
                <span className="unified-member-name">
                  {person.name}
                  <span className="member-role-label asst-head">ASST HEAD</span>
                </span>
                <button 
                  className="remove-teammate-btn"
                  onClick={() => handleRemoveTeammate(person.id, group.assistantHead)}
                  disabled={removingId === person.id}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {teamMembers.map(person => (
            <div 
              key={person.id} 
              className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
            >
              <div className="single-role-assigned">
                <span className="unified-member-name">{person.name}</span>
                <button 
                  className="remove-teammate-btn"
                  onClick={() => handleRemoveTeammate(person.id, group.team)}
                  disabled={removingId === person.id}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const genderLabel = currentGender.charAt(0).toUpperCase() + currentGender.slice(1);
  let displayId = weekendIdentifier || '';
  if (weekendIdentifier) {
    const match = weekendIdentifier.match(/(\w+)'s (\d+)/);
    if (match && !weekendIdentifier.toLowerCase().includes('weekend')) {
      displayId = `${match[1]}'s Weekend ${match[2]}`;
    }
  }

  return (
    <section id="team-list-app" className="app-panel" style={{ display: 'block', padding: 0 }}>
      <div className="card">
        <div className="section-title" id="teamListTitle" style={{ margin: '24px 24px 0', paddingBottom: '20px' }}>
          <span>{genderLabel}'s Team List</span>
          {displayId && (
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 400, marginLeft: '15px' }}>
              {displayId}
            </span>
          )}
        </div>

        <div className="team-list-controls">
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '6px' }}>Select Team Roster</label>
            <div className="toggle" id="teamListGenderToggle" style={{ maxWidth: '250px' }}>
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
            <button className="btn btn-warning" onClick={() => console.log('Print All Profiles')}>
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