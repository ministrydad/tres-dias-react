// src/modules/TeamViewer/TeamList.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function TeamList() {
  const { user, orgId } = useAuth();
  const [currentGender, setCurrentGender] = useState('men');
  const [weekendIdentifier, setWeekendIdentifier] = useState('');
  const [teamRoster, setTeamRoster] = useState([]);
  const [loading, setLoading] = useState(true); // Initial load only
  const [allPescadores, setAllPescadores] = useState({ men: [], women: [] });
  const [dataLoaded, setDataLoaded] = useState(false);

  // Role configuration matching original exactly
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

  // Load all pescadores data on mount (like fetchDataFromSupabase in original)
  useEffect(() => {
    if (orgId) {
      console.log('TeamList: Fetching pescadores data for orgId:', orgId);
      fetchAllPescadores();
    }
  }, [orgId]);

  // Load latest team when data is ready AND on gender changes
  useEffect(() => {
    console.log('TeamList: dataLoaded =', dataLoaded, 'orgId =', orgId, 'men count =', allPescadores.men.length);
    if (dataLoaded && orgId && allPescadores[currentGender].length > 0) {
      console.log('TeamList: Loading latest team for', currentGender);
      loadLatestTeam();
    }
  }, [currentGender, dataLoaded, orgId, allPescadores]);

  const fetchAllPescadores = async () => {
    setLoading(true); // Show loading on initial data fetch
    try {
      console.log('TeamList: Fetching men_raw and women_raw from Supabase...');
      const { data: menData, error: menError } = await supabase
        .from('men_raw')
        .select('*')
        .eq('org_id', orgId);
      
      if (menError) throw menError;

      const { data: womenData, error: womenError } = await supabase
        .from('women_raw')
        .select('*')
        .eq('org_id', orgId);
      
      if (womenError) throw womenError;

      console.log('TeamList: Fetched', menData?.length || 0, 'men and', womenData?.length || 0, 'women');
      setAllPescadores({ men: menData || [], women: womenData || [] });
      setDataLoaded(true); // Mark data as loaded
    } catch (error) {
      console.error('TeamList: Error fetching pescadores:', error);
      setDataLoaded(true); // Still mark as loaded to show empty state
    } finally {
      setLoading(false); // Hide initial loading state
    }
  };

  const loadLatestTeam = async () => {
    // REMOVED: setLoading(true) - Keep structure visible during gender toggle
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    
    console.log('TeamList: loadLatestTeam for', currentGender, 'from table', rosterTable);
    
    try {
      // Find the latest team identifier
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
      }
    } catch (error) {
      console.error('TeamList: Error loading latest team:', error);
      setTeamRoster([]);
    }
    // REMOVED: finally { setLoading(false) }
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
    }
  };

  const handleGenderToggle = (gender) => {
    setCurrentGender(gender);
  };

  const handleRemoveTeammate = async (personId, role) => {
    if (!window.confirm(`Remove this member from ${role}?`)) return;

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

      // Reload roster
      await loadTeamRoster(weekendIdentifier);
    } catch (error) {
      console.error('Error removing teammate:', error);
      alert(`Failed to remove teammate: ${error.message}`);
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
              className="rector-badge"
              onClick={() => handleRemoveTeammate(rector.id, 'Rector')}
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
          {/* Column 1: Secular Leadership */}
          <div style={{ borderRight: '1px solid #f0f0f0' }}>
            {['Head', 'Asst Head', 'BUR'].map(roleKey => {
              const person = teamRoster.find(m => m.role === roleKey);
              return (
                <div key={roleKey} className="unified-member-item">
                  <div className="single-role-name">{roleKey}:</div>
                  <div className="single-role-assigned">
                    {person ? (
                      <>
                        <span className="unified-member-name">{person.name}</span>
                        <button 
                          className="remove-teammate-btn"
                          onClick={() => handleRemoveTeammate(person.id, roleKey)}
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

          {/* Column 2: Spiritual Leadership */}
          <div>
            {/* Head Spiritual Director */}
            <div className="unified-member-item">
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
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span style={{ color: '#6c757d', fontStyle: 'italic' }}></span>
                )}
              </div>
            </div>

            {/* Regular Spiritual Directors (up to 2) */}
            {[0, 1].map(i => {
              const person = regularSDs[i];
              return (
                <div key={i} className="unified-member-item">
                  <div className="single-role-name">Spiritual Director:</div>
                  <div className="single-role-assigned">
                    {person ? (
                      <>
                        <span className="unified-member-name">{person.name}</span>
                        <button 
                          className="remove-teammate-btn"
                          onClick={() => handleRemoveTeammate(person.id, 'Spiritual Director')}
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
              <div key={role.key} className="unified-member-item">
                <div className="single-role-name">{displayName}:</div>
                <div className="single-role-assigned">
                  {person ? (
                    <>
                      <span className="unified-member-name">{person.name}</span>
                      <button 
                        className="remove-teammate-btn"
                        onClick={() => handleRemoveTeammate(person.id, role.key)}
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
        <div className="unified-team-members">
          {/* Head */}
          {headMembers.map(person => (
            <div key={person.id} className="unified-member-item">
              <div className="single-role-assigned">
                <span className="member-role-label head">HEAD</span>
                <span className="unified-member-name">{person.name}</span>
                <button 
                  className="remove-teammate-btn"
                  onClick={() => handleRemoveTeammate(person.id, group.head)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Assistant Head */}
          {group.assistantHead && assistantMembers.map(person => (
            <div key={person.id} className="unified-member-item">
              <div className="single-role-assigned">
                <span className="member-role-label asst-head">ASST HEAD</span>
                <span className="unified-member-name">{person.name}</span>
                <button 
                  className="remove-teammate-btn"
                  onClick={() => handleRemoveTeammate(person.id, group.assistantHead)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Team Members */}
          {teamMembers.map(person => (
            <div key={person.id} className="unified-member-item">
              <div className="single-role-assigned">
                <span className="unified-member-name">{person.name}</span>
                <button 
                  className="remove-teammate-btn"
                  onClick={() => handleRemoveTeammate(person.id, group.team)}
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
            {loading ? (
              <div className="progress-bar-container">
                <div className="progress-bar-label">Loading Roster...</div>
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