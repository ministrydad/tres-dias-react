// src/App.jsx
// FIXED: Moved PescadoresProvider to top level to prevent loading issues
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PescadoresProvider } from './context/PescadoresContext';
import LoginPage from './components/auth/LoginPage';
import Sidebar from './components/layout/Sidebar';
import Directory from './modules/TeamViewer/Directory';
import TeamList from './modules/TeamViewer/TeamList';
import ViewRoster from './modules/CRA/ViewRoster';
import FollowUpCalls from './modules/CRA/FollowUpCalls';
import LiveCheckIn from './modules/CRA/LiveCheckIn';
import Reports from './modules/CRA/Reports';
import AccountSettings from './modules/Account/AccountSettings';
import SecretariatDashboard from './modules/Secretariat/SecretariatDashboard';
import AppSettings from './modules/Settings/AppSettings';
import SuperAdmin from './modules/SuperAdmin/SuperAdmin';
import NewApplication from './modules/CRA/NewApplication';
import EmailReports from './modules/CRA/EmailReports';
import CheckIn from './modules/TeamMeetings/CheckIn';
import MCIReports from './modules/TeamMeetings/Reports';
import Budget from './modules/TeamMeetings/Budget';
import ConfirmModal from './components/common/ConfirmModal';
import ChangelogModal from './components/common/ChangelogModal';
import { MainStatusBar } from './components/common/StatusBar';
import './styles/globals.css';

function Dashboard() {
  const { user, orgId, permissions } = useAuth();
  const [currentView, setCurrentView] = useState('directory');
  const [editingAppId, setEditingAppId] = useState(null);
  const [showChangelog, setShowChangelog] = useState(false);

  // Handle MCI Check-In initialization (matching original script.js behavior)
  useEffect(() => {
    if (currentView === 'mci-checkin') {
      setTimeout(() => {
        const mciControls = document.getElementById('mciControls');
        if (mciControls) {
          mciControls.style.display = 'flex';
        }

        const menToggleOption = document.querySelector('#mciGenderToggle .opt[data-gender="men"]');
        if (menToggleOption && window.MCI) {
          window.MCI.selectGender('men', menToggleOption);
        }
      }, 100);
    }
  }, [currentView]);

  // Clear editingAppId when switching away from new-application view
  useEffect(() => {
    if (currentView !== 'cra-new-application') {
      setEditingAppId(null);
    }
  }, [currentView]);

  // Enhanced navigation handler that accepts options
  const handleNavigate = (view, options = {}) => {
    setCurrentView(view);
    
    if (options.editingAppId) {
      setEditingAppId(options.editingAppId);
    }
  };

  const getViewTitle = () => {
    switch(currentView) {
      case 'directory': return 'Directory';
      case 'team-list': return 'Team List';
      case 'mci-checkin': return 'Team Meetings - Check-In';
      case 'mci-reports': return 'Team Meetings - Reports';
      case 'mci-budget': return 'Team Meetings - Budget';
      case 'cra-view-roster': return 'Candidate Registration - View Roster';
      case 'cra-followup': return 'Candidate Registration - Follow-up Calls';
      case 'cra-checkin': return 'Candidate Registration - Live Check-in';
      case 'cra-reports': return 'Candidate Registration - Reports';
      case 'cra-new-application': return editingAppId ? 'Candidate Registration - Edit Application' : 'Candidate Registration - New Application';
      case 'cra-email': return 'Candidate Registration - Email Reports';
      case 'account': return 'Account Settings';
      case 'secretariat': return 'Secretariat';
      case 'app-settings': return 'App Settings';
      case 'super-admin': return 'Super Admin';
      default: return 'Dashboard';
    }
  };

  const renderView = () => {
    console.log('🔍 Current view:', currentView, 'Editing ID:', editingAppId);
    switch(currentView) {
      case 'directory':
        return <Directory />;
      case 'team-list':
        return <TeamList />;
      case 'cra-view-roster':
        return <ViewRoster onNavigate={handleNavigate} />;
      case 'cra-followup':
        return <FollowUpCalls />;
      case 'cra-checkin':
        return <LiveCheckIn />;
      case 'cra-reports':
        return <Reports />;
      case 'cra-new-application':
        return <NewApplication editingAppId={editingAppId} onNavigate={handleNavigate} />;
      case 'cra-email':
        return <EmailReports />;
      case 'account':
        return <AccountSettings />;
      case 'secretariat':
        return <SecretariatDashboard />;
      case 'app-settings':
        return <AppSettings />;
      case 'super-admin':
        return <SuperAdmin />;
      case 'mci-checkin':
        return <CheckIn />;
      case 'mci-reports':
        return <MCIReports />;
      case 'mci-budget':
        return <Budget />;
      default:
        return (
          <div className="app-panel" style={{ display: 'block', padding: '30px' }}>
            <div className="card pad">
              <h2>{getViewTitle()}</h2>
              <p>This module will be converted soon!</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex' }}>
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate}
        permissions={permissions}
        onOpenChangelog={() => setShowChangelog(true)}
      />
      
      <main className="main-content">
        <MainStatusBar />
        <ConfirmModal />
        <ChangelogModal 
          isOpen={showChangelog}
          onClose={() => setShowChangelog(false)}
        />
       
        <div className="main-header">
          <h1 id="app-title">{getViewTitle()}</h1>
        </div>

        <div className="app-panel-container">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '24px',
        fontFamily: 'Source Sans Pro, sans-serif'
      }}>
        <div className="progress-bar-container">
          <div className="progress-bar-label">Loading...</div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <PescadoresProvider>
        <AppContent />
      </PescadoresProvider>
    </AuthProvider>
  );
}