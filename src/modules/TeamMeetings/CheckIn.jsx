// src/modules/TeamMeetings/CheckIn.jsx
// ============================================================
// REFACTORED: React State Management + Working Save
// ============================================================
// ✅ Issue #3: Converted DOM manipulation to React state
// ✅ Issue #1: Implemented Supabase save functionality
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function CheckIn() {
  const { orgId } = useAuth();
  const [currentGender, setCurrentGender] = useState('men');
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [memberDetails, setMemberDetails] = useState({});
  const [checkinData, setCheckinData] = useState({});
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCheckinData, setSavedCheckinData] = useState({}); // Track saved state
  const [pendingMemberId, setPendingMemberId] = useState(null); // For modal
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [expandedPaymentType, setExpandedPaymentType] = useState(''); // 'cash', 'check', 'sponsorship', or ''
  const [paymentAmount, setPaymentAmount] = useState('');

  // CONFIG constants
  const WEEKEND_FEE = 265;
  const TEAM_FEE = 30;
  const MEETING_COUNT = 6;
  const feeExemptRoles = ['Rector', 'Head Spiritual Director', 'Spiritual Director'];

  useEffect(() => {
    // Auto-load men's team on mount
    handleGenderToggle('men');
  }, [orgId]);

  const handleGenderToggle = async (gender) => {
    setCurrentGender(gender);
    setSelectedMemberId(null);
    await loadLatestTeamByGender(gender);
  };

  const loadLatestTeamByGender = async (gender) => {
    setLoading(true);
    const rosterTable = gender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    
    try {
      const { data: teams, error } = await supabase
        .from(rosterTable)
        .select('weekend_identifier')
        .eq('org_id', orgId);
      
      if (error) throw error;

      const prefix = gender.charAt(0).toUpperCase() + gender.slice(1) + "'s ";
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

      if (latest.identifier) {
        await importTeam(latest.identifier);
      } else {
        clearTeamView();
        window.showMainStatus(`No ${gender}'s team found. Create one in Team List first.`, true);
      }
    } catch (error) {
      console.error('Error loading latest team:', error);
      window.showMainStatus(`Error loading team: ${error.message}`, true);
      clearTeamView();
    } finally {
      setLoading(false);
    }
  };

  const importTeam = async (teamId) => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    const rawTable = currentGender === 'men' ? 'men_raw' : 'women_raw';
    
    try {
      // Load team roster
      const { data: roster, error: rosterError } = await supabase
        .from(rosterTable)
        .select('*')
        .eq('weekend_identifier', teamId)
        .eq('org_id', orgId);
      
      if (rosterError) throw rosterError;

      // Get all unique pescadore_keys from roster
      const keys = [...new Set(roster.map(r => r.pescadore_key))];

      // Load pescadore profiles
      const { data: profiles, error: profilesError } = await supabase
        .from(rawTable)
        .select('PescadoreKey, First, Last, Email')
        .in('PescadoreKey', keys)
        .eq('org_id', orgId);
      
      if (profilesError) throw profilesError;

      // Build a map for faster lookup
      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[String(p.PescadoreKey)] = p;
        return acc;
      }, {});

      // Build member details
      const details = {};
      (roster || []).forEach(r => {
        const prof = profileMap[String(r.pescadore_key)];
        const name = prof ? `${prof.First || ''} ${prof.Last || ''}`.trim() : 'Unknown Member';
        const role = (r.role || '').replace('Prof_', '');
        details[String(r.pescadore_key)] = {
          name,
          role,
          email: prof ? prof.Email : ''
        };
      });

      // Load saved checkin data
      const { data: saved, error: loadErr } = await supabase
        .from('mci_checkin_data')
        .select('member_id, checkin_details')
        .eq('team_id', teamId)
        .eq('org_id', orgId);

      if (loadErr) console.warn('Checkin load error:', loadErr);

      // Build checkins object
      const checkins = {};
      Object.keys(details).forEach(id => {
        const row = (saved || []).find(x => String(x.member_id) === String(id));
        const savedData = row?.checkin_details || {};
        
        // Normalize weekendFee to always be an array
        let weekendFee = savedData.weekendFee || [];
        if (!Array.isArray(weekendFee)) {
          if (weekendFee.amount) {
            weekendFee = [{ method: 'cash', amount: weekendFee.amount }];
          } else {
            weekendFee = [];
          }
        }
        
        checkins[id] = {
          attendance: savedData.attendance || {},
          weekendFee: weekendFee,
          teamFee: savedData.teamFee || {},
          palancaLetter: savedData.palancaLetter || false
        };
      });

      setCurrentTeamId(teamId);
      setMemberDetails(details);
      setCheckinData(checkins);
      setSavedCheckinData(JSON.parse(JSON.stringify(checkins))); // Deep clone for comparison
      window.showMainStatus(`Loaded ${teamId} - ${Object.keys(details).length} members`, false);
    } catch (error) {
      console.error('Failed to import team:', error);
      window.showMainStatus(`Error importing team: ${error.message}`, true);
      clearTeamView();
    }
  };

  const clearTeamView = () => {
    setMemberDetails({});
    setCheckinData({});
    setSelectedMemberId(null);
    setCurrentTeamId(null);
  };

  // ===== STATE UPDATE HANDLERS =====
  
  const toggleAttendance = (memberId, meetingNum) => {
    setCheckinData(prev => {
      const newData = { ...prev };
      if (!newData[memberId]) newData[memberId] = { attendance: {}, weekendFee: [], teamFee: {}, palancaLetter: false };
      if (!newData[memberId].attendance) newData[memberId].attendance = {};
      
      const cur = newData[memberId].attendance[meetingNum];
      if (cur === false || cur === undefined) newData[memberId].attendance[meetingNum] = true;
      else if (cur === true) newData[memberId].attendance[meetingNum] = 'zoom';
      else newData[memberId].attendance[meetingNum] = false;
      
      return newData;
    });
  };

  const toggleTeamFee = (memberId) => {
    setCheckinData(prev => {
      const newData = { ...prev };
      if (!newData[memberId]) newData[memberId] = { attendance: {}, weekendFee: [], teamFee: {}, palancaLetter: false };
      if (!newData[memberId].teamFee) newData[memberId].teamFee = {};
      
      newData[memberId].teamFee.paid = !newData[memberId].teamFee.paid;
      newData[memberId].teamFee.amount = newData[memberId].teamFee.paid ? TEAM_FEE : 0;
      
      return newData;
    });
  };

  const togglePalanca = (memberId) => {
    setCheckinData(prev => {
      const newData = { ...prev };
      if (!newData[memberId]) newData[memberId] = { attendance: {}, weekendFee: [], teamFee: {}, palancaLetter: false };
      newData[memberId].palancaLetter = !newData[memberId].palancaLetter;
      return newData;
    });
  };

  const toggleOnlinePayment = (memberId) => {
    setCheckinData(prev => {
      const newData = { ...prev };
      if (!newData[memberId]) newData[memberId] = { attendance: {}, weekendFee: [], teamFee: {}, palancaLetter: false };
      
      const isAlreadyOnline = newData[memberId].weekendFee && 
                              newData[memberId].weekendFee.length > 0 && 
                              newData[memberId].weekendFee[0].method === 'online';
      
      if (isAlreadyOnline) {
        newData[memberId].weekendFee = [];
      } else {
        newData[memberId].weekendFee = [{ method: 'online', amount: WEEKEND_FEE }];
      }
      
      return newData;
    });
  };

  const removePayment = (memberId, paymentIndex) => {
    setCheckinData(prev => {
      const newData = { ...prev };
      if (newData[memberId] && newData[memberId].weekendFee) {
        newData[memberId].weekendFee = newData[memberId].weekendFee.filter((_, i) => i !== paymentIndex);
      }
      return newData;
    });
  };

  // ===== CHECK FOR UNSAVED CHANGES =====
  
  const hasUnsavedChanges = (memberId) => {
    if (!memberId) return false;
    const current = JSON.stringify(checkinData[memberId] || {});
    const saved = JSON.stringify(savedCheckinData[memberId] || {});
    return current !== saved;
  };

  // ===== SAVE SINGLE MEMBER TO SUPABASE =====
  
  const handleSaveMember = async (memberId) => {
    if (!currentTeamId || !memberId) {
      window.showMainStatus('No member selected to save', true);
      return;
    }

    setSaving(true);
    
    try {
      const record = {
        team_id: currentTeamId,
        member_id: memberId,
        checkin_details: checkinData[memberId] || {},
        org_id: orgId
      };

      // Upsert single record
      const { error } = await supabase
        .from('mci_checkin_data')
        .upsert([record], {
          onConflict: 'team_id,member_id,org_id'
        });

      if (error) throw error;

      // Update saved state to match current state
      setSavedCheckinData(prev => ({
        ...prev,
        [memberId]: JSON.parse(JSON.stringify(checkinData[memberId] || {}))
      }));

      const memberName = memberDetails[memberId]?.name || 'Member';
      window.showMainStatus(`Saved check-in data for ${memberName}`, false);
    } catch (error) {
      console.error('Save error:', error);
      window.showMainStatus(`Error saving: ${error.message}`, true);
    } finally {
      setSaving(false);
    }
  };

  // ===== HANDLE MEMBER SELECTION WITH UNSAVED CHECK =====
  
  const handleSelectMember = (memberId) => {
    // Check if current member has unsaved changes
    if (selectedMemberId && hasUnsavedChanges(selectedMemberId)) {
      setPendingMemberId(memberId);
      setShowUnsavedModal(true);
    } else {
      setSelectedMemberId(memberId);
    }
  };

  const handleDiscardChanges = () => {
    if (selectedMemberId) {
      // Revert to saved state
      setCheckinData(prev => ({
        ...prev,
        [selectedMemberId]: JSON.parse(JSON.stringify(savedCheckinData[selectedMemberId] || {}))
      }));
    }
    setSelectedMemberId(pendingMemberId);
    setPendingMemberId(null);
    setShowUnsavedModal(false);
  };

  const handleSaveAndSwitch = async () => {
    if (selectedMemberId) {
      await handleSaveMember(selectedMemberId);
    }
    setSelectedMemberId(pendingMemberId);
    setPendingMemberId(null);
    setShowUnsavedModal(false);
  };

  const handleCancelSwitch = () => {
    setPendingMemberId(null);
    setShowUnsavedModal(false);
  };

  // ===== PAYMENT EXPANSION HANDLERS =====

  const togglePaymentExpansion = (method) => {
    if (expandedPaymentType === method) {
      // Collapse if clicking same button
      setExpandedPaymentType('');
      setPaymentAmount('');
    } else {
      // Expand new payment type
      setExpandedPaymentType(method);
      setPaymentAmount('');
    }
  };

  const addPayment = (amount) => {
    if (!selectedMemberId || !expandedPaymentType) return;

    if (!amount || amount <= 0) {
      window.showMainStatus('Please enter a valid amount', true);
      return;
    }

    setCheckinData(prev => {
      const newData = { ...prev };
      if (!newData[selectedMemberId]) {
        newData[selectedMemberId] = { attendance: {}, weekendFee: [], teamFee: {}, palancaLetter: false };
      }
      if (!newData[selectedMemberId].weekendFee) {
        newData[selectedMemberId].weekendFee = [];
      }

      // Add new payment
      newData[selectedMemberId].weekendFee.push({
        method: expandedPaymentType,
        amount: amount
      });

      return newData;
    });

    // Collapse after adding
    setExpandedPaymentType('');
    setPaymentAmount('');
  };

  // ===== RENDER HELPERS =====

  const getStatusForMember = (memberId) => {
    const member = memberDetails[memberId];
    const chk = checkinData[memberId] || {};
    
    const isFeeWaived = feeExemptRoles.includes(member?.role);
    const wkPaid = isFeeWaived ? WEEKEND_FEE : (chk.weekendFee || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const meetings = Object.values(chk.attendance || {}).filter(Boolean).length;
    
    return {
      hasMeetings: meetings > 0,
      meetingCount: meetings,
      hasWeekendFee: isFeeWaived || wkPaid >= WEEKEND_FEE,
      hasTeamFee: chk.teamFee?.paid || false,
      hasPalanca: chk.palancaLetter || false
    };
  };

  const sortedMembers = Object.entries(memberDetails).sort(([, a], [, b]) => 
    a.name.localeCompare(b.name)
  );

  // Format currency
  const fmt = (n) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(n || 0);

  return (
    <section id="meeting-check-in-app" className="app-panel mci-app" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%' 
    }}>
      <div id="mciControls" style={{ 
        marginBottom: '16px', 
        display: 'flex', 
        gap: '16px',
        alignItems: 'flex-end'
      }}>
        <div style={{ maxWidth: '250px' }}>
          <label className="label">Select Team</label>
          <div className="toggle" id="mciGenderToggle">
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
      </div>

      {loading ? (
        <div className="card pad" style={{ margin: 'auto', textAlign: 'center', maxWidth: '500px' }}>
          <p style={{ color: 'var(--muted)' }}>Loading team...</p>
        </div>
      ) : !currentTeamId ? (
        <div className="card pad" style={{ margin: 'auto', textAlign: 'center', maxWidth: '500px' }}>
          <h2 style={{ marginBottom: '10px' }}>Meeting Check-In</h2>
          <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
            Select a team above to begin tracking meeting attendance and payments.
          </p>
        </div>
      ) : (
        <div className="main-container" style={{ 
          display: 'grid',
          gridTemplateColumns: '350px 1fr',
          gap: '16px',
          flex: 1,
          minHeight: 0
        }}>
          {/* LEFT PANEL: Member List */}
          <div className="member-list" style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--panel)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <div className="list-header" style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Team Members ({sortedMembers.length})</span>
            </div>
            
            <div className="status-legend" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              padding: '12px 16px',
              fontSize: '11px',
              color: 'var(--muted)',
              borderBottom: '1px solid var(--border)',
              textAlign: 'center'
            }}>
              <span>Meetings</span>
              <span>Weekend</span>
              <span>Team</span>
              <span>Palanca</span>
            </div>

            <div className="list-content" style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px'
            }}>
              {sortedMembers.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: 'var(--muted)', 
                  padding: '40px 20px' 
                }}>
                  No team members loaded.
                </div>
              ) : (
                sortedMembers.map(([id, member]) => {
                  const status = getStatusForMember(id);
                  const isSelected = selectedMemberId === id;
                  
                  return (
                    <div 
                      key={id}
                      className={`member-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectMember(id)}
                      style={{
                        padding: '15px 20px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: '.2s',
                        borderLeft: isSelected ? '5px solid var(--accentB)' : '5px solid transparent',
                        background: isSelected ? 'rgba(0, 163, 255, .08)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--panel-header)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div>
                        <div className="member-name" style={{ fontWeight: '700' }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {member.role || ''}
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px'
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--muted)'
                        }}>
                          {status.meetingCount}/6
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <span 
                            className="status-dot"
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              border: status.hasMeetings ? '2px solid var(--accentA)' : '2px solid var(--muted)',
                              background: status.hasMeetings ? 'var(--accentA)' : 'transparent',
                              display: 'inline-block'
                            }}
                          />
                          <span 
                            className="status-dot"
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              border: status.hasWeekendFee ? '2px solid var(--accentA)' : '2px solid var(--muted)',
                              background: status.hasWeekendFee ? 'var(--accentA)' : 'transparent',
                              display: 'inline-block'
                            }}
                          />
                          <span 
                            className="status-dot"
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              border: status.hasTeamFee ? '2px solid var(--accentA)' : '2px solid var(--muted)',
                              background: status.hasTeamFee ? 'var(--accentA)' : 'transparent',
                              display: 'inline-block'
                            }}
                          />
                          <span 
                            className="status-dot"
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              border: status.hasPalanca ? '2px solid var(--accentA)' : '2px solid var(--muted)',
                              background: status.hasPalanca ? 'var(--accentA)' : 'transparent',
                              display: 'inline-block'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Detail View */}
          <div className="detail-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--panel)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            {!selectedMemberId ? (
              <div style={{ 
                margin: 'auto', 
                textAlign: 'center', 
                color: 'var(--muted)', 
                padding: '40px' 
              }}>
                Select a team member to check them in.
              </div>
            ) : (
              <DetailPanel
                memberId={selectedMemberId}
                member={memberDetails[selectedMemberId]}
                checkin={checkinData[selectedMemberId] || {}}
                onToggleAttendance={toggleAttendance}
                onToggleTeamFee={toggleTeamFee}
                onTogglePalanca={togglePalanca}
                onToggleOnlinePayment={toggleOnlinePayment}
                onRemovePayment={removePayment}
                onTogglePaymentExpansion={togglePaymentExpansion}
                expandedPaymentType={expandedPaymentType}
                paymentAmount={paymentAmount}
                setPaymentAmount={setPaymentAmount}
                onAddPayment={addPayment}
                onSave={handleSaveMember}
                hasUnsavedChanges={hasUnsavedChanges(selectedMemberId)}
                saving={saving}
                config={{
                  WEEKEND_FEE,
                  TEAM_FEE,
                  MEETING_COUNT,
                  feeExemptRoles,
                  fmt
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--panel)',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Unsaved Changes</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
              You have unsaved changes for <strong>{memberDetails[selectedMemberId]?.name}</strong>. 
              Do you want to save before switching members?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn"
                onClick={handleCancelSwitch}
              >
                Cancel
              </button>
              <button 
                className="btn btn-warning"
                onClick={handleDiscardChanges}
              >
                Don't Save
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveAndSwitch}
              >
                Save & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ===== DETAIL PANEL COMPONENT =====

function DetailPanel({ 
  memberId, 
  member, 
  checkin, 
  onToggleAttendance, 
  onToggleTeamFee, 
  onTogglePalanca, 
  onToggleOnlinePayment,
  onRemovePayment,
  onTogglePaymentExpansion,
  expandedPaymentType,
  paymentAmount,
  setPaymentAmount,
  onAddPayment,
  onSave,
  hasUnsavedChanges,
  saving,
  config 
}) {
  const { WEEKEND_FEE, TEAM_FEE, MEETING_COUNT, feeExemptRoles, fmt } = config;
  
  const isFeeWaived = feeExemptRoles.includes(member.role);
  const wkPaid = isFeeWaived ? WEEKEND_FEE : (checkin.weekendFee || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const wkDue = isFeeWaived ? 0 : Math.max(0, WEEKEND_FEE - wkPaid);
  const tmPaid = checkin.teamFee?.paid ? TEAM_FEE : 0;
  const tmDue = Math.max(0, TEAM_FEE - tmPaid);
  
  const weekendFeeStatus = isFeeWaived ? 'waived' : (wkPaid >= WEEKEND_FEE ? 'paid' : (wkPaid > 0 ? 'partial' : 'due'));
  
  const getBtnClass = (method) => {
    if (!checkin.weekendFee || checkin.weekendFee.length === 0) return '';
    const hasPaymentOfMethod = checkin.weekendFee.some(p => p.method === method);
    if (!hasPaymentOfMethod) return '';
    if (weekendFeeStatus === 'paid') return 'btn-primary';
    if (weekendFeeStatus === 'partial') return 'btn-warning';
    return '';
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'auto',
      padding: '24px'
    }}>
      <div style={{ 
        marginBottom: '24px', 
        paddingBottom: '16px', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>{member.name}</h2>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
            {member.role}
          </div>
        </div>
        <button 
          className={`btn ${hasUnsavedChanges ? 'btn-primary' : ''}`}
          onClick={() => onSave(memberId)}
          disabled={saving || !hasUnsavedChanges}
        >
          {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
        </button>
      </div>

      {/* Meetings Section */}
      <div style={{ marginBottom: '24px' }}>
        <div className="section-title" style={{ marginBottom: '12px' }}>Meetings</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px'
        }}>
          {Array.from({ length: MEETING_COUNT }, (_, i) => i + 1).map(num => {
            const val = checkin.attendance?.[num];
            return (
              <button
                key={num}
                className="meet-btn"
                onClick={() => onToggleAttendance(memberId, num)}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: val === true 
                    ? 'var(--accentA)' 
                    : val === 'zoom' 
                    ? 'var(--accentB)' 
                    : 'var(--panel)',
                  color: (val === true || val === 'zoom') ? 'white' : 'var(--ink)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                {val === 'zoom' ? `${num} (Z)` : num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Payments Section */}
      <div style={{ marginBottom: '24px' }}>
        <div className="section-title" style={{ marginBottom: '12px' }}>Payments</div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px' 
        }}>
          {/* Weekend Fee Card */}
          <div className="card pad" style={{ margin: 0 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'baseline', 
              marginBottom: '12px' 
            }}>
              <div className="label" style={{ marginBottom: 0 }}>Weekend Fee</div>
              {isFeeWaived && (
                <div style={{ 
                  color: 'var(--accentA)', 
                  fontWeight: '600', 
                  fontSize: '0.75rem' 
                }}>
                  Fee Waived
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '6px',
              marginBottom: '8px'
            }}>
              <button 
                className={`btn ${getBtnClass('cash')} ${expandedPaymentType === 'cash' ? 'btn-primary' : ''}`}
                disabled={isFeeWaived}
                onClick={() => onTogglePaymentExpansion('cash')}
              >
                Cash
              </button>
              <button 
                className={`btn ${getBtnClass('check')} ${expandedPaymentType === 'check' ? 'btn-primary' : ''}`}
                disabled={isFeeWaived}
                onClick={() => onTogglePaymentExpansion('check')}
              >
                Check
              </button>
              <button 
                className={`btn ${getBtnClass('online')}`}
                disabled={isFeeWaived}
                onClick={() => onToggleOnlinePayment(memberId)}
              >
                Online
              </button>
            </div>
            
            <button 
              className={`btn ${getBtnClass('sponsorship')} ${expandedPaymentType === 'sponsorship' ? 'btn-primary' : ''}`}
              disabled={isFeeWaived}
              onClick={() => onTogglePaymentExpansion('sponsorship')}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              Sponsorship
            </button>

            {/* Expandable Payment Input */}
            {expandedPaymentType && (
              <div style={{
                marginBottom: '12px',
                padding: '12px',
                background: 'var(--surface)',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '10px',
                  textTransform: 'capitalize'
                }}>
                  {expandedPaymentType} Payment
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => onAddPayment(WEEKEND_FEE)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Full Amount
                  </button>
                  
                  <span style={{ 
                    color: 'var(--muted)', 
                    fontSize: '13px',
                    whiteSpace: 'nowrap'
                  }}>
                    or
                  </span>
                  
                  <input
                    type="number"
                    placeholder="Partial amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && paymentAmount && parseFloat(paymentAmount) > 0) {
                        onAddPayment(parseFloat(paymentAmount));
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    autoFocus
                  />
                  
                  <button 
                    className="btn btn-primary"
                    onClick={() => onAddPayment(parseFloat(paymentAmount))}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            
            {/* Payment Badges */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px', 
              marginBottom: '12px',
              minHeight: '28px'
            }}>
              {(checkin.weekendFee || []).map((payment, index) => (
                payment && payment.method && payment.amount > 0 && (
                  <span 
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: 'var(--accentB)',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}
                  >
                    <span>{payment.method}: {fmt(payment.amount)}</span>
                    <button 
                      onClick={() => onRemovePayment(memberId, index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        lineHeight: '1',
                        padding: '0',
                        marginLeft: '4px'
                      }}
                    >
                      ×
                    </button>
                  </span>
                )
              ))}
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)'
            }}>
              <span>
                <span style={{ color: 'var(--muted)' }}>Paid:</span>
                <span style={{ fontWeight: '600', marginLeft: '6px' }}>{fmt(wkPaid)}</span>
              </span>
              <span>
                <span style={{ color: 'var(--muted)' }}>Due:</span>
                <span style={{ fontWeight: '600', marginLeft: '6px' }}>{fmt(wkDue)}</span>
              </span>
            </div>
          </div>

          {/* Team Fee Card */}
          <div className="card pad" style={{ margin: 0 }}>
            <div className="label" style={{ marginBottom: '12px' }}>Team Fee</div>
            <button 
              className={`btn ${checkin.teamFee?.paid ? 'btn-primary' : ''}`}
              onClick={() => onToggleTeamFee(memberId)}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {checkin.teamFee?.paid ? 'Paid' : 'Mark as Paid'}
            </button>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)',
              marginBottom: '12px'
            }}>
              <span>
                <span style={{ color: 'var(--muted)' }}>Paid:</span>
                <span style={{ fontWeight: '600', marginLeft: '6px' }}>{fmt(tmPaid)}</span>
              </span>
              <span>
                <span style={{ color: 'var(--muted)' }}>Due:</span>
                <span style={{ fontWeight: '600', marginLeft: '6px' }}>{fmt(tmDue)}</span>
              </span>
            </div>
            
            {/* Palanca Button */}
            <div className="label" style={{ marginBottom: '8px', marginTop: '8px' }}>Palanca Letter</div>
            <button 
              className={`btn ${checkin.palancaLetter ? 'btn-primary' : ''}`}
              onClick={() => onTogglePalanca(memberId)}
              style={{ width: '100%' }}
            >
              {checkin.palancaLetter ? '✓ Received' : 'Mark as Received'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}