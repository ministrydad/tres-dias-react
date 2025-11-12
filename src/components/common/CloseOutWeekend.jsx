// src/components/common/CloseOutWeekend.jsx
import { useState, useEffect } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi2';

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

  // Simulate step execution (UI ONLY - no backend)
  async function simulateStep(stepId) {
    // Simulate processing time (1-2 seconds per step)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Simulate success (95% success rate for demo purposes)
    const success = Math.random() > 0.05;

    if (success) {
      // Simulate some stats
      if (stepId === 1) {
        setStats(prev => ({ ...prev, teamMembersUpdated: Math.floor(Math.random() * 20) + 20 }));
      } else if (stepId === 2) {
        setStats(prev => ({ ...prev, pescadoresAdded: Math.floor(Math.random() * 10) + 10 }));
      } else if (stepId === 4) {
        setStats(prev => ({ ...prev, meetingsCleared: Math.floor(Math.random() * 50) + 100 }));
      } else if (stepId === 5) {
        setStats(prev => ({ ...prev, applicationsCleared: Math.floor(Math.random() * 15) + 15 }));
      }
      return { success: true };
    } else {
      return { success: false, error: 'Simulated error for testing' };
    }
  }

  // Execute all steps in sequence
  async function executeSteps() {
    setHasStarted(true);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(step.id);
      
      // Mark as processing
      setStepStatuses(prev => ({ ...prev, [step.id]: 'processing' }));

      // Simulate the step
      const result = await simulateStep(step.id);

      // Mark as complete or error
      if (result.success) {
        setStepStatuses(prev => ({ ...prev, [step.id]: 'complete' }));
      } else {
        setStepStatuses(prev => ({ 
          ...prev, 
          [step.id]: { status: 'error', error: result.error }
        }));
        // Stop on error
        return;
      }
    }

    // All steps complete!
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

  // Calculate progress percentage
  const progressPercent = (Object.keys(stepStatuses).filter(
    key => stepStatuses[key] === 'complete'
  ).length / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="closeout-modal-overlay">
      <div className="closeout-modal">
        {/* Header */}
        <div className="closeout-modal-header">
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
                const stepData = stepStatuses[step.id];
                const error = typeof stepData === 'object' ? stepData.error : null;

                return (
                  <div key={step.id} className={`closeout-step ${status}`}>
                    <div className="closeout-step-icon">
                      {status === 'waiting' && step.id}
                      {status === 'processing' && '⟳'}
                      {status === 'complete' && <HiCheckCircle size={24} />}
                      {status === 'error' && <HiXCircle size={24} />}
                    </div>
                    <div className="closeout-step-content">
                      <div className="closeout-step-title">{step.title}</div>
                      <div className="closeout-step-description">{step.description}</div>
                      {error && <div className="closeout-step-error">Error: {error}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Success Message
            <div className="closeout-success-message">
              <div className="closeout-success-icon">🎉</div>
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