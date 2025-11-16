// src/components/common/CloseOutWeekend.jsx
import { useState, useEffect } from 'react';
import { HiCheckCircle, HiXCircle, HiCheckBadge } from 'react-icons/hi2';
import { supabase } from '../../services/supabase';

export default function CloseOutWeekend({ isOpen, onClose, weekendNumber, orgId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [deletionCounts, setDeletionCounts] = useState({
    meetings: 0,
    applications: 0,
    emailLists: 0,
    rosterRecords: 0
  });
  const [stats, setStats] = useState({
    teamMembersUpdated: 0,
    pescadoresAdded: 0,
    meetingsCleared: 0,
    applicationsCleared: 0,
    rectorsPromoted: 0
  });
  
  // NEW: Store Rover info before rosters get cleared
  const [savedRoverInfo, setSavedRoverInfo] = useState({
    men: null,
    women: null
  });

  // Define all steps (now 7 steps!)
  const steps = [
    {
      id: 1,
      title: 'Update Team Service Records',
      description: 'Incrementing service counts for all team members'
    },
    {
      id: 2,
      title: 'Convert Pescadores to Team Members',
      description: 'Adding new pescadores to the main directory'
    },
    {
      id: 3,
      title: 'Archive Weekend Data',
      description: 'Saving weekend statistics to permanent history'
    },
    {
      id: 4,
      title: 'Clear Meeting Check-In Data',
      description: 'Removing meeting attendance records for this weekend'
    },
    {
      id: 5,
      title: 'Clear Candidate Applications',
      description: 'Removing candidate registration forms for this weekend'
    },
    {
      id: 6,
      title: 'Clear Team Roster Data',
      description: 'Removing team assignment records for this weekend'
    },
    {
      id: 7,
      title: 'Prepare Next Weekend',
      description: 'Promoting Rovers to Rectors for the next weekend'
    }
  ];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setStepStatuses({});
      setIsComplete(false);
      setHasStarted(false);
      setSavedRoverInfo({ men: null, women: null });
      setStats({
        teamMembersUpdated: 0,
        pescadoresAdded: 0,
        meetingsCleared: 0,
        applicationsCleared: 0,
        rectorsPromoted: 0
      });
    }
  }, [isOpen]);

  // NEW: Function to save Rover info before starting
  async function saveRoverInfoBeforeStart() {
    try {
      // Get men's Rover
      const { data: menRover, error: menError } = await supabase
        .from('men_team_rosters')
        .select('pescadore_key, weekend_identifier')
        .eq('org_id', orgId)
        .eq('role', 'Rover')
        .maybeSingle();

      if (menError && menError.code !== 'PGRST116') {
        console.error('Error fetching men\'s Rover:', menError);
      }

      // Get women's Rover
      const { data: womenRover, error: womenError } = await supabase
        .from('women_team_rosters')
        .select('pescadore_key, weekend_identifier')
        .eq('org_id', orgId)
        .eq('role', 'Rover')
        .maybeSingle();

      if (womenError && womenError.code !== 'PGRST116') {
        console.error('Error fetching women\'s Rover:', womenError);
      }

      setSavedRoverInfo({
        men: menRover,
        women: womenRover
      });

      console.log('Saved Rover info:', { men: menRover, women: womenRover });

    } catch (error) {
      console.error('Error saving Rover info:', error);
    }
  }

  // Validate and execute each step with real database queries
  async function executeStepWithValidation(stepId, weekendNumber) {
    try {
      let result = { success: true, count: 0, skipped: false };

      switch (stepId) {
        case 1: {
          // Step 1: Update team service records
          
          // 1. Get community code from app_settings
          const { data: settings, error: settingsError } = await supabase
            .from('app_settings')
            .select('community_code')
            .eq('org_id', orgId)
            .single();

          if (settingsError) throw new Error('Unable to access app settings');
          
          const communityCode = settings?.community_code || 'UNK';
          const newServiceCode = `${communityCode}${weekendNumber}`;

          // 2. Get all team members from both rosters
          const { data: menRoster, error: menError } = await supabase
            .from('men_team_rosters')
            .select('pescadore_key, role')
            .eq('org_id', orgId);
          
          const { data: womenRoster, error: womenError } = await supabase
            .from('women_team_rosters')
            .select('pescadore_key, role')
            .eq('org_id', orgId);

          if (menError || womenError) throw new Error('Unable to access team roster data');

          const allRosterEntries = [
            ...(menRoster || []).map(r => ({ ...r, gender: 'men' })),
            ...(womenRoster || []).map(r => ({ ...r, gender: 'women' }))
          ];

          if (allRosterEntries.length === 0) {
            result.skipped = true;
            result.message = 'No team members found - skipping this step';
            break;
          }

          // 3. Update each team member's service record
          let updateCount = 0;
          for (const entry of allRosterEntries) {
            const tableName = entry.gender === 'men' ? 'men_raw' : 'women_raw';
            const role = entry.role;

            // Calculate column names
            const statusCol = role;
            const serviceCol = `${role} Service`;
            const qtyCol = `${role.replace(/ /g, '_')}_Service_Qty`;

            // Fetch current record
            const { data: person, error: fetchError } = await supabase
              .from(tableName)
              .select(`PescadoreKey, "${statusCol}", "${serviceCol}", "${qtyCol}"`)
              .eq('PescadoreKey', entry.pescadore_key)
              .eq('org_id', orgId)
              .single();

            if (fetchError || !person) {
              console.warn(`Person not found: ${entry.pescadore_key} in ${tableName}`);
              continue;
            }

            // Calculate new status (N→I, I→E, E→E)
            const currentStatus = person[statusCol] || 'N';
            let newStatus;
            if (currentStatus === 'N') newStatus = 'I';
            else if (currentStatus === 'I') newStatus = 'E';
            else newStatus = 'E';

            // Calculate new qty
            const currentQty = person[qtyCol];
            const newQty = currentQty ? String(parseInt(currentQty) + 1) : '1';

            // Update the record
            const updateData = {
              [statusCol]: newStatus,
              [serviceCol]: newServiceCode,
              [qtyCol]: newQty
            };

            const { error: updateError } = await supabase
              .from(tableName)
              .update(updateData)
              .eq('PescadoreKey', entry.pescadore_key)
              .eq('org_id', orgId);

            if (updateError) {
              console.error(`Failed to update ${entry.pescadore_key}:`, updateError);
            } else {
              updateCount++;
            }
          }

          result.count = updateCount;
          result.message = `Updated service records for ${updateCount} team members`;
          break;
        }

        case 2: {
          // Step 2: Convert Pescadores to Team Members
          
          // 1. Get community code
          const { data: settings, error: settingsError } = await supabase
            .from('app_settings')
            .select('community_code')
            .eq('org_id', orgId)
            .single();

          if (settingsError) throw new Error('Unable to access app settings');
          
          const communityCode = settings?.community_code || 'UNK';
          const currentWeekendCode = `${communityCode}${weekendNumber}`;

          // 2. Get all candidate applications where attendance = 'yes'
          const { data: applications, error: appsError } = await supabase
            .from('cra_applications')
            .select('*')
            .eq('org_id', orgId)
            .eq('attendance', 'yes');

          if (appsError) throw new Error('Unable to access candidate applications');

          if (!applications || applications.length === 0) {
            result.skipped = true;
            result.message = 'No pescadores found - skipping this step';
            break;
          }

          // 3. Get current max PescadoreKey
          const { data: menMax } = await supabase
            .from('men_raw')
            .select('PescadoreKey')
            .order('PescadoreKey', { ascending: false })
            .limit(1)
            .single();

          const { data: womenMax } = await supabase
            .from('women_raw')
            .select('PescadoreKey')
            .order('PescadoreKey', { ascending: false })
            .limit(1)
            .single();

          let nextKey = Math.max(
            menMax?.PescadoreKey || 0,
            womenMax?.PescadoreKey || 0
          ) + 1;

          // 4. Insert each candidate
          let addedCount = 0;
          for (const app of applications) {
            const tableName = app.gender === 'men' ? 'men_raw' : 'women_raw';
            const isMale = app.gender === 'men';

            const newPescadore = {
              PescadoreKey: nextKey,
              LastServiceKey: '0',
              Last: app.c_lastname,
              First: isMale ? app.m_first : app.f_first,
              Preferred: isMale ? app.m_pref : app.f_pref,
              Church: app.c_church,
              Phone1: isMale ? app.m_cell : app.f_cell,
              Phone2: null,
              Email: isMale ? app.m_email : app.f_email,
              Address: app.c_address,
              City: app.c_city,
              State: app.c_state,
              Zip: app.c_zip,
              'Candidate Weekend': currentWeekendCode,
              'Last weekend worked': null,
              
              // All roles = 'N'
              Rector: 'N',
              BUR: 'N',
              Rover: 'N',
              Head: 'N',
              'Asst Head': 'N',
              'Head Spiritual Director': 'N',
              'Spiritual Director': 'N',
              'Head Prayer': 'N',
              Prayer: 'N',
              'Head Kitchen': 'N',
              'Asst Head Kitchen': 'N',
              Kitchen: 'N',
              'Head Table': 'N',
              Table: 'N',
              'Head Chapel': 'N',
              Chapel: 'N',
              'Head Dorm': 'N',
              Dorm: 'N',
              'Head Palanca': 'N',
              Palanca: 'N',
              'Head Gopher': 'N',
              Gopher: 'N',
              'Head Storeroom': 'N',
              Storeroom: 'N',
              'Head Floater Supply': 'N',
              'Floater Supply': 'N',
              'Head Worship': 'N',
              Worship: 'N',
              Media: 'N',
              'Head Media': 'N',
              Prof_Silent: 'N',
              Prof_Ideals: 'N',
              Prof_Church: 'N',
              Prof_Piety: 'N',
              Prof_Study: 'N',
              Prof_Action: 'N',
              Prof_Leaders: 'N',
              Prof_Environments: 'N',
              Prof_CCIA: 'N',
              Prof_Reunion: 'N',
              
              org_id: orgId
            };

            const { error: insertError } = await supabase
              .from(tableName)
              .insert(newPescadore);

            if (insertError) {
              console.error(`Failed to add pescadore ${app.c_lastname}:`, insertError);
            } else {
              addedCount++;
              nextKey++;
            }
          }

          result.count = addedCount;
          result.message = `Added ${addedCount} pescadores to directory`;
          break;
        }

        case 3: {
          // Step 3: Archive Weekend Data
          
          const genders = ['men', 'women'];
          let archivedCount = 0;

          for (const gender of genders) {
            const rosterTable = gender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
            const weekendIdentifier = gender === 'men' 
              ? `Men's Weekend ${weekendNumber}` 
              : `Women's Weekend ${weekendNumber}`;

            // Count team members
            const { data: rosterData, error: rosterError } = await supabase
              .from(rosterTable)
              .select('pescadore_key, role', { count: 'exact' })
              .eq('org_id', orgId);

            if (rosterError) throw new Error(`Unable to access ${gender} team roster`);

            const teamMemberCount = rosterData?.length || 0;

            // Count candidates
            const { count: candidateCount, error: candidateError } = await supabase
              .from('cra_applications')
              .select('*', { count: 'exact', head: true })
              .eq('org_id', orgId)
              .eq('gender', gender)
              .eq('attendance', 'yes');

            if (candidateError) throw new Error(`Unable to count ${gender} candidates`);

            // Find Rector
            const rector = rosterData?.find(r => r.role === 'Rector');
            const rectorKey = rector ? String(rector.pescadore_key) : null;

            // Check if record exists
            const { data: existing, error: existingError } = await supabase
              .from('weekend_history')
              .select('id')
              .eq('org_id', orgId)
              .eq('weekend_number', weekendNumber)
              .eq('gender', gender)
              .maybeSingle();

            if (existingError) throw new Error(`Unable to check ${gender} weekend history`);

            if (existing) {
              // UPDATE
              const { error: updateError } = await supabase
                .from('weekend_history')
                .update({
                  team_member_count: teamMemberCount,
                  candidate_count: candidateCount || 0,
                  rector_pescadore_key: rectorKey
                })
                .eq('id', existing.id);

              if (updateError) {
                console.error(`Failed to update ${gender} weekend history:`, updateError);
              } else {
                archivedCount++;
              }
            } else {
              // INSERT
              const { error: insertError } = await supabase
                .from('weekend_history')
                .insert({
                  org_id: orgId,
                  weekend_identifier: weekendIdentifier,
                  weekend_number: weekendNumber,
                  gender: gender,
                  team_member_count: teamMemberCount,
                  candidate_count: candidateCount || 0,
                  rector_pescadore_key: rectorKey,
                  theme: null,
                  verse: null,
                  image: null,
                  start_date: null,
                  end_date: null,
                  theme_song: null
                });

              if (insertError) {
                console.error(`Failed to insert ${gender} weekend history:`, insertError);
              } else {
                archivedCount++;
              }
            }
          }

          result.count = archivedCount;
          result.message = archivedCount === 2 
            ? 'Weekend statistics saved for both men and women'
            : `Weekend statistics saved for ${archivedCount} gender(s)`;
          break;
        }

        case 4: {
          // Step 4: Clear Meeting Check-In Data
          const { data: deletedMeetings, error: meetingError } = await supabase
            .from('mci_checkin_data')
            .delete()
            .eq('org_id', orgId)
            .select();

          if (meetingError) throw new Error('Unable to clear meeting attendance data');

          const count = deletedMeetings?.length || 0;
          
          if (count === 0) {
            result.skipped = true;
            result.message = 'No meeting attendance records found - skipping this step';
          } else {
            result.count = count;
            result.message = `Cleared ${count} meeting attendance records`;
          }
          break;
        }

        case 5: {
          // Step 5: Clear Candidate Applications AND Email Lists
          
          // Delete applications
          const { data: deletedApps, error: appError } = await supabase
            .from('cra_applications')
            .delete()
            .eq('org_id', orgId)
            .select();

          if (appError) throw new Error('Unable to clear candidate applications');

          // Delete email lists
          const { data: deletedEmails, error: emailError } = await supabase
            .from('cra_email_lists')
            .delete()
            .eq('org_id', orgId)
            .select();

          if (emailError) throw new Error('Unable to clear email distribution lists');

          const appCount = deletedApps?.length || 0;
          const emailCount = deletedEmails?.length || 0;
          const totalCount = appCount + emailCount;

          if (totalCount === 0) {
            result.skipped = true;
            result.message = 'No candidate applications or email lists found - skipping this step';
          } else {
            result.count = totalCount;
            result.message = `Cleared ${appCount} applications and ${emailCount} email lists`;
          }
          break;
        }

        case 6: {
          // Step 6: Clear Team Rosters
          
          // Delete men's roster
          const { data: deletedMen, error: menError } = await supabase
            .from('men_team_rosters')
            .delete()
            .eq('org_id', orgId)
            .select();

          if (menError) throw new Error('Unable to clear men\'s team roster');

          // Delete women's roster
          const { data: deletedWomen, error: womenError } = await supabase
            .from('women_team_rosters')
            .delete()
            .eq('org_id', orgId)
            .select();

          if (womenError) throw new Error('Unable to clear women\'s team roster');

          const totalCount = (deletedMen?.length || 0) + (deletedWomen?.length || 0);

          if (totalCount === 0) {
            result.skipped = true;
            result.message = 'No team roster records found - skipping this step';
          } else {
            result.count = totalCount;
            result.message = `Cleared ${totalCount} team roster records`;
          }
          break;
        }

        case 7: {
          // Step 7: Prepare Next Weekend - Promote Rovers to Rectors
          
          const nextWeekendNumber = weekendNumber + 1;
          let promotedCount = 0;

          // Process Men's Team
          if (savedRoverInfo.men && savedRoverInfo.men.pescadore_key) {
            const newWeekendIdentifier = `Men's Weekend ${nextWeekendNumber}`;

            const { error: insertError } = await supabase
              .from('men_team_rosters')
              .insert({
                org_id: orgId,
                weekend_identifier: newWeekendIdentifier,
                pescadore_key: savedRoverInfo.men.pescadore_key,
                role: 'Rector'
              });

            if (insertError) {
              console.error('Failed to insert men\'s Rector:', insertError);
            } else {
              promotedCount++;
            }
          }

          // Process Women's Team
          if (savedRoverInfo.women && savedRoverInfo.women.pescadore_key) {
            const newWeekendIdentifier = `Women's Weekend ${nextWeekendNumber}`;

            const { error: insertError } = await supabase
              .from('women_team_rosters')
              .insert({
                org_id: orgId,
                weekend_identifier: newWeekendIdentifier,
                pescadore_key: savedRoverInfo.women.pescadore_key,
                role: 'Rector'
              });

            if (insertError) {
              console.error('Failed to insert women\'s Rector:', insertError);
            } else {
              promotedCount++;
            }
          }

          if (promotedCount === 0) {
            result.skipped = true;
            result.message = 'No Rovers found - skipping next weekend setup';
          } else {
            result.count = promotedCount;
            result.message = promotedCount === 2
              ? `Prepared Weekend #${nextWeekendNumber} with new Rectors for both teams`
              : `Prepared Weekend #${nextWeekendNumber} with new Rector for ${promotedCount} team(s)`;
          }
          break;
        }
      }

      return result;

    } catch (error) {
      console.error(`Error in step ${stepId}:`, error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Fetch counts of what will be deleted and show warning
  async function showDeletionWarning() {
    try {
      // Count meeting check-ins
      const { count: meetingCount } = await supabase
        .from('mci_checkin_data')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      // Count candidate applications
      const { count: appCount } = await supabase
        .from('cra_applications')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      // Count email lists
      const { count: emailCount } = await supabase
        .from('cra_email_lists')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      // Count roster records
      const { count: menCount } = await supabase
        .from('men_team_rosters')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      const { count: womenCount } = await supabase
        .from('women_team_rosters')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      setDeletionCounts({
        meetings: meetingCount || 0,
        applications: appCount || 0,
        emailLists: emailCount || 0,
        rosterRecords: (menCount || 0) + (womenCount || 0)
      });

      // SAVE ROVER INFO BEFORE SHOWING WARNING
      await saveRoverInfoBeforeStart();

      setShowWarning(true);
    } catch (error) {
      console.error('Error fetching deletion counts:', error);
      window.showMainStatus?.('Unable to fetch deletion counts', true);
    }
  }

  // Execute all steps in sequence
  async function executeSteps() {
    setHasStarted(true);

    if (!weekendNumber) {
      window.showMainStatus?.('No weekend number provided', true);
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(step.id);
      
      // Mark as processing
      setStepStatuses(prev => ({ ...prev, [step.id]: 'processing' }));

      // Delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      // Execute
      const result = await executeStepWithValidation(step.id, weekendNumber);

      // Update stats
      if (result.count > 0) {
        if (step.id === 1) {
          setStats(prev => ({ ...prev, teamMembersUpdated: result.count }));
        } else if (step.id === 2) {
          setStats(prev => ({ ...prev, pescadoresAdded: result.count }));
        } else if (step.id === 4) {
          setStats(prev => ({ ...prev, meetingsCleared: result.count }));
        } else if (step.id === 5) {
          setStats(prev => ({ ...prev, applicationsCleared: result.count }));
        } else if (step.id === 7) {
          setStats(prev => ({ ...prev, rectorsPromoted: result.count }));
        }
      }

      // Mark as complete/skipped/error
      if (!result.success) {
        setStepStatuses(prev => ({ 
          ...prev, 
          [step.id]: { status: 'error', error: result.error }
        }));
        return;
      } else if (result.skipped) {
        setStepStatuses(prev => ({ 
          ...prev, 
          [step.id]: { status: 'skipped', message: result.message }
        }));
      } else {
        setStepStatuses(prev => ({ 
          ...prev, 
          [step.id]: { status: 'complete', message: result.message }
        }));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // All done!
    setIsComplete(true);
    triggerConfetti();
  }

  // Confetti effect
  function triggerConfetti() {
    const colors = ['#2ea44f', '#00a3ff', '#ffc107', '#dc3545'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        document.querySelector('.closeout-modal-overlay')?.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3000);
      }, i * 30);
    }
  }

  // Get step status
  function getStepStatus(stepId) {
    if (!hasStarted) return 'waiting';
    if (stepStatuses[stepId]) {
      return typeof stepStatuses[stepId] === 'string' 
        ? stepStatuses[stepId] 
        : stepStatuses[stepId].status;
    }
    return 'waiting';
  }

  // Get step message
  function getStepMessage(stepId) {
    const stepData = stepStatuses[stepId];
    if (typeof stepData === 'object') {
      return stepData.message || stepData.error;
    }
    return null;
  }

  // Calculate progress
  const completedSteps = Object.keys(stepStatuses).filter(key => {
    const status = stepStatuses[key];
    if (typeof status === 'string') {
      return status === 'complete' || status === 'skipped';
    } else if (typeof status === 'object') {
      return status.status === 'complete' || status.status === 'skipped';
    }
    return false;
  }).length;
  
  const progressPercent = (completedSteps / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="closeout-modal-overlay">
      <div className="closeout-modal">
        {/* Header */}
        <div className="closeout-modal-header" style={{ background: 'var(--accentA)' }}>
          <h2 className="closeout-modal-title">Close Out Weekend #{weekendNumber}</h2>
          <p className="closeout-modal-subtitle">
            {isComplete 
              ? 'Weekend successfully closed!' 
              : hasStarted 
                ? 'Processing steps...' 
                : 'This will finalize and archive all weekend data'}
          </p>
          
          {/* Progress Bar */}
          <div className="closeout-progress-bar-container">
            <div 
              className="closeout-progress-bar" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="closeout-modal-body">
          {showWarning ? (
            // Warning Screen
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    color: '#ffc107',
                    strokeWidth: '2px'
                  }}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" 
                  />
                </svg>
              </div>

              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#000'
              }}>
                Confirm Weekend Close Out
              </h3>

              <p style={{
                fontSize: '0.9rem',
                color: '#666',
                marginBottom: '20px',
                lineHeight: '1.4'
              }}>
                This will archive the weekend and clear data for the next cycle
              </p>

              {/* Positive Actions */}
              <div style={{
                background: '#d4edda',
                border: '1px solid #28a745',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                textAlign: 'left',
                width: '100%',
                maxWidth: '480px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#28a745' }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span style={{ fontWeight: 700, color: '#155724', fontSize: '0.95rem' }}>Weekend will be archived</span>
                </div>
                <div style={{ paddingLeft: '28px', color: '#155724', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  • Update service records for team<br/>
                  • Convert pescadores to members<br/>
                  • Save statistics to history<br/>
                  • Prepare next weekend with new Rectors
                </div>
              </div>

              {/* Deletions Warning */}
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left',
                width: '100%',
                maxWidth: '480px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#dc3545' }}>
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span style={{ fontWeight: 700, color: '#856404', fontSize: '0.95rem' }}>Data to be permanently deleted:</span>
                </div>
                <div style={{ paddingLeft: '28px', fontSize: '0.85rem', color: '#856404' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Meeting check-ins:</span>
                    <strong>{deletionCounts.meetings}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Candidate applications:</span>
                    <strong>{deletionCounts.applications}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Email lists:</span>
                    <strong>{deletionCounts.emailLists}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Team roster records:</span>
                    <strong>{deletionCounts.rosterRecords}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  className="btn"
                  onClick={() => setShowWarning(false)}
                  style={{ minWidth: '120px' }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    setShowWarning(false);
                    executeSteps();
                  }}
                  style={{ minWidth: '120px' }}
                >
                  Yes, Proceed
                </button>
              </div>
            </div>
          ) : !isComplete ? (
            <div className="closeout-steps">
              {steps.map(step => {
                const status = getStepStatus(step.id);
                const message = getStepMessage(step.id);
                const stepData = stepStatuses[step.id];
                const hasError = status === 'error';

                return (
                  <div key={step.id} className={`closeout-step ${status}`}>
                    <div className="closeout-step-icon">
                      {status === 'waiting' && step.id}
                      {status === 'processing' && '⟳'}
                      {status === 'complete' && <HiCheckCircle size={24} />}
                      {status === 'skipped' && <HiCheckCircle size={24} />}
                      {status === 'error' && <HiXCircle size={24} />}
                    </div>
                    <div className="closeout-step-content">
                      <div className="closeout-step-title">{step.title}</div>
                      <div className="closeout-step-description">
                        {(status === 'waiting' || status === 'processing') && step.description}
                        {(status === 'complete' || status === 'skipped') && message}
                      </div>
                      {hasError && (
                        <div className="closeout-step-error">
                          ⚠️ Error: {stepData?.error || 'An unexpected error occurred'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Success Message
            <div className="closeout-success-message">
              <div className="closeout-success-icon" style={{ color: 'var(--accentA)' }}>
                <HiCheckBadge size={80} />
              </div>
              <h3 className="closeout-success-title">Weekend #{weekendNumber} Successfully Closed!</h3>
              <p className="closeout-success-details">
                All data has been archived and tables have been cleared.<br />
                Weekend #{weekendNumber + 1} is ready to go with new Rectors!
              </p>
              
              <div className="closeout-success-stats">
                <div className="closeout-stat">
                  <div className="closeout-stat-value">{stats.teamMembersUpdated}</div>
                  <div className="closeout-stat-label">Team Members Updated</div>
                </div>
                <div className="closeout-stat">
                  <div className="closeout-stat-value">{stats.pescadoresAdded}</div>
                  <div className="closeout-stat-label">Pescadores Added</div>
                </div>
                <div className="closeout-stat">
                  <div className="closeout-stat-value">{stats.rectorsPromoted}</div>
                  <div className="closeout-stat-label">Rectors Promoted</div>
                </div>
                <div className="closeout-stat">
                  <div className="closeout-stat-value">{stats.meetingsCleared}</div>
                  <div className="closeout-stat-label">Meeting Records Cleared</div>
                </div>
                <div className="closeout-stat">
                  <div className="closeout-stat-value">{stats.applicationsCleared}</div>
                  <div className="closeout-stat-label">Applications Cleared</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="closeout-modal-footer">
          {!hasStarted && !showWarning && (
            <>
              <button 
                className="btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={showDeletionWarning}
              >
                Start Close Out
              </button>
            </>
          )}
          
          {hasStarted && !isComplete && (
            <button 
              className="btn"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              Processing...
            </button>
          )}

          {isComplete && (
            <button 
              className="btn btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}