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

  const handleGenderToggle = async (gender, element) => {
    setCurrentGender(gender);
    
    // Update toggle UI
    const toggleContainer = document.getElementById('mciGenderToggle');
    if (toggleContainer) {
      toggleContainer.querySelectorAll('.opt').forEach(opt => opt.classList.remove('active'));
      if (element) {
        element.classList.add('active');
      } else {
        const targetOpt = toggleContainer.querySelector(`[data-gender="${gender}"]`);
        if (targetOpt) targetOpt.classList.add('active');
      }
    }
    
    await loadLatestTeamByGender(gender);
  };

  const loadLatestTeamByGender = async (gender) => {
    const listContainer = document.getElementById('membersList');
    const detailContent = document.getElementById('detailContent');
    if (listContainer) {
      listContainer.innerHTML = `<div class="empty-list-message">Loading latest ${gender}'s team...</div>`;
    }
    if (detailContent) {
      detailContent.innerHTML = '<div class="empty-list-message" style="margin: auto;">Loading...</div>';
    }
    
    const mciMain = document.getElementById('mciMain');
    const mciPrompt = document.getElementById('mciInitialPrompt');
    if (mciMain) mciMain.style.display = 'grid';
    if (mciPrompt) mciPrompt.style.display = 'none';

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
        const controls = document.getElementById('mciControls');
        const prompt = document.getElementById('mciInitialPrompt');
        if (controls) controls.style.display = 'flex';
        if (prompt) {
          prompt.style.display = 'block';
          const promptP = prompt.querySelector('p');
          if (promptP) {
            promptP.textContent = `No ${gender}'s team roster could be found. Use Team Viewer to create one.`;
          }
        }
        if (mciMain) mciMain.style.display = 'none';
      }
    } catch (error) {
      console.error('Error loading latest team:', error);
      clearTeamView();
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

      // Load pescadore profiles - NOTE: Column names are PascalCase (PescadoreKey, First, Last, Email)
      const { data: profiles, error: profilesError } = await supabase
        .from(rawTable)
        .select('PescadoreKey, First, Last, Email')
        .in('PescadoreKey', keys)
        .eq('org_id', orgId);
      
      if (profilesError) throw profilesError;

      // Build a map for faster lookup - key is PescadoreKey
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

      const checkins = {};
      Object.keys(details).forEach(id => {
        const row = (saved || []).find(x => String(x.member_id) === String(id));
        const savedData = row?.checkin_details || {};
        
        // Normalize weekendFee to always be an array
        let weekendFee = savedData.weekendFee || [];
        if (!Array.isArray(weekendFee)) {
          // If it's an object like {amount: 265}, convert to array format
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
      setSelectedMemberId(null);
      
      renderMembersList(details, checkins);
      
      const detailContent = document.getElementById('detailContent');
      if (detailContent) {
        detailContent.innerHTML = '<div style="text-align:center;color:var(--muted); margin: auto;">Select a team member to check them in.</div>';
      }
    } catch (error) {
      console.error('Failed to import team:', error);
      clearTeamView();
    }
  };

  const renderMembersList = (details, checkins) => {
    const container = document.getElementById('membersList');
    const countSpan = document.getElementById('memberCount');
    
    if (!container) return;
    
    const entries = Object.entries(details).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    
    if (countSpan) countSpan.textContent = String(entries.length);
    
    container.innerHTML = '';
    
    if (!entries.length) {
      container.innerHTML = '<div class="empty-list-message">No team members loaded.</div>';
      return;
    }
    
    // CONFIG constants for status calculation
    const WEEKEND_FEE = 265;
    const feeExemptRoles = ['Rector', 'Head Spiritual Director', 'Spiritual Director'];
    
    entries.forEach(([id, m]) => {
      const chk = checkins[id] || {};
      const meetings = Object.values(chk.attendance || {}).filter(Boolean).length;
      const row = document.createElement('div');
      row.className = 'member-item' + (selectedMemberId === id ? ' selected' : '');
      
      // Calculate status for each circle
      const isFeeWaived = feeExemptRoles.includes(m.role);
      const wkPaid = isFeeWaived ? WEEKEND_FEE : (chk.weekendFee || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const hasMeetings = meetings > 0;
      const hasWeekendFee = isFeeWaived || wkPaid >= WEEKEND_FEE;
      const hasTeamFee = chk.teamFee?.paid || false;
      const hasPalanca = chk.palancaLetter || false;
      
      row.innerHTML = `
        <div>
          <div class="member-name">${m.name}</div>
          <div style="color:var(--muted);font-size:12px">${m.role || ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:12px;color:var(--muted)">${meetings}/6</div>
          <div style="display:flex;gap:10px">
            <span class="status-dot ${hasMeetings ? 'complete' : ''}"></span>
            <span class="status-dot ${hasWeekendFee ? 'complete' : ''}"></span>
            <span class="status-dot ${hasTeamFee ? 'complete' : ''}"></span>
            <span class="status-dot ${hasPalanca ? 'complete' : ''}"></span>
          </div>
        </div>
      `;
      
      row.addEventListener('click', () => {
        setSelectedMemberId(id);
        // Re-render with the SAME data that was passed in, not from state
        setTimeout(() => {
          renderMembersList(details, checkins);
          renderDetailPanel(id, details, checkins);
        }, 0);
      });
      
      container.appendChild(row);
    });
  };

  const renderDetailPanel = (memberId, details, checkins) => {
    const detailContent = document.getElementById('detailContent');
    const detailPanelName = document.getElementById('detailPanelName');
    
    if (!detailContent || !memberId) {
      detailContent.innerHTML = '<div class="empty-list-message" style="margin: auto;">Select a team member to check them in.</div>';
      return;
    }
    
    const member = details[memberId];
    const chk = checkins[memberId] || {};
    
    if (!member) return;
    
    if (detailPanelName) {
      detailPanelName.textContent = member.name;
    }
    
    // CONFIG constants
    const WEEKEND_FEE = 265;
    const TEAM_FEE = 30;
    const MEETING_COUNT = 6;
    const feeExemptRoles = ['Rector', 'Head Spiritual Director', 'Spiritual Director'];
    
    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
    
    const isFeeWaived = feeExemptRoles.includes(member.role);
    const wkPaid = isFeeWaived ? WEEKEND_FEE : (chk.weekendFee || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const wkDue = isFeeWaived ? 0 : Math.max(0, WEEKEND_FEE - wkPaid);
    const tmPaid = chk.teamFee?.paid ? TEAM_FEE : 0;
    const tmDue = Math.max(0, TEAM_FEE - tmPaid);
    
    const weekendButtonsDisabled = isFeeWaived ? 'disabled' : '';
    
    // Button styling logic
    const weekendFeeStatus = isFeeWaived ? 'waived' : (wkPaid >= WEEKEND_FEE ? 'paid' : (wkPaid > 0 ? 'partial' : 'due'));
    const getBtnClass = (method) => {
      if (!chk.weekendFee || chk.weekendFee.length === 0) return '';
      const hasPaymentOfMethod = chk.weekendFee.some(p => p.method === method);
      if (!hasPaymentOfMethod) return '';
      if (weekendFeeStatus === 'paid') return 'btn-primary';
      if (weekendFeeStatus === 'partial') return 'btn-warning';
      return '';
    };
    const cashBtnClass = getBtnClass('cash');
    const checkBtnClass = getBtnClass('check');
    const onlineBtnClass = getBtnClass('online');
    const sponsorshipBtnClass = getBtnClass('sponsorship');
    
    detailContent.innerHTML = `
      <div class="section-title">Meetings</div>
      <div id="attendanceGrid" class="attendance-grid"></div>

      <div class="section-title" style="margin-top:18px">Payments</div>
      <div class="grid grid-2">
        <div class="card fee-card">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
            <div class="label" style="margin-bottom: 0;">Weekend Fee</div>
            ${isFeeWaived ? '<div style="color:var(--accentA); font-weight:600; font-size: 0.8rem;">Fee Waived for this Role</div>' : ''}
          </div>
          <div class="payment-options-grid">
            <button class="btn ${cashBtnClass}" data-fee-method="cash" ${weekendButtonsDisabled}>Cash</button>
            <button class="btn ${checkBtnClass}" data-fee-method="check" ${weekendButtonsDisabled}>Check</button>
            <button class="btn ${onlineBtnClass}" data-fee-method="online" ${weekendButtonsDisabled}>Online</button>
          </div>
          <div style="margin-top: 8px;">
            <button class="btn ${sponsorshipBtnClass}" data-fee-method="sponsorship" style="width: 100%;" ${weekendButtonsDisabled}>Sponsorship</button>
          </div>
          <div id="paymentBadgesContainer" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; min-height: 28px;"></div>
          <div class="inline-status">
            <span class="label">Paid:</span><span class="amount-paid">${fmt(wkPaid)}</span>
            <span class="label">Due:</span><span class="amount-due">${fmt(wkDue)}</span>
          </div>
        </div>

        <div class="card fee-card">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
            <div class="label" style="margin-bottom: 0;">Team Fee</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn ${chk.teamFee?.paid ? 'btn-primary' : ''}" data-fee="team">Paid</button>
          </div>
          <div class="inline-status">
            <span class="label">Paid:</span><span class="amount-paid">${fmt(tmPaid)}</span>
            <span class="label">Due:</span><span class="amount-due">${fmt(tmDue)}</span>
          </div>
        </div>
      </div>
      
      <div style="margin-top:auto; padding-top: 24px; display:flex; align-items:stretch; gap: 16px; border-top: 1px solid var(--border); margin-top: 24px;">
          <button id="palancaBtn" class="btn ${chk.palancaLetter ? 'btn-primary' : ''}">Palanca Letter Received</button>
          <button class="btn btn-primary" id="saveBtn" style="flex-grow: 1;">Save & Update</button>
      </div>
    `;
    
    // Render attendance grid
    const grid = document.getElementById('attendanceGrid');
    if (grid) {
      grid.innerHTML = '';
      for (let i = 1; i <= MEETING_COUNT; i++) {
        const btn = document.createElement('button');
        const val = chk.attendance?.[i];
        btn.className = 'meet-btn';
        btn.textContent = String(i);
        if (val === true) btn.classList.add('attended');
        else if (val === 'zoom') btn.classList.add('zoom');
        btn.addEventListener('click', () => {
          if (!chk.attendance) chk.attendance = {};
          const cur = chk.attendance[i];
          if (cur === false || cur === undefined) chk.attendance[i] = true;
          else if (cur === true) chk.attendance[i] = 'zoom';
          else chk.attendance[i] = false;
          renderDetailPanel(memberId, details, checkins);
          renderMembersList(details, checkins);
        });
        grid.appendChild(btn);
      }
    }
    
    // Team fee button handler
    detailContent.querySelectorAll('[data-fee="team"]').forEach(b => {
      b.addEventListener('click', () => {
        if (!chk.teamFee) chk.teamFee = {};
        chk.teamFee.paid = !chk.teamFee.paid;
        chk.teamFee.amount = chk.teamFee.paid ? TEAM_FEE : 0;
        renderDetailPanel(memberId, details, checkins);
        renderMembersList(details, checkins);
      });
    });
    
    // Palanca button handler
    const palancaBtn = document.getElementById('palancaBtn');
    if (palancaBtn) {
      palancaBtn.addEventListener('click', () => {
        chk.palancaLetter = !chk.palancaLetter;
        renderDetailPanel(memberId, details, checkins);
        renderMembersList(details, checkins);
      });
    }
    
    // Save button handler
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('Save button clicked - TODO: Implement save to Supabase');
        // TODO: Save to mci_checkin_data table
      });
    }
    
    // Weekend fee payment handlers
    detailContent.querySelectorAll('[data-fee-method]').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.feeMethod;
        if (method === 'online') {
          const isAlreadyOnline = chk.weekendFee && chk.weekendFee.length > 0 && chk.weekendFee[0].method === 'online';
          if (isAlreadyOnline) {
            chk.weekendFee = [];
          } else {
            chk.weekendFee = [{ method: 'online', amount: WEEKEND_FEE }];
          }
          renderDetailPanel(memberId, details, checkins);
          renderMembersList(details, checkins);
        } else {
          // For cash/check/sponsorship - TODO: Open payment modal
          console.log(`TODO: Open payment modal for ${method}`);
        }
      });
    });
    
    // Render payment badges
    const badgesContainer = detailContent.querySelector('#paymentBadgesContainer');
    if (badgesContainer && chk.weekendFee) {
      badgesContainer.innerHTML = '';
      (chk.weekendFee || []).forEach((payment, index) => {
        if (payment && payment.method && payment.amount > 0) {
          const badge = document.createElement('span');
          badge.className = `payment-badge ${payment.method}`;
          badge.style.cssText = 'display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:12px; background:var(--accentB); color:white; font-size:0.8rem; font-weight:600;';
          badge.innerHTML = `
            <span>${payment.method}: ${fmt(payment.amount)}</span>
            <button style="background:none; border:none; color:white; cursor:pointer; font-size:1.2rem; line-height:1; padding:0; margin-left:4px;" data-remove-payment="${index}">×</button>
          `;
          badgesContainer.appendChild(badge);
        }
      });
      
      // Remove payment badge handlers
      badgesContainer.querySelectorAll('[data-remove-payment]').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.removePayment);
          if (chk.weekendFee && chk.weekendFee[index] !== undefined) {
            chk.weekendFee.splice(index, 1);
            renderDetailPanel(memberId, details, checkins);
            renderMembersList(details, checkins);
          }
        });
      });
    }
  };

  const clearTeamView = () => {
    setMemberDetails({});
    setCheckinData({});
    setSelectedMemberId(null);
    setCurrentTeamId(null);
    
    const mciMain = document.getElementById('mciMain');
    const mciPrompt = document.getElementById('mciInitialPrompt');
    const mciControls = document.getElementById('mciControls');
    
    if (mciMain) mciMain.style.display = 'none';
    if (mciPrompt) {
      mciPrompt.style.display = 'block';
      const promptP = mciPrompt.querySelector('p');
      if (promptP) {
        promptP.textContent = "Please select a team to begin. Use the sidebar menu to load the latest Men's or Women's team roster and their check-in data.";
      }
    }
    if (mciControls) mciControls.style.display = 'none';
  };

  useEffect(() => {
    // Show controls immediately on mount
    const mciControls = document.getElementById('mciControls');
    if (mciControls) {
      mciControls.style.display = 'flex';
    }

    window.MCI = {
      selectGender: handleGenderToggle,
      loadLatestTeamByGender
    };

    // Don't auto-load team on mount - let user select gender first
    // Removed auto-trigger of handleGenderToggle

    return () => {
      delete window.MCI;
    };
  }, []);

  return (
    <section id="meeting-check-in-app" className="app-panel mci-app" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div id="mciControls" style={{ marginBottom: '16px', display: 'flex', maxWidth: '250px' }}>
        <div>
          <label className="label">Select Team</label>
          <div className="toggle" id="mciGenderToggle">
            <div 
              className="opt active"
              data-gender="men"
              onClick={(e) => handleGenderToggle('men', e.currentTarget)}
            >
              Men
            </div>
            <div 
              className="opt"
              data-gender="women"
              onClick={(e) => handleGenderToggle('women', e.currentTarget)}
            >
              Women
            </div>
          </div>
        </div>
      </div>

      <div id="mciInitialPrompt" className="card pad" style={{ margin: 'auto', textAlign: 'center', maxWidth: '500px' }}>
        <h2 style={{ marginBottom: '10px' }}>Meeting Check-In</h2>
        <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
          Please select a team to begin. Use the sidebar menu to load the latest Men's or Women's team roster and their check-in data.
        </p>
      </div>

      <div id="mciMain" className="main-container" style={{ display: 'none', flex: 1, minHeight: 0 }}>
        <div className="member-list">
          <div className="list-header">
            <span>Team Members (<span id="memberCount">0</span>)</span>
            <button className="btn btn-danger btn-small">Clear</button>
          </div>
          
          <div className="status-legend">
            <span className="status-label">Meetings</span>
            <span className="status-label">Weekend</span>
            <span className="status-label">Team</span>
            <span className="status-label">Palanca</span>
          </div>

          <div id="membersList" className="list-content">
            <div className="empty-list-message">No team members loaded.</div>
          </div>
        </div>

        <div className="detail-panel">
          <div className="status-bar" id="mciStatusBar"></div>
          <div className="meeting-control-container">
            <div id="detailPanelName">Select a Member</div>
          </div>
          <div id="detailContent">
            <div className="empty-list-message" style={{ margin: 'auto' }}>
              Select a team member to check them in.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}