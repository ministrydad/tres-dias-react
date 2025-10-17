// src/modules/CRA/Reports.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function Reports() {
  const { orgId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('men');
  const [currentTab, setCurrentTab] = useState('attendees');
  const [loading, setLoading] = useState(true);

  // Fee constants (should match your config)
  const WEEKEND_FEE = 150;
  const SPONSOR_FEE = 50;

  useEffect(() => {
    if (orgId) {
      loadApplications();
    }
  }, [orgId]);

  // Cleanup effect - ensure no lingering styles or classes
  useEffect(() => {
    return () => {
      // Remove any potential print mode classes
      document.body.classList.remove('print-mode');
      document.querySelector('.app-container')?.classList.remove('print-mode');
    };
  }, []);

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
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };

  // Filter applications by gender
  const filteredApps = applications.filter(app => {
    return (currentFilter === 'men' && app.m_first) || (currentFilter === 'women' && app.f_first);
  });

  // Calculate financial totals
  const computeFinancialTotals = () => {
    const totals = {
      weekendExpected: 0,
      sponsorExpected: 0,
      weekendCollected: 0,
      sponsorCollected: 0,
      cashCollected: 0,
      checkCollected: 0,
      overdueItems: 0
    };

    filteredApps.forEach(app => {
      const isScholarship = app.payment_wk_scholarship;
      const isFullScholarship = isScholarship && app.payment_wk_scholarshiptype === 'full';
      
      // Expected
      if (!isFullScholarship) {
        totals.weekendExpected += WEEKEND_FEE;
      }
      totals.sponsorExpected += SPONSOR_FEE;

      // Collected
      let weekendCollected = 0;
      if (isFullScholarship) {
        weekendCollected = WEEKEND_FEE;
      } else if (isScholarship && app.payment_wk_scholarshiptype === 'partial') {
        weekendCollected = app.payment_wk_partialamount || 0;
      } else if (app.payment_wk_cash || app.payment_wk_check) {
        weekendCollected = WEEKEND_FEE;
      }
      
      const sponsorCollected = (app.payment_sp_cash || app.payment_sp_check) ? SPONSOR_FEE : 0;
      
      totals.weekendCollected += weekendCollected;
      totals.sponsorCollected += sponsorCollected;
      
      // Payment methods
      if (app.payment_wk_cash) totals.cashCollected += WEEKEND_FEE;
      if (app.payment_wk_check) totals.checkCollected += WEEKEND_FEE;
      if (app.payment_sp_cash) totals.cashCollected += SPONSOR_FEE;
      if (app.payment_sp_check) totals.checkCollected += SPONSOR_FEE;

      // Overdue
      const totalExpected = (isFullScholarship ? 0 : WEEKEND_FEE) + SPONSOR_FEE;
      const totalCollected = weekendCollected + sponsorCollected;
      if ((totalExpected - totalCollected) > 0.01) {
        totals.overdueItems++;
      }
    });

    return totals;
  };

  const totals = computeFinancialTotals();
  const totalExpected = totals.weekendExpected + totals.sponsorExpected;
  const totalCollected = totals.weekendCollected + totals.sponsorCollected;
  const balanceDue = totalExpected - totalCollected;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getCandidateName = (app) => {
    const p = currentFilter === 'men' ? 'm_' : 'f_';
    return `${app[p+'first']} ${app[p+'pref'] ? `(${app[p+'pref']}) ` : ''}${app.c_lastname}`;
  };

  const printCheckinReport = () => {
    window.print();
  };

  return (
    <div id="cra-reports" className="cra-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls */}
      <div className="card pad">
        <div className="section-title">Reports Dashboard</div>
        <div className="controls" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="label">Select Report Group</div>
            <div className="toggle" id="craReportFilter">
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
        </div>
      </div>

      {/* Financial Summary - Always Visible */}
      <div id="cra-financial-report" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="grid grid-4">
          <div className="card pad">
            <div className="label">Total Expected</div>
            <div id="cra_totalExpected" style={{ fontSize: '28px', fontWeight: 900 }}>
              {formatCurrency(totalExpected)}
            </div>
          </div>
          <div className="card pad">
            <div className="label">Total Collected</div>
            <div id="cra_totalCollected" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accentA)' }}>
              {formatCurrency(totalCollected)}
            </div>
          </div>
          <div className="card pad">
            <div className="label">Balance Due</div>
            <div 
              id="cra_balanceDue" 
              style={{ 
                fontSize: '28px', 
                fontWeight: 900, 
                color: balanceDue > 0.01 ? 'var(--accentD)' : 'var(--accentA)' 
              }}
            >
              {formatCurrency(balanceDue)}
            </div>
          </div>
          <div className="card pad">
            <div className="label">Overdue Items</div>
            <div id="cra_overdueItems" style={{ fontSize: '28px', fontWeight: 900 }}>
              {totals.overdueItems}
            </div>
          </div>
        </div>

        {/* Detailed Financial Breakdown */}
        <div className="card pad">
          <div className="section-title">Financial Breakdown</div>
          <div className="grid grid-3">
            <div className="card pad">
              <div className="label">Weekend Fees</div>
              <div className="financial-line">
                <span>Expected:</span>
                <span id="cra_weekendExpected">{formatCurrency(totals.weekendExpected)}</span>
              </div>
              <div className="financial-line">
                <span>Collected:</span>
                <span id="cra_weekendCollected" style={{ color: 'var(--accentA)' }}>
                  {formatCurrency(totals.weekendCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Balance:</span>
                <span 
                  id="cra_weekendBalance"
                  style={{ 
                    color: (totals.weekendExpected - totals.weekendCollected) > 0.01 ? 'var(--accentD)' : 'var(--accentA)' 
                  }}
                >
                  {formatCurrency(totals.weekendExpected - totals.weekendCollected)}
                </span>
              </div>
            </div>

            <div className="card pad">
              <div className="label">Sponsor Fees</div>
              <div className="financial-line">
                <span>Expected:</span>
                <span id="cra_sponsorExpected">{formatCurrency(totals.sponsorExpected)}</span>
              </div>
              <div className="financial-line">
                <span>Collected:</span>
                <span id="cra_sponsorCollected" style={{ color: 'var(--accentA)' }}>
                  {formatCurrency(totals.sponsorCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Balance:</span>
                <span 
                  id="cra_sponsorBalance"
                  style={{ 
                    color: (totals.sponsorExpected - totals.sponsorCollected) > 0.01 ? 'var(--accentD)' : 'var(--accentA)' 
                  }}
                >
                  {formatCurrency(totals.sponsorExpected - totals.sponsorCollected)}
                </span>
              </div>
            </div>

            <div className="card pad">
              <div className="label">Payment Methods</div>
              <div className="financial-line">
                <span>Cash:</span>
                <span id="cra_cashCollected" style={{ color: 'var(--accentA)' }}>
                  {formatCurrency(totals.cashCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Check:</span>
                <span id="cra_checkCollected" style={{ color: 'var(--accentB)' }}>
                  {formatCurrency(totals.checkCollected)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Reports */}
      <div className="card pad">
        <div className="report-tabs">
          <div 
            className={`tab ${currentTab === 'attendees' ? 'active' : ''}`}
            onClick={() => handleTabChange('attendees')}
          >
            Attendee List
          </div>
          <div 
            className={`tab ${currentTab === 'payments' ? 'active' : ''}`}
            onClick={() => handleTabChange('payments')}
          >
            Payment List
          </div>
          <div 
            className={`tab ${currentTab === 'checkin' ? 'active' : ''}`}
            onClick={() => handleTabChange('checkin')}
          >
            Check-In Sheet
          </div>
        </div>

        <div id="cra-report-output">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>Loading report data...</p>
          ) : filteredApps.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No {currentFilter} candidates found.
            </p>
          ) : (
            <>
              {/* Attendee List */}
              {currentTab === 'attendees' && (
                <>
                  <div className="section-title">{currentFilter.toUpperCase()} Attendee List</div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Emergency Contact</th>
                        <th>Smoker</th>
                        <th>Diet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(app => {
                        const p = currentFilter === 'men' ? 'm_' : 'f_';
                        return (
                          <tr key={app.id}>
                            <td>{getCandidateName(app)}</td>
                            <td>{app[p+'cell']}</td>
                            <td>{app[p+'email']}</td>
                            <td>{app[p+'emerg']} {app[p+'emergphone']}</td>
                            <td>{app.smoker ? 'Yes' : 'No'}</td>
                            <td>{app.diet ? (app.diet_details || 'Yes') : 'None'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {/* Payment List */}
              {currentTab === 'payments' && (
                <>
                  <div className="section-title">{currentFilter.toUpperCase()} Payment Report</div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Weekend Fee</th>
                        <th>Sponsor Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(app => {
                        let wkFee;
                        if (app.payment_wk_scholarship) {
                          wkFee = app.payment_wk_scholarshiptype === 'full' 
                            ? 'Full Scholarship' 
                            : `Partial ($${app.payment_wk_partialamount})`;
                        } else {
                          wkFee = (app.payment_wk_cash || app.payment_wk_check) ? 'Paid' : 'Due';
                        }
                        const spFee = (app.payment_sp_cash || app.payment_sp_check) ? 'Paid' : 'Due';

                        return (
                          <tr key={app.id}>
                            <td>{getCandidateName(app)}</td>
                            <td>{wkFee}</td>
                            <td>{spFee}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {/* Check-In Sheet */}
              {currentTab === 'checkin' && (
                <>
                  <div className="checkin-report-container" id="checkin-report-printable">
                    <div className="checkin-report-header">
                      <h1>Team Tools Pro</h1>
                      <h2>{currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)}'s Weekend Check-In Sheet</h2>
                    </div>
                    <table className="table checkin-report-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Contact Information</th>
                          <th>Church</th>
                          <th>Emergency Contact</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Info Verified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApps.map(app => {
                          const p = currentFilter === 'men' ? 'm_' : 'f_';
                          const smokerBadge = app.smoker ? '<span class="checkin-badge smoker">Smoker</span>' : '';
                          const dietBadge = app.diet ? `<span class="checkin-badge diet">Diet: ${app.diet_details || 'Yes'}</span>` : '';
                          
                          return (
                            <tr key={app.id}>
                              <td>
                                <strong>{app[p+'first'] || ''} {app.c_lastname || ''}</strong><br />
                                <span style={{ fontSize: '0.8em', color: 'var(--muted)' }}>
                                  {app[p+'pref'] ? `(Prefers: ${app[p+'pref']})` : ''}
                                </span>
                                <div className="checkin-info" dangerouslySetInnerHTML={{ __html: smokerBadge + dietBadge }} />
                              </td>
                              <td>
                                {app.c_address || ''}<br />
                                {app.c_city || ''}, {app.c_state || ''} {app.c_zip || ''}<br />
                                {app[p+'cell'] || 'N/A'}<br />
                                {app[p+'email'] || 'N/A'}
                              </td>
                              <td>{app.c_church || 'N/A'}</td>
                              <td>
                                {app[p+'emerg'] || 'N/A'}<br />
                                <strong>P:</strong> {app[p+'emergphone'] || 'N/A'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="checkbox"></div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={printCheckinReport}
                    style={{ marginTop: '16px', width: '100%' }}
                  >
                    Print Report
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}