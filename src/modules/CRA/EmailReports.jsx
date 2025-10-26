// src/modules/CRA/EmailReports.jsx - Fixed padding to match Directory
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function EmailReports() {
  const { orgId } = useAuth();

  const [applications, setApplications] = useState([]);
  const [emailLists, setEmailLists] = useState({
    rector_men: [],
    rector_women: [],
    prayer_men: [],
    prayer_women: [],
    dorm_men: [],
    dorm_women: [],
    kitchen_men: [],
    kitchen_women: []
  });
  const [emailSettings, setEmailSettings] = useState({
    from_name: '',
    from_email: '',
    reply_to: '',
    bcc: ''
  });
  const [loading, setLoading] = useState(true);
  
  // Detail panel states
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailTab, setDetailTab] = useState('preview'); // 'preview' or 'recipients'
  const [previewGender, setPreviewGender] = useState('men');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load applications
      const { data: appsData, error: appsError } = await supabase
        .from('cra_applications')
        .select('*')
        .eq('org_id', orgId);
      
      if (appsError) throw appsError;
      setApplications(appsData || []);

      // Load email config
      const { data: emailData, error: emailError } = await supabase
        .from('cra_email_lists')
        .select('*')
        .eq('org_id', orgId);
      
      if (emailError) throw emailError;

      if (emailData) {
        const lists = {
          rector_men: emailData.find(d => d.list_name === 'rector_men')?.emails || [],
          rector_women: emailData.find(d => d.list_name === 'rector_women')?.emails || [],
          prayer_men: emailData.find(d => d.list_name === 'prayer_men')?.emails || [],
          prayer_women: emailData.find(d => d.list_name === 'prayer_women')?.emails || [],
          dorm_men: emailData.find(d => d.list_name === 'dorm_men')?.emails || [],
          dorm_women: emailData.find(d => d.list_name === 'dorm_women')?.emails || [],
          kitchen_men: emailData.find(d => d.list_name === 'kitchen_men')?.emails || [],
          kitchen_women: emailData.find(d => d.list_name === 'kitchen_women')?.emails || []
        };
        setEmailLists(lists);

        const settings = emailData.find(d => d.list_name === 'settings')?.emails || {};
        setEmailSettings({
          from_name: settings.from_name || '',
          from_email: settings.from_email || '',
          reply_to: settings.reply_to || '',
          bcc: settings.bcc || ''
        });
      }
    } catch (error) {
      console.error('Error loading email reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetailPanel = (type) => {
    setSelectedReport(type);
    setDetailTab('preview');
  };

  const closeDetailPanel = () => {
    setSelectedReport(null);
    setNewRecipientEmail('');
  };

  const addRecipient = async () => {
    const email = newRecipientEmail.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    const listName = `${selectedReport}_${previewGender}`;
    const updatedList = [...emailLists[listName], email];

    try {
      const { error } = await supabase
        .from('cra_email_lists')
        .upsert({
          org_id: orgId,
          list_name: listName,
          emails: updatedList
        }, { onConflict: 'org_id,list_name' });

      if (error) throw error;

      setEmailLists(prev => ({ ...prev, [listName]: updatedList }));
      setNewRecipientEmail('');
    } catch (error) {
      console.error('Error adding recipient:', error);
      alert('Failed to add recipient.');
    }
  };

  const deleteRecipient = async (email) => {
    const listName = `${selectedReport}_${previewGender}`;
    const updatedList = emailLists[listName].filter(e => e !== email);

    try {
      const { error } = await supabase
        .from('cra_email_lists')
        .upsert({
          org_id: orgId,
          list_name: listName,
          emails: updatedList
        }, { onConflict: 'org_id,list_name' });

      if (error) throw error;

      setEmailLists(prev => ({ ...prev, [listName]: updatedList }));
    } catch (error) {
      console.error('Error deleting recipient:', error);
      alert('Failed to delete recipient.');
    }
  };


  const quickAddRole = async (role, gender) => {
    try {
      // Step 1: Get current weekend identifier for this org
      const tableName = gender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
      const rawTableName = gender === 'men' ? 'men_raw' : 'women_raw';
      
      const { data: rosterData, error: rosterError } = await supabase
        .from(tableName)
        .select('weekend_identifier')
        .eq('org_id', orgId)
        .limit(1);

      if (rosterError) throw rosterError;

      if (!rosterData || rosterData.length === 0) {
        if (window.showMainStatus) {
          window.showMainStatus(`No active weekend found for ${gender}. Please set up a team roster first.`, true);
        }
        return;
      }

      const currentWeekend = rosterData[0].weekend_identifier;

      // Step 2: Find people with this role in current weekend
      const { data: roleData, error: roleError } = await supabase
        .from(tableName)
        .select('pescadore_key')
        .eq('org_id', orgId)
        .eq('weekend_identifier', currentWeekend)
        .eq('role', role);

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        if (window.showMainStatus) {
          window.showMainStatus(`No ${role} assigned for current ${gender} weekend`, true);
        }
        return;
      }

      // Step 3: Get emails from men_raw/women_raw
      const pescadoreKeys = roleData.map(r => r.pescadore_key);
      const { data: emailData, error: emailError } = await supabase
        .from(rawTableName)
        .select('Email')
        .in('PescadoreKey', pescadoreKeys)
        .eq('org_id', orgId);

      if (emailError) throw emailError;

      if (!emailData || emailData.length === 0) {
        if (window.showMainStatus) {
          window.showMainStatus(`No email found for ${role}`, true);
        }
        return;
      }

      // Step 4: Get current list from database (not state - to ensure fresh data)
      const newEmails = emailData.map(e => e.Email).filter(e => e && e.trim());
      const listName = `${selectedReport}_${gender}`;
      
      const { data: existingList, error: listError } = await supabase
        .from('cra_email_lists')
        .select('emails')
        .eq('org_id', orgId)
        .eq('list_name', listName)
        .maybeSingle();

      if (listError) throw listError;

      const currentList = existingList?.emails || [];
      const updatedList = [...new Set([...currentList, ...newEmails])]; // Remove duplicates

      // Step 5: Save to database
      const { error: saveError } = await supabase
        .from('cra_email_lists')
        .upsert({
          org_id: orgId,
          list_name: listName,
          emails: updatedList
        }, { onConflict: 'org_id,list_name' });

      if (saveError) throw saveError;

      setEmailLists(prev => ({ ...prev, [listName]: updatedList }));
      
      const addedCount = updatedList.length - currentList.length;
      if (addedCount > 0) {
        if (window.showMainStatus) {
          window.showMainStatus(`Added ${addedCount} email(s) for ${role}`, false);
        }
      } else {
        if (window.showMainStatus) {
          window.showMainStatus(`${role} email(s) already in list`, false);
        }
      }
    } catch (error) {
      console.error('Error in quickAddRole:', error);
      if (window.showMainStatus) {
        window.showMainStatus(`Failed to add ${role} email`, true);
      }
    }
  };
  const sendReport = async () => {
    const listName = `${selectedReport}_${previewGender}`;
    const recipients = emailLists[listName];
    if (!recipients || recipients.length === 0) {
      alert('No recipients configured. Please add recipients first.');
      return;
    }

    const confirmed = window.confirm(
      `Send ${selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} Report to ${recipients.length} recipient(s)?`
    );

    if (!confirmed) return;

    setSending(true);
    try {
      const apps = applications.filter(app => 
        (previewGender === 'men' && app.m_first) || (previewGender === 'women' && app.f_first)
      );

      if (apps.length === 0) {
        alert(`No ${previewGender} candidates for this report.`);
        setSending(false);
        return;
      }

      const { html, title } = generateReportHTML(selectedReport, previewGender, apps);

      const { error } = await supabase.functions.invoke('send-custom-report', {
        body: { 
          recipients, 
          subject: title, 
          htmlContent: html,
          fromName: emailSettings.from_name,
          replyTo: emailSettings.reply_to,
          bcc: emailSettings.bcc
        }
      });

      if (error) throw error;

      alert('Report sent successfully!');
    } catch (error) {
      console.error('Error sending report:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const saveEmailSettings = async () => {
    try {
      const { error } = await supabase
        .from('cra_email_lists')
        .upsert({
          org_id: orgId,
          list_name: 'settings',
          emails: emailSettings
        }, { onConflict: 'org_id,list_name' });

      if (error) throw error;

      alert('Email settings saved successfully!');
    } catch (error) {
      console.error('Error saving email settings:', error);
      alert('Failed to save email settings.');
    }
  };

  const generateReportHTML = (type, gender, apps) => {
    const genderText = gender.charAt(0).toUpperCase() + gender.slice(1);
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Inline styles matching the original exactly
    const styles = {
      container: `style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; color: #333; padding: 24px; margin: 0;"`,
      card: `style="background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 12px; padding: 24px; max-width: 600px; margin: auto;"`,
      header: `style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 20px;"`,
      title: `style="font-size: 1.5rem; font-weight: 700; color: #212529; margin: 0;"`,
      subtitle: `style="font-size: .9rem; color: #6c757d; margin-top: 4px;"`,
      statCard: `style="background-color: #f8f9fa; border: 1px solid #eee; border-radius: 12px; padding: 16px; text-align: center;"`,
      statValue: `style="font-size: 2rem; font-weight: 700; color: #00a3ff;"`,
      statLabel: `style="font-size: .85rem; color: #6c757d; margin-top: 4px;"`,
      sectionTitle: `style="font-size: 1rem; font-weight: 900; border-bottom: 2px solid #00a3ff; padding-bottom: 10px; margin-bottom: 14px;"`,
      table: `style="width: 100%; border-collapse: collapse; font-size: .9rem;"`,
      th: `style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: left; font-weight: 700;"`,
      td: `style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: left;"`,
      ul: `style="list-style: disc; padding-left: 20px; margin: 0;"`,
      li: `style="margin-bottom: 8px;"`
    };

    let reportTitle = '';
    let reportBody = '';

    if (type === 'rector') {
      reportTitle = `${genderText}'s Rector Report`;
      const rows = apps.map(app => {
        const prefix = gender === 'men' ? 'm_' : 'f_';
        const name = `${app[prefix + 'pref'] || app[prefix + 'first']} ${app.c_lastname}`;
        const church = app[prefix + 'church'] || 'N/A';
        const phone = app[prefix + 'cell'] || 'N/A';
        const email = app[prefix + 'email'] || 'N/A';
        return `<tr><td ${styles.td}>${name}</td><td ${styles.td}>${church}</td><td ${styles.td}>${phone}</td><td ${styles.td}>${email}</td></tr>`;
      }).join('');

      reportBody = `
        <div ${styles.header}><h3 ${styles.title}>${reportTitle}</h3><p ${styles.subtitle}>Generated on ${date}</p></div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td align="center">
              <div ${styles.statCard} style="max-width: 280px; margin: auto;"><div ${styles.statValue}>${apps.length}</div><div ${styles.statLabel}>Total Candidates</div></div>
            </td>
          </tr>
        </table>
        <div ${styles.sectionTitle}>Candidate Roster</div>
        <table ${styles.table}>
          <thead><tr><th ${styles.th}>Name</th><th ${styles.th}>Church</th><th ${styles.th}>Phone</th><th ${styles.th}>Email</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } else if (type === 'prayer') {
      reportTitle = `${genderText}'s Prayer Team Report`;
      const rows = apps.map(app => {
        const prefix = gender === 'men' ? 'm_' : 'f_';
        const name = `${app[prefix + 'pref'] || app[prefix + 'first']} ${app.c_lastname}`;
        const church = app[prefix + 'church'] || 'N/A';
        return `<tr><td ${styles.td}>${name}</td><td ${styles.td}>${church}</td></tr>`;
      }).join('');

      reportBody = `
        <div ${styles.header}><h3 ${styles.title}>${reportTitle}</h3><p ${styles.subtitle}>Generated on ${date}</p></div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td align="center">
              <div ${styles.statCard} style="max-width: 280px; margin: auto;"><div ${styles.statValue}>${apps.length}</div><div ${styles.statLabel}>Total Candidates</div></div>
            </td>
          </tr>
        </table>
        <div ${styles.sectionTitle}>Please pray for these candidates</div>
        <table ${styles.table}>
          <thead><tr><th ${styles.th}>Name</th><th ${styles.th}>Church</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } else if (type === 'dorm') {
      reportTitle = `${genderText}'s Dorm Team Report`;
      const smokerCount = apps.filter(app => {
        const prefix = gender === 'men' ? 'm_' : 'f_';
        return app[prefix + 'smoker'];
      }).length;

      const rows = apps.map(app => {
        const prefix = gender === 'men' ? 'm_' : 'f_';
        const name = `${app[prefix + 'pref'] || app[prefix + 'first']} ${app.c_lastname}`;
        const smoker = app[prefix + 'smoker'] ? 'YES' : 'No';
        return `<tr><td ${styles.td}>${name}</td><td ${styles.td} style="text-align: center;">${smoker}</td></tr>`;
      }).join('');

      reportBody = `
        <div ${styles.header}><h3 ${styles.title}>${reportTitle}</h3><p ${styles.subtitle}>Generated on ${date}</p></div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td align="center" style="padding-right: 8px;">
              <div ${styles.statCard}><div ${styles.statValue}>${apps.length}</div><div ${styles.statLabel}>Total Candidates</div></div>
            </td>
            <td align="center" style="padding-left: 8px;">
              <div ${styles.statCard}><div ${styles.statValue}>${smokerCount}</div><div ${styles.statLabel}>Smokers</div></div>
            </td>
          </tr>
        </table>
        <div ${styles.sectionTitle}>Dorm Roster & Needs</div>
        <table ${styles.table}>
          <thead><tr><th ${styles.th}>Name</th><th ${styles.th} style="text-align: center;">Smoker?</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } else if (type === 'kitchen') {
      reportTitle = `${genderText}'s Kitchen Report`;
      const dietNeeds = apps.filter(app => {
        const prefix = gender === 'men' ? 'm_' : 'f_';
        return app[prefix + 'diet'];
      });

      const dietList = dietNeeds.length > 0
        ? `<ul ${styles.ul}>${dietNeeds.map(app => {
            const prefix = gender === 'men' ? 'm_' : 'f_';
            return `<li ${styles.li}>${app[prefix + 'diet_details'] || 'Special diet requested (no details provided)'}</li>`;
          }).join('')}</ul>`
        : '<p>No special dietary needs reported.</p>';

      reportBody = `
        <div ${styles.header}><h3 ${styles.title}>${reportTitle}</h3><p ${styles.subtitle}>Generated on ${date}</p></div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td align="center" style="padding-right: 8px;">
              <div ${styles.statCard}><div ${styles.statValue}>${apps.length}</div><div ${styles.statLabel}>Total Headcount</div></div>
            </td>
            <td align="center" style="padding-left: 8px;">
              <div ${styles.statCard}><div ${styles.statValue}>${dietNeeds.length}</div><div ${styles.statLabel}>Special Diets</div></div>
            </td>
          </tr>
        </table>
        <div ${styles.sectionTitle}>Special Dietary Needs</div>
        ${dietList}
      `;
    }

    // Wrap in container and card exactly like original
    const finalHTML = `<div ${styles.container}><div ${styles.card}>${reportBody}</div></div>`;

    return { html: finalHTML, title: reportTitle };
  };

  if (loading) {
    return (
      <section id="cra-email" className="app-panel" style={{ display: 'block' }}>
        <div className="container">
          <div className="loading">Loading email reports...</div>
        </div>
      </section>
    );
  }

  const reports = [
    { type: 'rector', title: 'Rector Report', data: 'Name, Church, Phone, Email' },
    { type: 'prayer', title: 'Prayer Team Report', data: 'Name, Church' },
    { type: 'dorm', title: 'Dorm Team Report', data: 'Name, Smoker Status' },
    { type: 'kitchen', title: 'Kitchen Report', data: 'Headcount, Dietary Needs' }
  ];

  return (
    <section id="cra-email" className="app-panel" style={{ display: 'block' }}>
      <div className="main-container" style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 1fr' : '1fr', transition: 'grid-template-columns 0.3s ease' }}>
        
        {/* LEFT PANEL - Main Content */}
        <div className="list-container" style={{ overflowY: 'auto', padding: '0 24px 0 0' }}>
          <div className="card pad" style={{ marginBottom: '16px' }}>

            <div className="section-title">Team Email Reports</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Data</th>
                  <th>Recipients</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody id="emailReportsTbody">
                {reports.map(report => (
                  <tr key={report.type}>
                    <td><strong>{report.title}</strong></td>
                    <td>{report.data}</td>
                    <td>{(emailLists[`${report.type}_men`]?.length || 0) + (emailLists[`${report.type}_women`]?.length || 0)} total</td>
                    <td className="actions-cell">
                      <button 
                        className="btn btn-small btn-primary" 
                        onClick={() => openDetailPanel(report.type)}
                      >
                        View/Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card pad">
            <div className="section-title">Email Settings</div>
            <div className="grid grid-2">
              <div className="field">
                <label className="label">From Name</label>
                <input 
                  className="input" 
                  placeholder="e.g., Tres Dias of St. Louis"
                  value={emailSettings.from_name}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))}
                />
                <small style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Emails will be sent from: {emailSettings.from_name || 'Team Tools Pro Reports'} &lt;reports@teamtoolspro.com&gt;
                </small>
              </div>
              <div className="field">
                <label className="label">From Email (Fixed)</label>
                <input 
                  className="input" 
                  type="email"
                  value="reports@teamtoolspro.com"
                  disabled
                  style={{ backgroundColor: 'var(--bg)', cursor: 'not-allowed' }}
                />
                <small style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  All reports sent from verified domain
                </small>
              </div>
              <div className="field">
                <label className="label">Reply-To</label>
                <input 
                  className="input" 
                  type="email"
                  value={emailSettings.reply_to}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, reply_to: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">BCC</label>
                <input 
                  className="input" 
                  value={emailSettings.bcc}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, bcc: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn" onClick={loadData}>Reset</button>
              <button className="btn btn-primary" onClick={saveEmailSettings}>Save Settings</button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Detail View */}
        {selectedReport && (
          <div className="detail-panel card pad" style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '0 24px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  {selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} Report
                </h3>
                <button className="btn btn-small" onClick={closeDetailPanel}>✕ Close</button>
              </div>

              {/* Gender Toggle - Persistent across all tabs */}
              <div style={{ marginBottom: '16px' }}>
                <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
                  Managing {previewGender === 'men' ? "Men's" : "Women's"} List
                </label>
                <div className="toggle" style={{ maxWidth: '250px' }}>
                  <div 
                    className={`opt ${previewGender === 'men' ? 'active' : ''}`}
                    onClick={() => setPreviewGender('men')}
                  >
                    Men
                  </div>
                  <div 
                    className={`opt ${previewGender === 'women' ? 'active' : ''}`}
                    onClick={() => setPreviewGender('women')}
                  >
                    Women
                  </div>
                </div>
              </div>

              {/* Tab Toggle */}
              <div className="toggle" style={{ maxWidth: '100%' }}>
                <div 
                  className={`opt ${detailTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setDetailTab('preview')}
                >
                  Preview Report
                </div>
                <div 
                  className={`opt ${detailTab === 'recipients' ? 'active' : ''}`}
                  onClick={() => setDetailTab('recipients')}
                >
                  Manage Recipients
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              {detailTab === 'preview' ? (
                <>


                  <div 
                    id="report-preview-content-wrapper"
                    style={{ 
                      minHeight: '300px'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: generateReportHTML(
                        selectedReport,
                        previewGender,
                        applications.filter(app => 
                          (previewGender === 'men' && app.m_first) || 
                          (previewGender === 'women' && app.f_first)
                        )
                      ).html
                    }}
                  />

                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%' }}
                      onClick={sendReport}
                      disabled={sending}
                    >
                      {sending ? 'Sending...' : 'Send Report'}
                    </button>
                  </div>
                </>
              ) : (
                <>

                  {/* Quick Add Buttons */}
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <label className="label">Quick Add Team Emails</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {selectedReport === 'rector' && (
                        <>
                          <button className="btn btn-small" onClick={() => quickAddRole('Rector', previewGender)}>
                            + Rector
                          </button>
                          <button className="btn btn-small" onClick={() => quickAddRole('Head', previewGender)}>
                            + Head
                          </button>
                          <button className="btn btn-small" onClick={() => quickAddRole('Asst Head', previewGender)}>
                            + Asst Head
                          </button>
                        </>
                      )}
                      {selectedReport === 'kitchen' && (
                        <>
                          <button className="btn btn-small" onClick={() => quickAddRole('Head Kitchen', previewGender)}>
                            + Head Kitchen
                          </button>
                          <button className="btn btn-small" onClick={() => quickAddRole('Asst Head Kitchen', previewGender)}>
                            + Asst Head Kitchen
                          </button>
                        </>
                      )}
                      {selectedReport === 'prayer' && (
                        <button className="btn btn-small" onClick={() => quickAddRole('Head Prayer', previewGender)}>
                          + Head Prayer
                        </button>
                      )}
                      {selectedReport === 'dorm' && (
                        <button className="btn btn-small" onClick={() => quickAddRole('Head Dorm', previewGender)}>
                          + Head Dorm
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Current Recipients ({emailLists[`${selectedReport}_${previewGender}`]?.length || 0})</label>
                    <div id="recipientListContainer" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {emailLists[`${selectedReport}_${previewGender}`]?.length === 0 ? (
                        <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No recipients added yet.</span>
                      ) : (
                        emailLists[`${selectedReport}_${previewGender}`]?.map(email => (
                          <span key={email} className="payment-badge" style={{ background: 'rgba(0, 163, 255, 0.2)', color: 'var(--ink)', textTransform: 'none' }}>
                            {email}
                            <button 
                              className="remove-payment-btn" 
                              title="Remove recipient"
                              onClick={() => deleteRecipient(email)}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Add New Recipient</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input 
                        className="input" 
                        type="email" 
                        placeholder="enter email address"
                        value={newRecipientEmail}
                        onChange={(e) => setNewRecipientEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                      />
                      <button className="btn btn-primary" onClick={addRecipient}>Add</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}