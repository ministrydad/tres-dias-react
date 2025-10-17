import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ currentView, onNavigate, permissions }) {
  const { logout, user, isSuperAdmin } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const hasPermission = (key) => {
    if (!permissions) return true;
    return permissions[key] === true;
  };

  const toggleSubmenu = (menuKey) => {
    setOpenSubmenu(openSubmenu === menuKey ? null : menuKey);
  };

  const handleRefresh = () => {
    // Trigger a page reload to refresh current view
    window.location.reload();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img className="logo-icon" src="/rooster_head_v1.svg" alt="Logo" />
        <span className="company-name">{user?.organization?.name || 'Tres Dias'}</span>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
        <ul className="sidebar-nav">
          {hasPermission('team-viewer-app') && (
            <li className={`nav-item has-submenu ${openSubmenu === 'directory' ? 'open' : ''}`}>
              <a 
                href="#" 
                className={currentView === 'directory' || currentView === 'team-list' ? 'active' : ''}
                onClick={(e) => { 
                  e.preventDefault(); 
                  toggleSubmenu('directory');
                  onNavigate('directory'); 
                }}
              >
                <span className="nav-text">Directory</span>
              </a>
              <ul className="submenu">
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'team-list' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('team-list'); 
                    }}
                  >
                    Team List
                  </a>
                </li>
              </ul>
            </li>
          )}

          {/* Team Meetings Menu */}
          {hasPermission('meeting-check-in-app') && (
            <li className={`nav-item has-submenu ${openSubmenu === 'mci' ? 'open' : ''}`} id="mci-nav-parent">
              <a 
                href="#" 
                className={currentView.startsWith('mci-') ? 'active' : ''}
                onClick={(e) => { 
                  e.preventDefault(); 
                  toggleSubmenu('mci');
                }}
              >
                <span className="nav-text">Team Meetings</span>
              </a>
              <ul className="submenu">
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'mci-checkin' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('mci-checkin'); 
                    }}
                  >
                    Check-In
                  </a>
                </li>
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'mci-reports' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('mci-reports'); 
                    }}
                  >
                    Reports
                  </a>
                </li>
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'mci-budget' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('mci-budget'); 
                    }}
                  >
                    Budget
                  </a>
                </li>
              </ul>
            </li>
          )}

          {hasPermission('candidate-registration') && (
            <li className={`nav-item has-submenu ${openSubmenu === 'cra' ? 'open' : ''}`}>
              <a 
                href="#" 
                className={currentView.startsWith('cra-') ? 'active' : ''}
                onClick={(e) => { 
                  e.preventDefault(); 
                  toggleSubmenu('cra');
                }}
              >
                <span className="nav-text">Candidate Registration</span>
              </a>
              <ul className="submenu">
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'cra-new-application' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('cra-new-application'); 
                    }}
                  >
                    New Application
                  </a>
                </li>
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'cra-followup' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('cra-followup'); 
                    }}
                  >
                    Follow-up Calls
                  </a>
                </li>
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'cra-view-roster' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('cra-view-roster'); 
                    }}
                  >
                    View Roster
                  </a>
                </li>
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'cra-checkin' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('cra-checkin'); 
                    }}
                  >
                    Live Check-in
                  </a>
                </li>
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'cra-reports' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('cra-reports'); 
                    }}
                  >
                    Reports
                  </a>
                </li>
                <li className="submenu-item">
                  <a 
                    href="#" 
                    className={currentView === 'cra-email' ? 'active' : ''}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      onNavigate('cra-email'); 
                    }}
                  >
                    Email Reports
                  </a>
                </li>
              </ul>
            </li>
          )}

          {hasPermission('secretariat-app') && (
            <li className="nav-item">
              <a 
                href="#" 
                className={currentView === 'secretariat' ? 'active' : ''}
                onClick={(e) => { 
                  e.preventDefault(); 
                  onNavigate('secretariat'); 
                }}
              >
                <span className="nav-text">Secretariat</span>
              </a>
            </li>
          )}
        </ul>
        
        <div className="sidebar-footer">
          <div 
            id="userProfileWidget" 
            style={{ 
              display: user ? 'block' : 'none', 
              paddingBottom: '12px', 
              marginBottom: '12px', 
              borderBottom: '1px solid var(--border)', 
              textAlign: 'center' 
            }}
          >
            <span 
              id="loggedInUserName" 
              style={{ 
                fontWeight: 700, 
                fontSize: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              {isSuperAdmin ? (
                <>
                  Welcome,&nbsp;<span className="super-admin-glow">
                    {user?.display_name || (user?.full_name ? user.full_name.split(' ')[0] : 'Admin')}
                  </span>
                </>
              ) : (
                `Welcome, ${user?.display_name || (user?.full_name ? user.full_name.split(' ')[0] : 'User')}`
              )}
            </span>
          </div>
          
          <ul className="sidebar-nav">
            <li className="nav-item">
              <a 
                href="#" 
                className={currentView === 'account' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); onNavigate('account'); }}
              >
                <span className="nav-text">Account</span>
              </a>
            </li>
            
            <li className="nav-item">
              <a 
                href="#" 
                className={currentView === 'app-settings' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); onNavigate('app-settings'); }}
              >
                <span className="nav-text">Settings</span>
              </a>
            </li>

            {/* Super Admin Link - Only shows if user is Super Admin */}
            {isSuperAdmin && (
              <li className="nav-item" id="superAdminLink">
                <a 
                  href="#" 
                  className={currentView === 'super-admin' ? 'active' : ''}
                  onClick={(e) => { e.preventDefault(); onNavigate('super-admin'); }}
                >
                  <span className="nav-text">Super Admin</span>
                </a>
              </li>
            )}
            
            <li className="nav-item">
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); logout(); }}
              >
                <span className="nav-text" style={{ color: 'var(--accentD)' }}>Log Out</span>
              </a>
            </li>
          </ul>
          
          {/* Universal Refresh Button - Unassuming, refreshes current view */}
          <div 
            style={{ 
              textAlign: 'center', 
              paddingTop: '12px', 
              marginTop: '12px', 
              borderTop: '1px solid var(--border)' 
            }}
          >
            <button
              onClick={handleRefresh}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'color 0.2s, background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--ink)';
                e.target.style.backgroundColor = 'var(--bg)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--muted)';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              Refresh
            </button>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            fontSize: '0.75rem', 
            color: 'var(--muted)', 
            paddingTop: '8px'
          }}>
            Version <span>2.0.0.17</span>
          </div>
        </div>
      </nav>
    </aside>
  );
}