// src/modules/TeamViewer/TeamList.jsx
// UPDATED: Added "Update Database" button to batch update team member service records
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import { generatePrintableProfileHTML, PRINT_PROFILE_CSS } from './../../utils/profilePrintUtils';

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
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [changingMember, setChangingMember] = useState(null); // { id, name, currentRole }
  const [newRole, setNewRole] = useState('');
  const [showBadgePanel, setShowBadgePanel] = useState(false);
  const [badgeExportType, setBadgeExportType] = useState('team');
  const [badgeCommunity, setBadgeCommunity] = useState('');
  const [badgeScripture, setBadgeScripture] = useState('');
  const [badgeTheme, setBadgeTheme] = useState('');
  const [badgeProfPosition, setBadgeProfPosition] = useState('blank');
  const [candidates, setCandidates] = useState([]);

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

  // Leadership roles that typically have only 1 person
  const LEADERSHIP_ROLES = [
    'Rector', 'BUR', 'Rover',
    'Head', 'Asst Head',
    'Head Kitchen', 'Asst Head Kitchen',
    'Head Prayer', 'Head Table', 'Head Chapel',
    'Head Dorm', 'Head Palanca', 'Head Gopher',
    'Head Storeroom', 'Head Floater Supply',
    'Head Worship', 'Head Media',
    'Head Spiritual Director'
  ];

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

  const handleChangeRoleClick = (memberId, memberName, currentRole) => {
    setChangingMember({ id: memberId, name: memberName, currentRole });
    setNewRole('');
    setShowChangeRoleModal(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!newRole || !changingMember) return;

    // Check if new role already has someone assigned
    const existingMembers = teamRoster.filter(m => m.role === newRole && m.id !== changingMember.id);
    
    if (existingMembers.length > 0 && LEADERSHIP_ROLES.includes(newRole)) {
      // Show warning confirmation
      const names = existingMembers.map(m => m.name).join(', ');
      window.showConfirm({
        title: '⚠️ Role Conflict Warning',
        message: `${newRole} already has ${existingMembers.length} person(s) assigned: ${names}.\n\nMoving ${changingMember.name} to ${newRole} will result in multiple people in this role.\n\nThis is allowed, but you may want to remove the other person(s) afterwards if this role should only have 1 person.`,
        confirmText: 'Continue Anyway',
        cancelText: 'Cancel',
        isDangerous: false,
        onConfirm: async () => {
          await executeRoleChange();
        }
      });
    } else {
      await executeRoleChange();
    }
  };

  const executeRoleChange = async () => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';

    try {
      const { error } = await supabase
        .from(rosterTable)
        .update({ role: newRole })
        .eq('pescadore_key', changingMember.id)
        .eq('weekend_identifier', weekendIdentifier)
        .eq('org_id', orgId);

      if (error) throw error;

      if (window.showMainStatus) {
        window.showMainStatus(`${changingMember.name} moved to ${newRole}`, false);
      }

      // Reload the team roster
      await loadTeamRoster(weekendIdentifier);
      
      setShowChangeRoleModal(false);
      setChangingMember(null);
      setNewRole('');
    } catch (error) {
      console.error('Error changing role:', error);
      if (window.showMainStatus) {
        window.showMainStatus('Failed to change role: ' + error.message, true);
      }
    }
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
    teamRoster.forEach((member) => {
      const displayRole = getDisplayName(member.role);
      const profile = rawTableData.find(p => p.PescadoreKey === member.id);
      const phone = profile?.Phone1 || '';
      const email = profile?.Email || '';
      
      tableRows += `
        <tr style="page-break-inside: avoid;">
          <td style="padding: 16px 10px; font-size: 12px; font-weight: 700; color: #212529;">${member.name}</td>
          <td style="padding: 16px 10px; font-size: 12px; font-weight: 700; color: #495057;">${displayRole}</td>
          <td style="padding: 16px 10px; font-size: 11px; font-weight: 700; color: #6c757d;">${phone}</td>
          <td style="padding: 16px 10px; font-size: 11px; font-weight: 700; color: #6c757d;">${email}</td>
          <td style="padding: 16px 10px; text-align: center;">
            <div style="width: 20px; height: 20px; border: 2px solid #6c757d; border-radius: 4px; margin: 0 auto; background-color: white;"></div>
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
        </head>
        <body style="font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: white;">
          <div style="padding: 100px 60px; min-height: 100vh;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 50px; padding-bottom: 20px; border-bottom: 3px solid #333;">
              <h1 style="font-size: 28px; font-weight: 700; color: #212529; margin: 0 0 8px 0;">Team Roster Print Out</h1>
              <div style="font-size: 18px; font-weight: 600; color: #495057; margin-bottom: 12px;">${weekendIdentifier || `${genderTitle}'s Team`}</div>
              <div style="font-size: 13px; color: #6c757d;">Generated on ${dateGenerated} at ${timeGenerated}</div>
            </div>
            
            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 80px;">
              <thead>
                <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">Name</th>
                  <th style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">Position</th>
                  <th style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">Phone</th>
                  <th style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">Email</th>
                  <th style="padding: 14px 12px; text-align: center; font-weight: 700; font-size: 14px; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">Contacted</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            
            <!-- Footer -->
            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #333;">
              <div style="font-size: 15px; font-weight: 700; color: #212529;">
                Total Team Members: <span style="color: #28a745; font-size: 18px;">${teamRoster.length}</span>
              </div>
            </div>
            
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

  const handlePrintAllProfiles = () => {
    console.log('handlePrintAllProfiles called!', { teamRoster, length: teamRoster?.length });
    if (!teamRoster || teamRoster.length === 0) {
      window.showMainStatus('No team members to print', true);
      return;
    }

    const rawTableData = allPescadores[currentGender];
    
    let allProfilesHTML = '';
    teamRoster.forEach(member => {
      const fullProfile = rawTableData.find(p => p.PescadoreKey === member.id);
      if (fullProfile) {
        const singleProfileHTML = generatePrintableProfileHTML(fullProfile);
        // Wrap each profile in a div that forces a page break after it and has consistent padding
        allProfilesHTML += `<div style="page-break-after: always; padding: 0.2in;">${singleProfileHTML}</div>`;
      }
    });

    const printableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Team Profile Reports</title>
          <style>
            ${PRINT_PROFILE_CSS}
          </style>
        </head>
        <body>
          ${allProfilesHTML}
        </body>
      </html>
    `;

    if (typeof printJS !== 'undefined') {
      printJS({
        printable: printableHTML,
        type: 'raw-html',
        documentTitle: 'Team Profiles'
      });
    } else {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printableHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleOpenBadgePanel = async () => {
    setShowBadgePanel(true);
    
    // Load organization name and candidates
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      if (orgError) throw orgError;
      setBadgeCommunity(orgData.name || '');

      // Load candidates
      const { data: candidatesData, error: candidatesError} = await supabase
        .from('cra_applications')
        .select('m_first, m_pref, f_first, f_pref, c_lastname')
        .eq('org_id', orgId);

      if (candidatesError) throw candidatesError;

      // Filter by gender and format
      const formattedCandidates = (candidatesData || []).map(c => {
        if (currentGender === 'men') {
          return {
            firstName: c.m_pref || c.m_first || '',
            lastName: c.c_lastname || ''
          };
        } else {
          return {
            firstName: c.f_pref || c.f_first || '',
            lastName: c.c_lastname || ''
          };
        }
      }).filter(c => c.firstName && c.lastName);

      setCandidates(formattedCandidates);
    } catch (error) {
      console.error('Error loading badge data:', error);
      if (window.showMainStatus) {
        window.showMainStatus('Failed to load badge data: ' + error.message, true);
      }
    }
  };

  const handleCloseBadgePanel = () => {
    setShowBadgePanel(false);
    setBadgeScripture('');
    setBadgeTheme('');
    setBadgeExportType('team');
    setBadgeProfPosition('blank');
  };

  const handleGenerateBadgeCSV = () => {
    if (!badgeScripture.trim() || !badgeTheme.trim()) {
      if (window.showMainStatus) {
        window.showMainStatus('Please enter Scripture and Theme', true);
      }
      return;
    }

    const csvRows = [];
    csvRows.push(['FirstName', 'LastName', 'Organization', 'WeekendInfo', 'Scripture', 'Theme', 'Position']);

    const rawTableData = allPescadores[currentGender];
    const weekendInfo = weekendIdentifier;

    // Add team members
    if (badgeExportType === 'team' || badgeExportType === 'both') {
      teamRoster.forEach(member => {
        const profile = rawTableData.find(p => p.PescadoreKey === member.id);
        if (profile) {
          const firstName = profile.Preferred || profile.First || '';
          const lastName = profile.Last || '';
          let position = member.role;

          // Handle professor positions
          if (position.startsWith('Prof_')) {
            if (badgeProfPosition === 'blank') {
              position = '';
            } else if (badgeProfPosition === 'table-leader') {
              position = 'Table Leader';
            } else {
              // Keep the role but remove Prof_ prefix
              position = position.replace('Prof_', '');
            }
          }

          csvRows.push([
            firstName,
            lastName,
            badgeCommunity,
            weekendInfo,
            badgeScripture,
            badgeTheme,
            position
          ]);
        }
      });
    }

    // Add candidates
    if (badgeExportType === 'candidates' || badgeExportType === 'both') {
      candidates.forEach(candidate => {
        csvRows.push([
          candidate.firstName,
          candidate.lastName,
          badgeCommunity,
          weekendInfo,
          badgeScripture,
          badgeTheme,
          '' // No position for candidates
        ]);
      });
    }

    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${weekendIdentifier}_Badges.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showMainStatus) {
      window.showMainStatus(`Badge CSV exported with ${csvRows.length - 1} entries`, false);
    }

    handleCloseBadgePanel();
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
    const headSpirDirector = teamRoster.filter(m => m.role === 'Head Spiritual Director');
    const spirDirectors = teamRoster.filter(m => m.role === 'Spiritual Director');
    const heads = teamRoster.filter(m => m.role === 'Head');
    const asstHeads = teamRoster.filter(m => m.role === 'Asst Head');
    const burs = teamRoster.filter(m => m.role === 'BUR');

    const totalCount = headSpirDirector.length + spirDirectors.length + heads.length + asstHeads.length + burs.length;

    return (
      <div className="unified-team-section">
        <div className="unified-team-header">
          <span>Leadership Team</span>
          {totalCount > 0 && <span className="team-header-count-badge">{totalCount}</span>}
        </div>
        <div className="unified-team-members two-column">
          {/* Column 1: Head, Asst Head, BUR, First Spiritual Director */}
          <div>
            {heads.map(person => (
              <div 
                key={person.id} 
                className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
              >
                <div className="single-role-name">Head</div>
                <div className="single-role-assigned">
                  <span className="unified-member-name">{person.name}</span>
                  <div className="member-actions">
                    <button 
                      className="change-role-btn"
                      onClick={() => handleChangeRoleClick(person.id, person.name, 'Head')}
                      title="Change Role"
                    >
                      ↔
                    </button>
                    <button 
                      className="remove-teammate-btn"
                      onClick={() => handleRemoveTeammate(person.id, 'Head')}
                      disabled={removingId === person.id}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {heads.length === 0 && (
              <div className="unified-member-item">
                <div className="single-role-name">Head</div>
                <div className="single-role-assigned">
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Not Assigned</span>
                </div>
              </div>
            )}

            {asstHeads.map(person => (
              <div 
                key={person.id} 
                className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
              >
                <div className="single-role-name">Asst Head</div>
                <div className="single-role-assigned">
                  <span className="unified-member-name">{person.name}</span>
                  <div className="member-actions">
                    <button 
                      className="change-role-btn"
                      onClick={() => handleChangeRoleClick(person.id, person.name, 'Asst Head')}
                      title="Change Role"
                    >
                      ↔
                    </button>
                    <button 
                      className="remove-teammate-btn"
                      onClick={() => handleRemoveTeammate(person.id, 'Asst Head')}
                      disabled={removingId === person.id}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {asstHeads.length === 0 && (
              <div className="unified-member-item">
                <div className="single-role-name">Asst Head</div>
                <div className="single-role-assigned">
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Not Assigned</span>
                </div>
              </div>
            )}

            {burs.map(person => (
              <div 
                key={person.id} 
                className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
              >
                <div className="single-role-name">BUR</div>
                <div className="single-role-assigned">
                  <span className="unified-member-name">{person.name}</span>
                  <div className="member-actions">
                    <button 
                      className="change-role-btn"
                      onClick={() => handleChangeRoleClick(person.id, person.name, 'BUR')}
                      title="Change Role"
                    >
                      ↔
                    </button>
                    <button 
                      className="remove-teammate-btn"
                      onClick={() => handleRemoveTeammate(person.id, 'BUR')}
                      disabled={removingId === person.id}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {burs.length === 0 && (
              <div className="unified-member-item">
                <div className="single-role-name">BUR</div>
                <div className="single-role-assigned">
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Not Assigned</span>
                </div>
              </div>
            )}

            {/* First Spiritual Director (non-head) in column 1 */}
            {spirDirectors.length > 0 && (
              <div 
                key={spirDirectors[0].id} 
                className={`unified-member-item ${removingId === spirDirectors[0].id ? 'removing' : ''}`}
              >
                <div className="single-role-name">Spiritual Director</div>
                <div className="single-role-assigned">
                  <span className="unified-member-name">{spirDirectors[0].name}</span>
                  <div className="member-actions">
                    <button 
                      className="change-role-btn"
                      onClick={() => handleChangeRoleClick(spirDirectors[0].id, spirDirectors[0].name, 'Spiritual Director')}
                      title="Change Role"
                    >
                      ↔
                    </button>
                    <button 
                      className="remove-teammate-btn"
                      onClick={() => handleRemoveTeammate(spirDirectors[0].id, 'Spiritual Director')}
                      disabled={removingId === spirDirectors[0].id}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Head Spiritual Director + Second Spiritual Director */}
          <div>
            {/* Head Spiritual Director with HEAD pill */}
            {headSpirDirector.map(person => (
              <div 
                key={person.id} 
                className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
              >
                <div className="single-role-assigned">
                  <span className="unified-member-name">
                    {person.name}
                    <span className="member-role-label head">HEAD</span>
                  </span>
                  <div className="member-actions">
                    <button 
                      className="change-role-btn"
                      onClick={() => handleChangeRoleClick(person.id, person.name, 'Head Spiritual Director')}
                      title="Change Role"
                    >
                      ↔
                    </button>
                    <button 
                      className="remove-teammate-btn"
                      onClick={() => handleRemoveTeammate(person.id, 'Head Spiritual Director')}
                      disabled={removingId === person.id}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {headSpirDirector.length === 0 && (
              <div className="unified-member-item">
                <div className="single-role-name">Spiritual Director</div>
                <div className="single-role-assigned">
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Not Assigned</span>
                </div>
              </div>
            )}

            {/* Second Spiritual Director (non-head) in column 2 */}
            {spirDirectors.length > 1 && (
              <div 
                key={spirDirectors[1].id} 
                className={`unified-member-item ${removingId === spirDirectors[1].id ? 'removing' : ''}`}
              >
                <div className="single-role-name">Spiritual Director</div>
                <div className="single-role-assigned">
                  <span className="unified-member-name">{spirDirectors[1].name}</span>
                  <div className="member-actions">
                    <button 
                      className="change-role-btn"
                      onClick={() => handleChangeRoleClick(spirDirectors[1].id, spirDirectors[1].name, 'Spiritual Director')}
                      title="Change Role"
                    >
                      ↔
                    </button>
                    <button 
                      className="remove-teammate-btn"
                      onClick={() => handleRemoveTeammate(spirDirectors[1].id, 'Spiritual Director')}
                      disabled={removingId === spirDirectors[1].id}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )}
            {spirDirectors.length < 2 && (
              <div className="unified-member-item">
                <div className="single-role-name">Spiritual Director</div>
                <div className="single-role-assigned">
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Not Assigned</span>
                </div>
              </div>
            )}
          </div>
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
                      <div className="member-actions">
                        <button 
                          className="change-role-btn"
                          onClick={() => handleChangeRoleClick(person.id, person.name, role)}
                          title="Change Role"
                        >
                          ↔
                        </button>
                        <button 
                          className="remove-teammate-btn"
                          onClick={() => handleRemoveTeammate(person.id, role)}
                          disabled={removingId === person.id}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
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
                <div className="member-actions">
                  <button 
                    className="change-role-btn"
                    onClick={() => handleChangeRoleClick(person.id, person.name, group.head)}
                    title="Change Role"
                  >
                    ↔
                  </button>
                  <button 
                    className="remove-teammate-btn"
                    onClick={() => handleRemoveTeammate(person.id, group.head)}
                    disabled={removingId === person.id}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
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
                <div className="member-actions">
                  <button 
                    className="change-role-btn"
                    onClick={() => handleChangeRoleClick(person.id, person.name, group.assistantHead)}
                    title="Change Role"
                  >
                    ↔
                  </button>
                  <button 
                    className="remove-teammate-btn"
                    onClick={() => handleRemoveTeammate(person.id, group.assistantHead)}
                    disabled={removingId === person.id}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
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
                <div className="member-actions">
                  <button 
                    className="change-role-btn"
                    onClick={() => handleChangeRoleClick(person.id, person.name, group.team)}
                    title="Change Role"
                  >
                    ↔
                  </button>
                  <button 
                    className="remove-teammate-btn"
                    onClick={() => handleRemoveTeammate(person.id, group.team)}
                    disabled={removingId === person.id}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
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
      <div className="card pad" style={{ marginBottom: '12px' }}>
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

      </div>

        <div style={{ padding: '15px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
          <button className="btn btn-info" onClick={handleOpenBadgePanel}>
              Export to Team Badges
            </button>
          <button className="btn btn-danger" onClick={() => console.log('Clear All')}>
              Clear All
            </button>
        </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
        <div 
          className="card pad" 
          style={{ 
            width: showBadgePanel ? '70%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
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

        

        {showBadgePanel && (
          <div 
            className="card pad"
            style={{
              width: '30%',
              minHeight: 'calc(100vh - 300px)',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid var(--accentB)' }}>
              <h3 style={{ margin: 0, color: 'var(--accentB)', fontSize: '1.1rem' }}>Export Badge CSV</h3>
              <button className="btn btn-small" onClick={handleCloseBadgePanel} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Close ✕</button>
            </div>

            <div className="field"><label className="label">Weekend</label><div style={{ fontWeight: 600 }}>{weekendIdentifier}</div></div>
            <div className="field"><label className="label">Community</label><div style={{ fontWeight: 600 }}>{badgeCommunity}</div></div>

            <div className="field">
              <label className="label">Export Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" name="exportType" value="team" checked={badgeExportType === 'team'} onChange={(e) => setBadgeExportType(e.target.value)} style={{ marginRight: '8px' }} /><span>Team Only ({teamRoster.length})</span></label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" name="exportType" value="candidates" checked={badgeExportType === 'candidates'} onChange={(e) => setBadgeExportType(e.target.value)} style={{ marginRight: '8px' }} /><span>Candidates Only ({candidates.length})</span></label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" name="exportType" value="both" checked={badgeExportType === 'both'} onChange={(e) => setBadgeExportType(e.target.value)} style={{ marginRight: '8px' }} /><span>Team + Candidates ({teamRoster.length + candidates.length})</span></label>
              </div>
            </div>

            <div className="field"><label className="label">Scripture Verse</label><input type="text" className="input" placeholder="e.g., John 3:16" value={badgeScripture} onChange={(e) => setBadgeScripture(e.target.value)} /></div>
            <div className="field"><label className="label">Weekend Theme</label><input type="text" className="input" placeholder="e.g., Stand Firm" value={badgeTheme} onChange={(e) => setBadgeTheme(e.target.value)} /></div>

            <div className="field">
              <label className="label">Professor Positions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" name="profPosition" value="show" checked={badgeProfPosition === 'show'} onChange={(e) => setBadgeProfPosition(e.target.value)} style={{ marginRight: '8px' }} /><span>Show Position (Silent, Ideals, etc.)</span></label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" name="profPosition" value="blank" checked={badgeProfPosition === 'blank'} onChange={(e) => setBadgeProfPosition(e.target.value)} style={{ marginRight: '8px' }} /><span>Leave Blank</span></label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" name="profPosition" value="table-leader" checked={badgeProfPosition === 'table-leader'} onChange={(e) => setBadgeProfPosition(e.target.value)} style={{ marginRight: '8px' }} /><span>Show "Table Leader"</span></label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn" onClick={handleCloseBadgePanel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerateBadgeCSV}>Generate CSV</button>
            </div>
          </div>
        )}

      </div>
        {/* Change Role Modal */}
        {showChangeRoleModal && changingMember && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              backgroundColor: 'var(--panel)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--panel-header)'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
                  Change Role
                </h3>
              </div>

              {/* Body */}
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '4px' }}>Member:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>{changingMember.name}</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '4px' }}>Current Role:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accentB)' }}>{changingMember.currentRole}</div>
                </div>

                <div>
                  <label className="label" style={{ display: 'block', marginBottom: '8px' }}>New Role:</label>
                  <select 
                    className="input"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                  >
                    <option value="">-- Select New Role --</option>
                    
                    <optgroup label="Leadership">
                      <option value="Rector">Rector</option>
                      <option value="BUR">BUR</option>
                      <option value="Rover">Rover</option>
                      <option value="Head">Head</option>
                      <option value="Asst Head">Asst Head</option>
                      <option value="Head Spiritual Director">Head Spiritual Director</option>
                      <option value="Spiritual Director">Spiritual Director</option>
                    </optgroup>
                    
                    <optgroup label="Kitchen Team">
                      <option value="Head Kitchen">Head Kitchen</option>
                      <option value="Asst Head Kitchen">Asst Head Kitchen</option>
                      <option value="Kitchen">Kitchen</option>
                    </optgroup>
                    
                    <optgroup label="Prayer Team">
                      <option value="Head Prayer">Head Prayer</option>
                      <option value="Prayer">Prayer</option>
                    </optgroup>
                    
                    <optgroup label="Table Team">
                      <option value="Head Table">Head Table</option>
                      <option value="Table">Table</option>
                    </optgroup>
                    
                    <optgroup label="Chapel Team">
                      <option value="Head Chapel">Head Chapel</option>
                      <option value="Chapel">Chapel</option>
                    </optgroup>
                    
                    <optgroup label="Dorm Team">
                      <option value="Head Dorm">Head Dorm</option>
                      <option value="Dorm">Dorm</option>
                    </optgroup>
                    
                    <optgroup label="Palanca Team">
                      <option value="Head Palanca">Head Palanca</option>
                      <option value="Palanca">Palanca</option>
                    </optgroup>
                    
                    <optgroup label="Gopher Team">
                      <option value="Head Gopher">Head Gopher</option>
                      <option value="Gopher">Gopher</option>
                    </optgroup>
                    
                    <optgroup label="Storeroom Team">
                      <option value="Head Storeroom">Head Storeroom</option>
                      <option value="Storeroom">Storeroom</option>
                    </optgroup>
                    
                    <optgroup label="Floater Supply Team">
                      <option value="Head Floater Supply">Head Floater Supply</option>
                      <option value="Floater Supply">Floater Supply</option>
                    </optgroup>
                    
                    <optgroup label="Worship Team">
                      <option value="Head Worship">Head Worship</option>
                      <option value="Worship">Worship</option>
                    </optgroup>
                    
                    <optgroup label="Media Team">
                      <option value="Head Media">Head Media</option>
                      <option value="Media">Media</option>
                    </optgroup>
                    
                    <optgroup label="Professor Team">
                      <option value="Prof_Silent">Silent</option>
                      <option value="Prof_Ideals">Ideals</option>
                      <option value="Prof_Church">Church</option>
                      <option value="Prof_Piety">Piety</option>
                      <option value="Prof_Study">Study</option>
                      <option value="Prof_Action">Action</option>
                      <option value="Prof_Leaders">Leaders</option>
                      <option value="Prof_Environments">Environments</option>
                      <option value="Prof_CCIA">CCIA</option>
                      <option value="Prof_Reunion">Reunion</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'var(--panel-header)'
              }}>
                <button 
                  className="btn"
                  onClick={() => {
                    setShowChangeRoleModal(false);
                    setChangingMember(null);
                    setNewRole('');
                  }}
                  style={{ minWidth: '100px' }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleConfirmRoleChange}
                  disabled={!newRole}
                  style={{ minWidth: '100px' }}
                >
                  Change Role
                </button>
              </div>
            </div>
          </div>
        )}


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

    </section>
  );
}