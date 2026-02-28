import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import { useState, useEffect } from 'react';
import outputs from '../amplify_outputs.json';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import MainLayout from './components/MainLayout';
import DepartmentRole from './pages/DepartmentRole';
import SystemUsers from './pages/SystemUsers';
import PasswordReset from './pages/PasswordReset';
import { injectForgotPasswordLink } from './utils/authHelper';
// Import other page components as needed

// 🔒 LOCKED: Force frontend to use the default production user pool
// This prevents Amplify from switching pools when sandbox rebuilds
const lockedConfig = {
  ...outputs,
  auth: {
    ...outputs.auth,
    user_pool_id: 'ap-southeast-1_KpgCf5P7L',
    user_pool_client_id: '2pup0lmfmhrauh86tbosv6me5f',
  }
};

Amplify.configure(lockedConfig);

// ⚠️ TEMPORARY DEV BYPASS - Set to false to re-enable Cognito authentication
const DEV_BYPASS_AUTH = false;

export default function App() {
  const [currentPage, setCurrentPage] = useState('overview');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  // Check if password reset was requested via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset-password') === 'true') {
      setShowPasswordReset(true);
    }
  }, []);

  // Inject forgot password link after a short delay to ensure form is rendered
  useEffect(() => {
    if (!showPasswordReset && !DEV_BYPASS_AUTH) {
      const timer = setTimeout(() => {
        injectForgotPasswordLink();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showPasswordReset]);

  if (showPasswordReset) {
    return (
      <div>
        <PasswordReset />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-value">24</div>
              <div className="stat-label">Active Job Orders</div>
              <div className="stat-change">↑ 12% from yesterday</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔧</div>
              <div className="stat-value">8</div>
              <div className="stat-label">In Progress</div>
              <div className="stat-change">↑ 5% from yesterday</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✓</div>
              <div className="stat-value">12</div>
              <div className="stat-label">Pending Quality Check</div>
              <div className="stat-change negative">↓ 3% from yesterday</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value">$4,250</div>
              <div className="stat-label">Today's Revenue</div>
              <div className="stat-change">↑ 18% from yesterday</div>
            </div>
          </div>
        );
      case 'department-role':
        return <DepartmentRole />;
      case 'system-users':
        return <SystemUsers />;
      // Add other cases for different pages
      default:
        return (
          <div className="content-card">
            <div className="card-header">
              <h2>Page Content</h2>
              <span className="badge">Coming Soon</span>
            </div>
            <p>This page is under development.</p>
          </div>
        );
    }
  };

  // ⚠️ TEMPORARY: Bypass authentication for development
  if (DEV_BYPASS_AUTH) {
    return (
      <MainLayout 
        onLogout={() => { window.location.reload(); }} 
        user={{
          username: 'mohdhaggo@gmail.com',
          role: 'Admin (Dev Bypass)'
        }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      >
        {renderPage()}
      </MainLayout>
    );
  }

  return (
    <Authenticator hideSignUp>
      {({ signOut, user }) => (
        <MainLayout 
          onLogout={signOut || (() => {})} 
          user={{
            username: user?.signInDetails?.loginId || 'User',
            role: 'Authenticated User'
          }}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        >
          {renderPage()}
        </MainLayout>
      )}
    </Authenticator>
  );
}