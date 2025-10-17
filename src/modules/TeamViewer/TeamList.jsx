// src/modules/TeamViewer/TeamList.jsx
// COMPLETE FILE - Abort signals removed, cleanup simplified
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

  // ✅ FIXED: Removed AbortController and isMounted - just load data when ready
  useEffect(() => {
    if (!pescadoresLoading && orgId && allPescadores[currentGender]?.length > 0) {
      console.log('TeamList: Loading latest team for', currentGender);
      loadLatestTeam();
    }
  }, [currentGender, pescadoresLoading, orgId, allPescadores]);

  // ✅ FIXED: No abort signals, no isMounted checks
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

  // ✅ FIXED: No abort signals, no isMounted checks
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

  const renderRectorSection = () => {
    const rector = teamRoster.find(m => m.role === 'Rector');
    
    return (
      <div className="rector-section">
        <div className="rector-title">RECTOR</div>
        <div id="rectorContainer">
          {rector ? (
            <div 
              className={`rector-badge ${removingId === rector.id ? 'removing' : ''}`}
              onClick={() => !removingId && handleRemoveTeammate(rector.id, 'Rector')}
              style={{ cursor: removingId === rector.id ? 'not-allowed' : 'pointer' }}
            >
              <span className="rector-name">{rector.name}</span>
              <span className="remove-rector-btn">Remove ×</span>
            </div>
          ) : (
            <div style={{ color: '#6c757d', fontStyle: 'italic', padding: '8px 16px' }}>
              (No Rector Assigned)
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeadershipSection = () => {
    const leadershipRoles = ['Head', 'Asst Head', 'BUR', 'Head Spiritual Director', 'Spiritual Director'];
    const leadershipMembers = teamRoster.filter(m => leadershipRoles.includes(m.role));
    const totalMembers = leadershipMembers.length;

    const headSpiritualDirector = teamRoster.find(m => m.role === 'Head Spiritual Director');
    const regularSDs = teamRoster.filter(m => m.role === 'Spiritual Director').slice(0, 2);

    return (
      <div className="unified-team-section">
        <div className="unified-team-header">
          <span>Leadership Team</span>
          {totalMembers > 0 && <span className="team-header-count-badge">{totalMembers}</span>}
        </div>
        <div className="unified-team-members" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ borderRight: '1px solid #f0f0f0' }}>
            {['Head', 'Asst Head', 'BUR'].map(roleKey => {
              const person = teamRoster.find(m => m.role === roleKey);
              return (
                <div key={roleKey} className={`unified-member-item ${removingId === person?.id ? 'removing' : ''}`}>
                  <div className="single-role-name">{roleKey}:</div>
                  <div className="single-role-assigned">
                    {person ? (
                      <>
                        <span className="unified-member-name">{person.name}</span>
                        <button 
                          className="remove-teammate-btn"
                          onClick={() => handleRemoveTeammate(person.id, roleKey)}
                          disabled={removingId === person.id}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span style={{ color: '#6c757d', fontStyle: 'italic' }}></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <div className={`unified-member-item ${removingId === headSpiritualDirector?.id ? 'removing' : ''}`}>
              <div className="single-role-name">Spiritual Director:</div>
              <div className="single-role-assigned">
                {headSpiritualDirector ? (
                  <>
                    <span className="unified-member-name">
                      {headSpiritualDirector.name} <span className="member-role-label head">HEAD</span>
                    </span>
                    <button 
                      className="remove-teammate-btn"
                      onClick={() => handleRemoveTeammate(headSpiritualDirector.id, 'Head Spiritual Director')}
                      disabled={removingId === headSpiritualDirector.id}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span style={{ color: '#6c757d', fontStyle: 'italic' }}></span>
                )}
              </div>
            </div>

            {[0, 1].map(i => {
              const person = regularSDs[i];
              return (
                <div key={i} className={`unified-member-item ${removingId === person?.id ? 'removing' : ''}`}>
                  <div className="single-role-name">Spiritual Director:</div>
                  <div className="single-role-assigned">
                    {person ? (
                      <>
                        <span className="unified-member-name">{person.name}</span>
                        <button 
                          className="remove-teammate-btn"
                          onClick={() => handleRemoveTeammate(person.id, 'Spiritual Director')}
                          disabled={removingId === person.id}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span style={{ color: '#6c757d', fontStyle: 'italic' }}></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderProfessorSection = () => {
    const professorRoles = ROLE_CONFIG.professor.map(r => r.key);
    const professorMembers = teamRoster.filter(m => professorRoles.includes(m.role));
    const totalMembers = professorMembers.length;

    return (
      <div className="unified-team-section">
        <div className="unified-team-header">
          <span>Professor Team</span>
          {totalMembers > 0 && <span className="team-header-count-badge">{totalMembers}</span>}
        </div>
        <div className="unified-team-members two-column">
          {ROLE_CONFIG.professor.map(role => {
            const person = teamRoster.find(m => m.role === role.key);
            const displayName = role.name.replace('Professor - ', '');
            
            return (
              <div key={role.key} className={`unified-member-item ${removingId === person?.id ? 'removing' : ''}`}>
                <div className="single-role-name">{displayName}:</div>
                <div className="single-role-assigned">
                  {person ? (
                    <>
                      <span className="unified-member-name">{person.name}</span>
                      <button 
                        className="remove-teammate-btn"
                        onClick={() => handleRemoveTeammate(person.id, role.key)}
                        disabled={removingId === person.id}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span style={{ color: '#6c757d', fontStyle: 'italic' }}></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUnifiedTeamSection = (group) => {
    const headMembers = teamRoster.filter(m => m.role === group.head);
    const assistantMembers = group.assistantHead ? teamRoster.filter(m => m.role === group.assistantHead) : [];
    const teamMembers = teamRoster.filter(m => m.role === group.team);
    const totalMembers = headMembers.length + assistantMembers.length + teamMembers.length;

    return (
      <div key={group.title} className="unified-team-section">
        <div className="unified-team-header">
          <span>{group.title}</span>
          {totalMembers > 0 && <span className="team-header-count-badge">{totalMembers}</span>}
        </div>
        <div className="unified-team-members two-column">
          {headMembers.map(person => (
            <div 
              key={person.id} 
              className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
            >
              <div className="single-role-assigned">
                <span className="unified-member-name">{person.name}</span>
                <span className="member-role-label head">HEAD</span>
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

          {group.assistantHead && assistantMembers.map(person => (
            <div 
              key={person.id} 
              className={`unified-member-item ${removingId === person.id ? 'removing' : ''}`}
            >
              <div className="single-role-assigned">
                <span className="unified-member-name">{person.name}</span>
                <span className="member-role-label asst-head">ASST HEAD</span>
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
            <button className="btn btn-warning" onClick={() => console.log('Print Report')}>
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
      </div>
    </section>
  );
}