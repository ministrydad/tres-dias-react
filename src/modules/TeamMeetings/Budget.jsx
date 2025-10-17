// src/modules/MCI/Budget.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function Budget() {
  const { orgId } = useAuth();
  const [currentGender, setCurrentGender] = useState('men');
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [memberDetails, setMemberDetails] = useState({});
  const [budgetSettings, setBudgetSettings] = useState({});
  const [disbursementData, setDisbursementData] = useState([]);
  const [loading, setLoading] = useState(true);

  const budgetKeys = ['Rector', 'Head', 'AsstHead', 'Prayer', 'Kitchen', 'Dorm', 'Chapel', 'Table', 'Worship', 'Palanca', 'Storeroom'];
  const leftColumnKeys = ['Rector', 'Head', 'AsstHead', 'Prayer', 'Kitchen', 'Dorm'];
  const rightColumnKeys = ['Chapel', 'Table', 'Worship', 'Palanca', 'Storeroom'];

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  useEffect(() => {
    if (orgId) {
      handleGenderToggle('men');
    }
  }, [orgId]);

  const handleGenderToggle = async (gender) => {
    setCurrentGender(gender);
    setLoading(true);
    await loadBudgetData(gender);
  };

  const loadBudgetData = async (gender) => {
    try {
      const rosterTable = gender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
      const rawTable = gender === 'men' ? 'men_raw' : 'women_raw';
      
      const { data: teams, error: teamsError } = await supabase
        .from(rosterTable)
        .select('weekend_identifier')
        .eq('org_id', orgId);
      
      if (teamsError) throw teamsError;

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

      if (!latest.identifier) {
        setLoading(false);
        setCurrentTeamId(null);
        return;
      }

      setCurrentTeamId(latest.identifier);

      const { data: roster, error: rosterError } = await supabase
        .from(rosterTable)
        .select('*')
        .eq('weekend_identifier', latest.identifier)
        .eq('org_id', orgId);
      
      if (rosterError) throw rosterError;

      const keys = [...new Set(roster.map(r => r.pescadore_key))];

      const { data: profiles, error: profilesError } = await supabase
        .from(rawTable)
        .select('PescadoreKey, First, Last')
        .in('PescadoreKey', keys)
        .eq('org_id', orgId);
      
      if (profilesError) throw profilesError;

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[String(p.PescadoreKey)] = p;
        return acc;
      }, {});

      const details = {};
      (roster || []).forEach(r => {
        const prof = profileMap[String(r.pescadore_key)];
        const name = prof ? `${prof.First || ''} ${prof.Last || ''}`.trim() : 'Unknown Member';
        details[String(r.pescadore_key)] = {
          name,
          role: (r.role || '').replace('Prof_', '')
        };
      });

      setMemberDetails(details);

      const { data: settings, error: settingsError } = await supabase
        .from('app_budgets')
        .select('*')
        .eq('id', 1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      setBudgetSettings(settings || {});

      const { data: disbursements, error: disbError } = await supabase
        .from('mci_budgets')
        .select('*')
        .eq('team_gender', gender);

      if (disbError) throw disbError;

      setDisbursementData(disbursements || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading budget data:', error);
      setLoading(false);
    }
  };

  const handleAddDisbursement = (roleKey) => {
    const record = disbursementData.find(d => d.role === roleKey);
    const currentDisbursements = record?.disbursements || [];
    
    const newDisbursements = [...currentDisbursements, { amount: 0, given_to: '' }];
    
    setDisbursementData(prev => {
      const existing = prev.find(d => d.role === roleKey);
      if (existing) {
        return prev.map(d => d.role === roleKey ? { ...d, disbursements: newDisbursements } : d);
      } else {
        return [...prev, { role: roleKey, team_gender: currentGender, disbursements: newDisbursements }];
      }
    });
  };

  const handleDisbursementChange = async (roleKey, index, field, value) => {
    const record = disbursementData.find(d => d.role === roleKey);
    const currentDisbursements = record?.disbursements || [];
    
    const newDisbursements = [...currentDisbursements];
    newDisbursements[index] = { ...newDisbursements[index], [field]: field === 'amount' ? parseFloat(value) || 0 : value };
    
    const filteredDisbursements = newDisbursements.filter(d => d && !isNaN(d.amount) && d.amount > 0 && d.given_to);
    
    await saveDisbursements(roleKey, filteredDisbursements);
    
    setDisbursementData(prev => {
      const existing = prev.find(d => d.role === roleKey);
      if (existing) {
        return prev.map(d => d.role === roleKey ? { ...d, disbursements: newDisbursements } : d);
      } else {
        return [...prev, { role: roleKey, team_gender: currentGender, disbursements: newDisbursements }];
      }
    });
  };

  const handleDeleteDisbursement = async (roleKey, index) => {
    const record = disbursementData.find(d => d.role === roleKey);
    const currentDisbursements = record?.disbursements || [];
    
    const newDisbursements = currentDisbursements.filter((_, i) => i !== index);
    const filteredDisbursements = newDisbursements.filter(d => d && !isNaN(d.amount) && d.amount > 0 && d.given_to);
    
    await saveDisbursements(roleKey, filteredDisbursements);
    
    setDisbursementData(prev => {
      return prev.map(d => d.role === roleKey ? { ...d, disbursements: newDisbursements } : d);
    });
  };

  const saveDisbursements = async (role, disbursementsArray) => {
    const payload = {
      team_gender: currentGender,
      role: role,
      disbursements: disbursementsArray
    };

    try {
      const { error } = await supabase
        .from('mci_budgets')
        .upsert(payload, { onConflict: 'team_gender,role' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving disbursement:', error);
    }
  };

  const calculateRoleTotals = (roleKey) => {
    const budgetAmount = parseFloat(budgetSettings[`budget_${roleKey.toLowerCase()}`] || 0);
    const record = disbursementData.find(d => d.role === roleKey);
    const disbursedAmount = record ? (record.disbursements || []).reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
    const balance = budgetAmount - disbursedAmount;
    
    return { budgetAmount, disbursedAmount, balance };
  };

  const calculateGrandTotals = () => {
    let totalBudget = 0;
    let totalDisbursed = 0;
    
    budgetKeys.forEach(rKey => {
      const { budgetAmount, disbursedAmount } = calculateRoleTotals(rKey);
      totalBudget += budgetAmount;
      totalDisbursed += disbursedAmount;
    });
    
    return {
      totalBudget,
      totalDisbursed,
      totalBalance: totalBudget - totalDisbursed
    };
  };

  const totals = calculateGrandTotals();

  return (
    <section id="meeting-check-in-app" className="app-panel mci-app" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div id="mciControls" style={{ marginBottom: '16px', display: 'flex', maxWidth: '250px' }}>
        <div>
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

      <div id="budgetScreen" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="detail-panel" style={{ flex: 1 }}>
          <div className="reports-header">
            <h2 id="budget-header-title">
              {currentGender.charAt(0).toUpperCase() + currentGender.slice(1)}'s Budget
            </h2>
          </div>
          
          <div id="budget-table-container" style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading team and budget data...</p>
            ) : !currentTeamId ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
                No team roster found. Please load a team on the Check-In page first.
              </p>
            ) : Object.keys(memberDetails).length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
                No team members loaded.
              </p>
            ) : (
              <div className="budget-container">
                {/* Financial Summary Card */}
                <div id="financial-summary-card" className="card pad">
                  <div className="section-title" style={{ marginBottom: 0 }}>Financial Summary</div>
                  <div className="grid grid-3" style={{ marginTop: '10px' }}>
                    <div>
                      <div className="label">Total Budget</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{fmt(totals.totalBudget)}</div>
                    </div>
                    <div>
                      <div className="label">Total Disbursed</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{fmt(totals.totalDisbursed)}</div>
                    </div>
                    <div>
                      <div className="label">Remaining Cash</div>
                      <div 
                        style={{ fontSize: '1.5rem', fontWeight: 900 }}
                        className={totals.totalBalance >= 0 ? 'balance-positive' : 'balance-negative'}
                      >
                        {fmt(totals.totalBalance)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Budget Grid */}
                <div className="budget-layout-grid">
                  <div id="budget-col-1" className="budget-column">
                    {leftColumnKeys.map(roleKey => (
                      <BudgetItem 
                        key={roleKey}
                        roleKey={roleKey}
                        memberDetails={memberDetails}
                        disbursementData={disbursementData}
                        calculateRoleTotals={calculateRoleTotals}
                        handleAddDisbursement={handleAddDisbursement}
                        handleDisbursementChange={handleDisbursementChange}
                        handleDeleteDisbursement={handleDeleteDisbursement}
                        fmt={fmt}
                      />
                    ))}
                  </div>
                  <div id="budget-col-2" className="budget-column">
                    {rightColumnKeys.map(roleKey => (
                      <BudgetItem 
                        key={roleKey}
                        roleKey={roleKey}
                        memberDetails={memberDetails}
                        disbursementData={disbursementData}
                        calculateRoleTotals={calculateRoleTotals}
                        handleAddDisbursement={handleAddDisbursement}
                        handleDisbursementChange={handleDisbursementChange}
                        handleDeleteDisbursement={handleDeleteDisbursement}
                        fmt={fmt}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BudgetItem({ 
  roleKey, 
  memberDetails, 
  disbursementData, 
  calculateRoleTotals, 
  handleAddDisbursement, 
  handleDisbursementChange,
  handleDeleteDisbursement,
  fmt 
}) {
  const { budgetAmount, disbursedAmount, balance } = calculateRoleTotals(roleKey);
  const record = disbursementData.find(d => d.role === roleKey);
  const disbursements = record?.disbursements || [];

  const sortedMembers = Object.entries(memberDetails).sort(([, a], [, b]) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="budget-item" data-role={roleKey}>
      <div className="budget-item-header">
        <span className="role">{roleKey}</span>
        <button 
          className="btn btn-info btn-small add-disbursement-btn"
          onClick={() => handleAddDisbursement(roleKey)}
        >
          + Add
        </button>
      </div>
      <div className="budget-item-body">
        <div className="disbursement-inputs">
          {disbursements.map((disb, idx) => (
            <div key={idx} className="disbursement-entry">
              <input 
                type="number"
                className="input disbursement-amount"
                value={disb.amount || ''}
                onChange={(e) => handleDisbursementChange(roleKey, idx, 'amount', e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <select 
                className="select disbursement-recipient"
                value={disb.given_to || ''}
                onChange={(e) => handleDisbursementChange(roleKey, idx, 'given_to', e.target.value)}
              >
                <option value="">Given to...</option>
                {sortedMembers.map(([id, member]) => (
                  <option key={id} value={id}>{member.name}</option>
                ))}
              </select>
              <button 
                className="btn btn-danger btn-small disbursement-delete-btn"
                onClick={() => handleDeleteDisbursement(roleKey, idx)}
                style={{ padding: '0.5rem 0.6rem', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="financial-summary">
          <div className="financial-line">
            <span>Budget:</span>
            <span className="budget-value budget-amount">{fmt(budgetAmount)}</span>
          </div>
          <div className="financial-line">
            <span>Disbursed:</span>
            <span className="budget-value disbursed-total">{fmt(disbursedAmount)}</span>
          </div>
          <div className="financial-line" style={{ fontWeight: 'bold' }}>
            <span>Balance:</span>
            <span className={`budget-value balance ${balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
              {fmt(balance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}