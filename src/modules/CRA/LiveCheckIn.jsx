// src/modules/CRA/LiveCheckIn.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function LiveCheckIn() {
  const { orgId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('men');
  const [currentMode, setCurrentMode] = useState('tablet');
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [flaggedCards, setFlaggedCards] = useState(new Set());
  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => {
    if (orgId) {
      loadApplications();
    }
  }, [orgId]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cra_applications')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    setFlippedCards(new Set());
    setFlaggedCards(new Set());
  };

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    setFlippedCards(new Set());
    setFlaggedCards(new Set());
  };

  const toggleCardFlip = (appId) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  const createParticles = (container) => {
    if (!container) return;
    const count = 40;
    const colors = ['#ffffff', '#a7f3d0', '#6ee7b7', '#34d399'];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const angle = Math.random() * 360;
      const distance = 100 + Math.random() * 90;
      const size = 5 + Math.random() * 6;

      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      particle.style.setProperty('--x-start', '0px');
      particle.style.setProperty('--y-start', '0px');
      particle.style.setProperty('--x-end', `${Math.cos(angle * (Math.PI / 180)) * distance}px`);
      particle.style.setProperty('--y-end', `${Math.sin(angle * (Math.PI / 180)) * distance}px`);
      
      container.appendChild(particle);
    }
  };

  const approveCheckin = async (appId, rowElement) => {
    try {
      // Disable buttons
      rowElement.querySelectorAll('button').forEach(b => b.disabled = true);
      
      // Flip card back if it's flipped
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(appId);
        return newSet;
      });

      // Wait for flip animation
      setTimeout(async () => {
        const cardFront = rowElement.querySelector('.flip-card-front');
        if (!cardFront) return;

        // Sweep animation
        cardFront.classList.add('is-sweeping');

        setTimeout(() => {
          cardFront.classList.remove('is-sweeping');
          cardFront.classList.add('is-exploding', 'is-approved');
          const particlesContainer = cardFront.querySelector('.particles');
          if (particlesContainer) {
            createParticles(particlesContainer);
          }
        }, 600);

        // Make row disappear
        setTimeout(() => {
          rowElement.classList.add('is-disappearing');
        }, 2100);

        // Update database and reload
        setTimeout(async () => {
          const { error } = await supabase
            .from('cra_applications')
            .update({ is_checked_in: true })
            .eq('id', appId)
            .eq('org_id', orgId);

          if (error) {
            console.error('Check-in error:', error);
            alert(`Error: ${error.message}`);
            rowElement.querySelectorAll('button').forEach(b => b.disabled = false);
            rowElement.classList.remove('is-disappearing');
            cardFront.classList.remove('is-exploding', 'is-approved', 'is-sweeping');
          } else {
            await loadApplications();
          }
        }, 3100);
      }, 200);
    } catch (error) {
      console.error('Error checking in candidate:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEdit = (appId) => {
    console.log('Edit application:', appId);
    alert('Edit functionality will navigate to the New Application form.');
  };

  const handleNeedsEdit = (appId) => {
    // Flag the card as needing edit
    setFlaggedCards(prev => {
      const newSet = new Set(prev);
      newSet.add(appId);
      return newSet;
    });
    
    // Unflip the card
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(appId);
      return newSet;
    });
  };

  const enterPresentationMode = () => {
    setPresentationMode(true);
    document.querySelector('.app-container')?.classList.add('presentation-mode');
  };

  const exitPresentationMode = () => {
    setPresentationMode(false);
    document.querySelector('.app-container')?.classList.remove('presentation-mode');
  };

  const awaitingCheckin = applications.filter(app => {
    const hasPerson = (currentFilter === 'men' && app.m_first) || (currentFilter === 'women' && app.f_first);
    return hasPerson && !app.is_checked_in;
  });

  const getCandidateName = (app) => {
    if (currentFilter === 'men') {
      const firstName = app.m_pref || app.m_first;
      const coupleName = app.f_first ? `with ${app.f_pref || app.f_first}` : '';
      return { mainName: `${firstName} ${app.c_lastname}`, coupleName };
    } else {
      const firstName = app.f_pref || app.f_first;
      const coupleName = app.m_first ? `with ${app.m_pref || app.m_first}` : '';
      return { mainName: `${firstName} ${app.c_lastname}`, coupleName };
    }
  };

  const getFullCandidateName = (app) => {
    const p = currentFilter === 'men' ? 'm_' : 'f_';
    return `${app[p+'first']} ${app[p+'pref'] ? `(${app[p+'pref']}) ` : ''}${app.c_lastname}`;
  };

  const getCandidateInfo = (app) => {
    const p = currentFilter === 'men' ? 'm_' : 'f_';
    return {
      name: `${app[p+'pref'] || app[p+'first']} ${app.c_lastname}`,
      address: `${app.c_address || ''}<br>${app.c_city || ''}, ${app.c_state || ''} ${app.c_zip || ''}`,
      contact: `Cell: ${app[p+'cell'] || 'N/A'}<br>Email: ${app[p+'email'] || 'N/A'}`,
      emergency: app[p+'emerg'] || 'N/A',
      emergencyPhone: app[p+'emergphone'] || 'N/A'
    };
  };

  return (
    <>
      <div id="cra-checkin" className="cra-view" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card pad" id="cra-checkin-controls">
          <div style={{ maxWidth: '300px' }}>
            <label className="label">Filter by Gender</label>
            <div className="toggle" id="craCheckinFilter">
              <div 
                className={`opt ${currentFilter === 'men' ? 'active' : ''}`}
                onClick={() => handleFilterChange('men')}
              >
                Men
              </div>
              <div 
                className={`opt ${currentFilter === 'women' ? 'active' : ''}`}
                onClick={() => handleFilterChange('women')}
              >
                Women
              </div>
            </div>
          </div>
          <div>
            <label className="label">Check-In Mode</label>
            <div className="toggle" id="checkinModeToggle">
              <div 
                className={`opt ${currentMode === 'tablet' ? 'active' : ''}`}
                onClick={() => handleModeChange('tablet')}
              >
                Tablet Mode
              </div>
              <div 
                className={`opt ${currentMode === 'team' ? 'active' : ''}`}
                onClick={() => handleModeChange('team')}
              >
                Team Mode
              </div>
            </div>
          </div>
          <button 
            id="enterPresentationModeBtn" 
            className="btn btn-info"
            onClick={enterPresentationMode}
          >
            Enter Full-Screen Check-In
          </button>
        </div>

        {currentMode === 'tablet' && (
          <div id="checkin-tablet-mode">
            {awaitingCheckin.length > 0 && (
              <div className="checkin-welcome-header">
                <h2 className="checkin-title">Welcome</h2>
                <p className="checkin-subtitle">
                  Please find your name below to begin check-in.
                </p>
              </div>
            )}

            <div id="checkin-card-grid">
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
                  Loading check-in list...
                </div>
              ) : awaitingCheckin.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
                  All {currentFilter} candidates have been checked in.
                </div>
              ) : (
                awaitingCheckin.map(app => {
                  const { mainName, coupleName } = getCandidateName(app);
                  const info = getCandidateInfo(app);
                  const isFlipped = flippedCards.has(app.id);
                  const isFlagged = flaggedCards.has(app.id);

                  return (
                    <div 
                      key={app.id}
                      className={`checkin-row ${isFlipped ? 'is-flipped' : ''} ${isFlagged ? 'is-flagged-for-edit' : ''}`}
                      data-id={app.id}
                      ref={(el) => {
                        if (el) el._appId = app.id;
                      }}
                    >
                      <div className="flip-card">
                        <div className="flip-card-inner">
                          <div 
                            className="flip-card-front"
                            onClick={() => toggleCardFlip(app.id)}
                          >
                            <div className="particles"></div>
                            <div className="card-content-original">
                              <div className="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                                </svg>
                              </div>
                              <div className="text-content">
                                <div className="name">{mainName}</div>
                                {coupleName && <div className="couple-name">{coupleName}</div>}
                              </div>
                            </div>
                            <div className="card-content-success">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ marginBottom: '8px' }}>
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                              </svg>
                              <span>Checked In!</span>
                            </div>
                            <div className="card-content-flagged">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ marginBottom: '8px' }}>
                                <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
                              </svg>
                              <span>Needs Edit</span>
                            </div>
                          </div>

                          <div className="flip-card-back">
                            <div className="verification-body">
                              <div className="verification-item" style={{ gridColumn: '1 / -1' }}>
                                <div className="value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                  {info.name}
                                </div>
                              </div>
                              <div className="verification-item">
                                <div className="value" dangerouslySetInnerHTML={{ __html: info.address }} />
                              </div>
                              <div className="verification-item">
                                <div className="value" dangerouslySetInnerHTML={{ __html: info.contact }} />
                              </div>
                            </div>
                            
                            <div className="emergency-contact-section">
                              <div className="emergency-contact-label">Emergency Contact</div>
                              <div className="verification-item">
                                <div className="value">{info.emergency}</div>
                              </div>
                              <div className="verification-item">
                                <div className="value">{info.emergencyPhone}</div>
                              </div>
                            </div>
                            
                            {/* Close Button */}
                            <button
                              onClick={() => toggleCardFlip(app.id)}
                              style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: '2px solid var(--border)',
                                background: 'var(--panel)',
                                color: 'var(--ink)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                zIndex: 10
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--accentD)';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.borderColor = 'var(--accentD)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--panel)';
                                e.currentTarget.style.color = 'var(--ink)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="checkin-actions">
                        <button 
                          className="btn btn-approve"
                          onClick={(e) => {
                            const row = e.target.closest('.checkin-row');
                            if (row) approveCheckin(app.id, row);
                          }}
                        >
                          Approve
                        </button>
                        <button 
                          className="btn btn-deny"
                          onClick={() => handleNeedsEdit(app.id)}
                        >
                          Needs Edit
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {currentMode === 'team' && (
          <div id="checkin-team-mode" className="card pad">
            <div className="section-title">Team Management View</div>
            <p style={{ color: 'var(--muted)', marginTop: '-10px', marginBottom: '20px' }}>
              This view allows direct editing of candidate data.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Sponsor</th>
                  <th>Emergency Contact</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                      Loading check-in list...
                    </td>
                  </tr>
                ) : awaitingCheckin.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                      No {currentFilter} candidates are awaiting check-in.
                    </td>
                  </tr>
                ) : (
                  awaitingCheckin.map(app => {
                    const p = currentFilter === 'men' ? 'm_' : 'f_';
                    return (
                      <tr key={app.id}>
                        <td><strong>{getFullCandidateName(app)}</strong></td>
                        <td dangerouslySetInnerHTML={{
                          __html: `${app[p+'cell'] || 'N/A'}<br>${app[p+'email'] || 'N/A'}`
                        }} />
                        <td>{app.s_first || ''} {app.s_last || ''}</td>
                        <td dangerouslySetInnerHTML={{
                          __html: `${app[p+'emerg'] || 'N/A'}<br>${app[p+'emergphone'] || 'N/A'}`
                        }} />
                        <td>
                          <button 
                            className="btn btn-small"
                            onClick={() => handleEdit(app.id)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {presentationMode && (
        <button 
          id="exitPresentationModeBtn" 
          className="btn btn-danger"
          onClick={exitPresentationMode}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      )}
    </>
  );
}