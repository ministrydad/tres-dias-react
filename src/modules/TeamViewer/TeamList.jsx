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
  const [expandedRows, setExpandedRows] = useState(new Set()); // Track expanded rows by ID
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const tourSteps = [
    {
      target: 'gender-toggle',
      title: 'Toggle Gender',
      content: 'Switch between Men\'s and Women\'s team rosters to view different teams.',
      position: 'bottom'
    },
    {
      target: 'tour-team-column',
      title: 'Team Roles & Members',
      content: 'Each column shows team roles with assigned members. You can see the head, team members, and options to remove or change positions.',
      position: 'right'
    },
    {
      target: 'tour-action-buttons',
      title: 'Change or Remove',
      content: 'Click "Change" to reassign someone to a different role, or "Remove" to take them off the team.',
      position: 'left'
    },
    {
      target: 'tour-export-buttons',
      title: 'Export & Print Options',
      content: 'Use these buttons to export your team data and print profiles for team records.',
      position: 'bottom'
    },
    {
      target: 'tour-update-database',
      title: 'Update Database',
      content: 'Click this to save the current team roster to the database, updating service records for all team members.',
      position: 'bottom'
    }
  ];

  const startTour = () => {
    setShowTour(true);
    setTourStep(0);
  };

  const nextTourStep = () => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      closeTour();
    }
  };

  const closeTour = () => {
    setShowTour(false);
    setTourStep(0);
    localStorage.setItem('teamListTourCompleted', 'true');
  };

  useEffect(() => {
    const tourCompleted = localStorage.getItem('teamListTourCompleted');
    if (!tourCompleted && teamRoster.length > 0) {
      // Auto-start tour after data loads (only first time)
      setTimeout(() => setShowTour(true), 1000);
    }
  }, [teamRoster]);
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
              role: entry.role,
              email: profile.Email || '',
              phone: profile.Phone1 || profile.Phone2 || ''
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

  const toggleRowExpansion = (personId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
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
    const isExpanded = rector && expandedRows.has(rector.id);
    
    return (
      <div className="card pad" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="small-card-header" style={{ flex: 1, margin: '-24px -24px 16px -24px' }}>
            Rector
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginTop: '-8px' }}>
          <div className="team-total-card" id="team-total-card">
            <div className="team-total-title">Team Total</div>
            <div className="team-total-count">{teamRoster.length}</div>
          </div>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>
                {rector ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span 
                      onClick={() => toggleRowExpansion(rector.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                      {rector.name}
                    </span>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleRemoveTeammate(rector.id, 'Rector')}
                      disabled={removingId === rector.id}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No Rector Assigned</span>
                )}
              </td>
            </tr>
            {isExpanded && rector && (
              <tr className="expanded-row">
                <td>
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: 'var(--panel-header)', 
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    lineHeight: '1.6'
                  }}>
                    {rector.email && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                        <a href={`mailto:${rector.email}`} style={{ color: 'var(--accentB)' }}>{rector.email}</a>
                      </div>
                    )}
                    {rector.phone && (
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                        <a href={`tel:${rector.phone}`} style={{ color: 'var(--accentB)' }}>{rector.phone}</a>
                      </div>
                    )}
                    {!rector.email && !rector.phone && (
                      <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

    const renderRow = (role, person, showLabel = true) => {
      if (!person) {
        return (
          <tr key={`empty-${role}`}>
            {showLabel && <td style={{ fontWeight: 500, width: '30%' }}>{role}</td>}
            <td style={{ fontWeight: 600 }}>
              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Not Assigned</span>
            </td>
          </tr>
        );
      }

      const isExpanded = expandedRows.has(person.id);
      
      return (
        <>
          <tr key={person.id} className={removingId === person.id ? 'removing' : ''}>
            {showLabel && <td style={{ fontWeight: 500, width: '30%' }}>{role}</td>}
            <td style={{ fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  onClick={() => toggleRowExpansion(person.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                  {person.name}
                  {role === 'Head Spiritual Director' && (
                    <span style={{ 
                      marginLeft: '8px', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: '#28a745',
                      color: 'white'
                    }}>HEAD</span>
                  )}
                </span>
                <div id="tour-action-buttons" style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-small"
                    onClick={() => handleChangeRoleClick(person.id, person.name, person.role)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Change
                  </button>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleRemoveTeammate(person.id, person.role)}
                    disabled={removingId === person.id}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </td>
          </tr>
          {isExpanded && (
            <tr key={`${person.id}-details`} className="expanded-row">
              {showLabel && <td></td>}
              <td colSpan={showLabel ? 1 : 2}>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--panel-header)', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6'
                }}>
                  {person.email && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                      <a href={`mailto:${person.email}`} style={{ color: 'var(--accentB)' }}>{person.email}</a>
                    </div>
                  )}
                  {person.phone && (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                      <a href={`tel:${person.phone}`} style={{ color: 'var(--accentB)' }}>{person.phone}</a>
                    </div>
                  )}
                  {!person.email && !person.phone && (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </>
      );
    };

    return (
      <div className="card pad" id="tour-team-section" style={{ marginBottom: '20px' }}>
        <div className="small-card-header">
          Leadership Team {totalCount > 0 && <span style={{ marginLeft: '8px' }}>({totalCount})</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          <table className="table" id="tour-team-column">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {renderRow('Head', heads[0])}
              {renderRow('Asst Head', asstHeads[0])}
              {renderRow('BUR', burs[0])}
            </tbody>
          </table>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {renderRow('Head Spiritual Director', headSpirDirector[0])}
              {spirDirectors.map((sd, idx) => renderRow('Spiritual Director', sd))}
            </tbody>
          </table>
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

    const renderRow = (prof) => {
      const person = prof.members[0];
      
      if (!person) {
        return (
          <tr key={prof.role}>
            <td style={{ fontWeight: 500, width: '30%' }}>{prof.displayName}</td>
            <td style={{ fontWeight: 600 }}>
              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Not Assigned</span>
            </td>
          </tr>
        );
      }

      const isExpanded = expandedRows.has(person.id);

      return (
        <>
          <tr key={prof.role} className={removingId === person.id ? 'removing' : ''}>
            <td style={{ fontWeight: 500, width: '30%' }}>{prof.displayName}</td>
            <td style={{ fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  onClick={() => toggleRowExpansion(person.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                  {person.name}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-small"
                    onClick={() => handleChangeRoleClick(person.id, person.name, prof.role)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Change
                  </button>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleRemoveTeammate(person.id, prof.role)}
                    disabled={removingId === person.id}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </td>
          </tr>
          {isExpanded && (
            <tr key={`${person.id}-details`} className="expanded-row">
              <td></td>
              <td>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--panel-header)', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6'
                }}>
                  {person.email && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                      <a href={`mailto:${person.email}`} style={{ color: 'var(--accentB)' }}>{person.email}</a>
                    </div>
                  )}
                  {person.phone && (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                      <a href={`tel:${person.phone}`} style={{ color: 'var(--accentB)' }}>{person.phone}</a>
                    </div>
                  )}
                  {!person.email && !person.phone && (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </>
      );
    };

    // Split professors into two columns
    const midpoint = Math.ceil(professors.length / 2);
    const leftColumn = professors.slice(0, midpoint);
    const rightColumn = professors.slice(midpoint);

    return (
      <div className="card pad" style={{ marginBottom: '20px' }}>
        <div className="small-card-header">
          Professor Team {totalCount > 0 && <span style={{ marginLeft: '8px' }}>({totalCount})</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {leftColumn.map(renderRow)}
            </tbody>
          </table>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {rightColumn.map(renderRow)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

    const renderUnifiedTeamSection = (group) => {
    const headMembers = teamRoster.filter(m => m.role === group.head);
    const assistantHeadMembers = group.assistantHead ? teamRoster.filter(m => m.role === group.assistantHead) : [];
    const teamMembers = teamRoster.filter(m => m.role === group.team);

    const totalCount = headMembers.length + assistantHeadMembers.length + teamMembers.length;

    const renderRow = (person, roleLabel) => {
      const isExpanded = expandedRows.has(person.id);

      return (
        <>
          <tr key={person.id} className={removingId === person.id ? 'removing' : ''}>
            <td style={{ fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  onClick={() => toggleRowExpansion(person.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                  {person.name}
                  {roleLabel && (
                    <span style={{ 
                      marginLeft: '8px', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: roleLabel === 'HEAD' ? '#28a745' : '#ffc107',
                      color: roleLabel === 'HEAD' ? 'white' : '#333'
                    }}>{roleLabel}</span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-small"
                    onClick={() => handleChangeRoleClick(person.id, person.name, person.role)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Change
                  </button>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleRemoveTeammate(person.id, person.role)}
                    disabled={removingId === person.id}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </td>
          </tr>
          {isExpanded && (
            <tr key={`${person.id}-details`} className="expanded-row">
              <td>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--panel-header)', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6'
                }}>
                  {person.email && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                      <a href={`mailto:${person.email}`} style={{ color: 'var(--accentB)' }}>{person.email}</a>
                    </div>
                  )}
                  {person.phone && (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                      <a href={`tel:${person.phone}`} style={{ color: 'var(--accentB)' }}>{person.phone}</a>
                    </div>
                  )}
                  {!person.email && !person.phone && (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </>
      );
    };

    // Combine all members for two-column layout
    const allMembers = [
      ...headMembers.map(m => ({ ...m, roleLabel: 'HEAD' })),
      ...assistantHeadMembers.map(m => ({ ...m, roleLabel: 'ASST HEAD' })),
      ...teamMembers.map(m => ({ ...m, roleLabel: null }))
    ];

    const midpoint = Math.ceil(allMembers.length / 2);
    const leftColumn = allMembers.slice(0, midpoint);
    const rightColumn = allMembers.slice(midpoint);

    return (
      <div key={group.title} className="card pad" style={{ marginBottom: '20px' }}>
        <div className="small-card-header">
          {group.title} {totalCount > 0 && <span style={{ marginLeft: '8px' }}>({totalCount})</span>}
        </div>
        {allMembers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {leftColumn.map(m => renderRow(m, m.roleLabel))}
              </tbody>
            </table>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {rightColumn.map(m => renderRow(m, m.roleLabel))}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center' }}>
                  No team members assigned
                </td>
              </tr>
            </tbody>
          </table>
        )}
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
        <div className="section-title" id="weekend-selector">
          <span>{genderLabel}'s Team List</span>
          {displayId && (
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 400, marginLeft: '15px' }}>
              {displayId}
            </span>
          )}
        </div>

        <div style={{ 
          padding: '0 0 15px 0', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Gender Toggle - Left Side */}
          <div className="toggle" id="gender-toggle" style={{ maxWidth: '250px' }}>
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

          {/* Action Buttons - Right Side */}
          <div id="tour-export-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
<button className="btn btn-warning" onClick={handlePrintRoster}>
              Print Report
            </button>
          <button className="btn btn-warning" onClick={handlePrintAllProfiles}>
              Print All Profiles
            </button>
          <button 
              id="tour-update-database"
              className="btn btn-primary" 
              onClick={handleUpdateDatabaseClick}
              disabled={!weekendIdentifier || teamRoster.length === 0 || isUpdating}
              style={{
                backgroundColor: '#28a745',
                borderColor: '#28a745',
                color: 'white',
                fontWeight: 'bold'
              }}
              title='Update database with service records'
            >
              {isUpdating ? 'Processing...' : 'Update Database'}
            </button>
          <button className="btn btn-primary" onClick={() => console.log('Export for Team Book')}>
              Export for Team Book
            </button>
          <button className="btn btn-primary" id="export-badge-btn" onClick={handleOpenBadgePanel}>
              Export to Team Badges
            </button>
          </div>
        </div>
          
      </div>

        

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div 
          style={{ 
            width: showBadgePanel ? '70%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
          <div id="teamListGrid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            id="badge-export-panel"
            className="card pad"
            style={{
              width: '30%',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              maxHeight: 'calc(100vh - 200px)',
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
              <h3 style={{ margin: 0, color: 'var(--accentB)', fontSize: '1.1rem' }}>Export Badge CSV</h3>
              <button className="btn btn-small" onClick={handleCloseBadgePanel} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Close ✕</button>
            </div>

            <div className="field">
              <label className="label">Weekend</label>
              <div style={{ fontWeight: 600 }}>{weekendIdentifier}</div>
            </div>
            <div className="field">
              <label className="label">Community</label>
              <div style={{ fontWeight: 600 }}>{badgeCommunity}</div>
            </div>

            <div className="field">
              <label className="label">Export Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="exportType" 
                    value="team" 
                    checked={badgeExportType === 'team'} 
                    onChange={(e) => setBadgeExportType(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Team Only ({teamRoster.length})</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="exportType" 
                    value="candidates" 
                    checked={badgeExportType === 'candidates'} 
                    onChange={(e) => setBadgeExportType(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Candidates Only ({candidates.length})</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="exportType" 
                    value="both" 
                    checked={badgeExportType === 'both'} 
                    onChange={(e) => setBadgeExportType(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Team + Candidates ({teamRoster.length + candidates.length})</span>
                </label>
              </div>
            </div>

            <div className="field">
              <label className="label">Scripture Verse</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g., John 3:16" 
                value={badgeScripture} 
                onChange={(e) => setBadgeScripture(e.target.value)} 
              />
            </div>
            <div className="field">
              <label className="label">Weekend Theme</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g., Stand Firm" 
                value={badgeTheme} 
                onChange={(e) => setBadgeTheme(e.target.value)} 
              />
            </div>

            <div className="field">
              <label className="label">Professor Positions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="profPosition" 
                    value="show" 
                    checked={badgeProfPosition === 'show'} 
                    onChange={(e) => setBadgeProfPosition(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Show Position (Silent, Ideals, etc.)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="profPosition" 
                    value="blank" 
                    checked={badgeProfPosition === 'blank'} 
                    onChange={(e) => setBadgeProfPosition(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Leave Blank</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="profPosition" 
                    value="table-leader" 
                    checked={badgeProfPosition === 'table-leader'} 
                    onChange={(e) => setBadgeProfPosition(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Show "Table Leader"</span>
                </label>
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
              maxWidth: '800px',
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
              <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '4px' }}>Member:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>{changingMember.name}</div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>Current Role:</div>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 700, 
                    color: 'var(--accentB)',
                    padding: '8px 12px',
                    backgroundColor: 'var(--panel-header)',
                    borderRadius: '6px',
                    border: '2px solid var(--accentB)'
                  }}>
                    {changingMember.currentRole}
                  </div>
                </div>

                <div>
                  <label className="label" style={{ display: 'block', marginBottom: '12px' }}>Select New Role:</label>
                  
                  {/* All roles in one unified grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {/* Leadership */}
                    {['Rector', 'BUR', 'Rover', 'Head', 'Asst Head', 'Head Spiritual Director', 'Spiritual Director'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Professor Team */}
                    {[
                      { value: 'Prof_Silent', label: 'Silent' },
                      { value: 'Prof_Ideals', label: 'Ideals' },
                      { value: 'Prof_Church', label: 'Church' },
                      { value: 'Prof_Piety', label: 'Piety' },
                      { value: 'Prof_Study', label: 'Study' },
                      { value: 'Prof_Action', label: 'Action' },
                      { value: 'Prof_Leaders', label: 'Leaders' },
                      { value: 'Prof_Environments', label: 'Environments' },
                      { value: 'Prof_CCIA', label: 'CCIA' },
                      { value: 'Prof_Reunion', label: 'Reunion' }
                    ].map(role => (
                      <button
                        key={role.value}
                        onClick={() => setNewRole(role.value)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role.value ? 'var(--accentB)' : 'transparent',
                          color: newRole === role.value ? 'white' : 'var(--ink)',
                          border: newRole === role.value ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role.label}
                      </button>
                    ))}
                    
                    {/* Kitchen Team */}
                    {['Head Kitchen', 'Asst Head Kitchen', 'Kitchen'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Prayer Team */}
                    {['Head Prayer', 'Prayer'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Table Team */}
                    {['Head Table', 'Table'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Chapel Team */}
                    {['Head Chapel', 'Chapel'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Dorm Team */}
                    {['Head Dorm', 'Dorm'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Palanca Team */}
                    {['Head Palanca', 'Palanca'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Gopher Team */}
                    {['Head Gopher', 'Gopher'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Storeroom Team */}
                    {['Head Storeroom', 'Storeroom'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Floater Supply Team */}
                    {['Head Floater Supply', 'Floater Supply'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Worship Team */}
                    {['Head Worship', 'Worship'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                    
                    {/* Media Team */}
                    {['Head Media', 'Media'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewRole(role)}
                        className="btn btn-small"
                        style={{
                          padding: '10px 13px',
                          fontSize: '0.8rem',
                          backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                          color: newRole === role ? 'white' : 'var(--ink)',
                          border: newRole === role ? 'none' : '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
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
                Update Database for {weekendIdentifier}?
              </h3>
              {false && (
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
                    backgroundColor: '#28a745',
                    color: 'white',
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
        
        /* Two-column table layout */
        #team-list-app .table {
          margin-bottom: 0;
          vertical-align: top;
        }
        
        #team-list-app .table td,
        #team-list-app .table th {
          height: 44px;
          min-height: 44px;
          max-height: 44px;
          vertical-align: middle;
        }
        
        #team-list-app .table tbody tr {
          height: 44px;
          min-height: 44px;
          max-height: 44px;
        }
        
        #team-list-app .table tbody tr.expanded-row {
          height: auto;
          min-height: auto;
          max-height: none;
        }
        
        #team-list-app .table tbody tr.expanded-row td {
          height: auto;
          min-height: auto;
          max-height: none;
          padding-top: 0;
          padding-bottom: 12px;
        }
        
        #team-list-app .table td {
          font-size: 0.85rem;
        }
        
        /* Expandable row animations */
        #team-list-app tr.expanded-row {
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
        
        /* Remove animation for table rows */
        #team-list-app tr.removing {
          animation: fadeOut 0.3s ease-in-out forwards;
        }
        
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }
        
        /* Badge Export Panel - Compact styling to match team list */
        #badge-export-panel .field {
          margin-bottom: 14px;
        }
        
        #badge-export-panel .label {
          font-size: 0.8rem;
          margin-bottom: 4px;
        }
        
        #badge-export-panel .field > div {
          font-size: 0.85rem;
        }
        
        #badge-export-panel input.input {
          font-size: 0.85rem;
          padding: 8px 10px;
        }
        
        #badge-export-panel label span {
          font-size: 13px;
          font-weight: 400;
          color: #333;
        }
        
        #badge-export-panel h3 {
          font-size: 1rem !important;
        }

        /* Tour Styles */
        .tour-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 9998;
        }

        .tour-spotlight {
          position: fixed;
          border: 3px solid var(--accentB);
          border-radius: 8px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .tour-tooltip {
          position: fixed;
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          max-width: 320px;
          z-index: 10000;
          animation: tourFadeIn 0.3s ease;
        }

        @keyframes tourFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .tour-tooltip h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--accentB);
        }

        .tour-tooltip p {
          margin: 0 0 16px 0;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--ink);
        }

        .tour-tooltip-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tour-progress {
          font-size: 0.8rem;
          color: var(--muted);
        }

        .help-button {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--accentB);
          color: white;
          border: none;
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          transition: all 0.2s ease;
        }

        .help-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* Help Button */}
      <button className="help-button" onClick={startTour} title="Start Tour">
        ?
      </button>

      {/* Tour Overlay */}
      {showTour && (() => {
        const currentStep = tourSteps[tourStep];
        const targetElement = document.getElementById(currentStep.target);
        
        if (!targetElement) return null;
        
        const rect = targetElement.getBoundingClientRect();
        const spotlightStyle = {
          top: `${rect.top - 4}px`,
          left: `${rect.left - 4}px`,
          width: `${rect.width + 8}px`,
          height: `${rect.height + 8}px`
        };

        // Position tooltip
        let tooltipStyle = {
          top: currentStep.position === 'bottom' ? `${rect.bottom + 16}px` : 
               currentStep.position === 'top' ? `${rect.top - 200}px` :
               `${rect.top}px`,
          left: currentStep.position === 'left' ? `${rect.left - 340}px` :
                currentStep.position === 'right' ? `${rect.right + 16}px` :
                `${rect.left}px`
        };

        return (
          <>
            <div className="tour-overlay" onClick={closeTour} />
            <div className="tour-spotlight" style={spotlightStyle} />
            <div className="tour-tooltip" style={tooltipStyle}>
              <h3>{currentStep.title}</h3>
              <p>{currentStep.content}</p>
              <div className="tour-tooltip-footer">
                <span className="tour-progress">
                  {tourStep + 1} of {tourSteps.length}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-small" onClick={closeTour}>
                    Skip
                  </button>
                  <button className="btn btn-small btn-primary" onClick={nextTourStep}>
                    {tourStep < tourSteps.length - 1 ? 'Next' : 'Done'}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </section>

  );
}