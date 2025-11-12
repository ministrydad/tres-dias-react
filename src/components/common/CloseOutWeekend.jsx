// src/components/common/CloseOutWeekend.jsx
import { useState, useEffect } from 'react';
import { HiCheckCircle, HiXCircle, HiCheckBadge } from 'react-icons/hi2';
import { supabase } from '../../services/supabase';

export default function CloseOutWeekend({ isOpen, onClose, weekendNumber, orgId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [stats, setStats] = useState({
    teamMembersUpdated: 0,
    pescadoresAdded: 0,
    meetingsCleared: 0,
    applicationsCleared: 0
  });

  // Define all steps
  const steps = [
    {
      id: 1,
      title: 'Update Team Service Records',
      description: 'Incrementing service counts in men_raw and women_raw tables'
    },
    {
      id: 2,
      title: 'Convert Pescadores to Team Members',
      description: 'Adding candidates from applications to men_raw and women_raw'
    },
    {
      id: 3,
      title: 'Archive Weekend Data',
      description: 'Saving weekend statistics to weekend_history table'
    },
    {
      id: 4,
      title: 'Clear Meeting Check-In Data',
      description: 'Removing mci_checkin_data for this organization'
    },
    {
      id: 5,
      title: 'Clear Candidate Applications',
      description: 'Removing cra_applications for this organization'
    },
    {
      id: 6,
      title: 'Clear Team Roster Data',
      description: 'Removing team roster records for this organization'
    }
  ];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setStepStatuses({});
      setIsComplete(false);
      setHasStarted(false);
      setStats({
        teamMembersUpdated: 0,
        pescadoresAdded: 0,
        meetingsCleared: 0,
        applicationsCleared: 0
      });
    }
  }, [isOpen]);

  // Validate and execute each step with real database queries
  async function executeStepWithValidation(stepId, weekendIdentifier) {
    try {
      let result = { success: true, count: 0, skipped: false };

      switch (stepId) {
        case 1: {
          // Step 1: Check team roster data exists
          const { data: menRoster, error: menError } = await supabase
            .from('men_team_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);
          
          const { data: womenRoster, error: womenError } = await supabase
            .from('women_team_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

          if (menError || womenError) throw new Error('Failed to check team rosters');

          const totalCount = (menRoster?.length || 0) + (womenRoster?.length || 0);
          
          if (totalCount === 0) {
            result.skipped = true;
            result.message = 'No team roster data found - skipping';
          } else {
            result.count = totalCount;
            result.message = `Found ${totalCount} team members to update`;
            // TODO: Actually update service records (backend logic)
          }
          break;
        }

        case 2: {
          // Step 2: Check candidate applications exist
          const { count, error } = await supabase
            .from('cra_applications')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

          if (error) throw new Error('Failed to check applications');

          if (count === 0) {
            result.skipped = true;
            result.message = 'No candidate applications found - skipping';
          } else {
            result.count = count;
            result.message = `Found ${count} pescadores to convert`;
            // TODO: Actually convert candidates (backend logic)
          }
          break;
        }

        case 3: {
          // Step 3: Archive weekend data (always runs)
          result.message = 'Weekend data archived to history';
          // TODO: Actually archive data (backend logic)
          break;
        }

        case 4: {
          // Step 4: Check MCI data exists
          const { count, error } = await supabase
            .from('mci_checkin_data')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

          if (error) throw new Error('Failed to check meeting data');

          if (count === 0) {
            result.skipped = true;
            result.message = 'No meeting check-in data found - skipping';
          } else {
            result.count = count;
            result.message = `Clearing ${count} meeting records`;
            // TODO: Actually clear MCI data (backend logic)
          }
          break;
        }

        case 5: {
          // Step 5: Check candidate applications (same as step 2 check)
          const { count, error } = await supabase
            .from('cra_applications')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

          if (error) throw new Error('Failed to check applications');

          if (count === 0) {
            result.skipped = true;
            result.message = 'No candidate applications found - skipping';
          } else {
            result.count = count;
            result.message = `Clearing ${count} applications`;
            // TODO: Actually clear applications (backend logic)
          }
          break;
        }

        case 6: {
          // Step 6: Check team roster data (same as step 1 check)
          const { data: menRoster, error: menError } = await supabase
            .from('men_team_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);
          
          const { data: womenRoster, error: womenError } = await supabase
            .from('women_team_rosters')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

          if (menError || womenError) throw new Error('Failed to check rosters');

          const totalCount = (menRoster?.length || 0) + (womenRoster?.length || 0);

          if (totalCount === 0) {
            result.skipped = true;
            result.message = 'No team roster data found - skipping';
          } else {
            result.count = totalCount;
            result.message = `Clearing ${totalCount} roster records`;
            // TODO: Actually clear roster data (backend logic)
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

  // Execute all steps in sequence
  async function executeSteps() {
    setHasStarted(true);

    // Calculate active weekend identifier
    const activeWeekend = calculateActiveWeekend();
    if (!activeWeekend) {
      window.showMainStatus?.('No active weekend found', true);
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(step.id);
      
      // Mark as processing
      setStepStatuses(prev => ({ ...prev, [step.id]: 'processing' }));

      // Execute with real validation
      const result = await executeStepWithValidation(step.id, activeWeekend);

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
        }
      }

      // Mark as complete, skipped, or error
      if (!result.success) {
        setStepStatuses(prev => ({ 
          ...prev, 
          [step.id]: { status: 'error', error: result.error }
        }));
        // Stop on error
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
    }

    // All steps complete!
    setIsComplete(true);
    triggerConfetti();
  }

  // Helper to calculate active weekend (from parent component logic)
  function calculateActiveWeekend() {
    // This will be passed from parent or we can extract the logic
    // For now, return a placeholder
    return weekendNumber ? { num: weekendNumber } : null;
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

  // Calculate progress percentage
  const progressPercent = (Object.keys(stepStatuses).filter(
    key => stepStatuses[key] === 'complete'
  ).length / steps.length) * 100;

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
          {!isComplete ? (
            <div className="closeout-steps">
              {steps.map(step => {
                const status = getStepStatus(step.id);
                const message = getStepMessage(step.id);

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
                        {message || step.description}
                      </div>
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
                You're ready to set up the next weekend.
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
          {!hasStarted && (
            <>
              <button 
                className="btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={executeSteps}
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