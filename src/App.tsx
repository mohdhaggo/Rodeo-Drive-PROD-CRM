import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import { useState } from 'react';
import outputs from '../amplify_outputs.json';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import MainLayout from './components/MainLayout';
import DepartmentRole from './pages/DepartmentRole';
import SystemUsers from './pages/SystemUsers';
// Import other page components as needed

Amplify.configure(outputs);

export default function App() {
  const [currentPage, setCurrentPage] = useState('overview');

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