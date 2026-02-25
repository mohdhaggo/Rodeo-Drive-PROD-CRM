import React, { useState } from 'react';
import DepartmentRole from '../pages/DepartmentRole';
import '../styles/MainLayout.css';
import logo from '../assets/logo.svg';

// Icons as components (you can replace with your preferred icon library)
const Icons = {
  Dashboard: () => <span className="icon">📊</span>,
  JobOrders: () => <span className="icon">📋</span>,
  Inspection: () => <span className="icon">🔍</span>,
  ServiceExecution: () => <span className="icon">⚙️</span>,
  QualityCheck: () => <span className="icon">✓</span>,
  PaymentInvoice: () => <span className="icon">💰</span>,
  ExitPermit: () => <span className="icon">🚪</span>,
  JobHistory: () => <span className="icon">📅</span>,
  Customers: () => <span className="icon">👥</span>,
  Vehicles: () => <span className="icon">🚗</span>,
  DepartmentRole: () => <span className="icon">🏢</span>,
  SystemUsers: () => <span className="icon">👤</span>,
  UserRoleAccess: () => <span className="icon">🔐</span>,
  Logout: () => <span className="icon">🚪</span>,
  Filter: () => <span className="icon">📅</span>,
  Add: () => <span className="icon">➕</span>,
};

interface NavItem {
  id: string;
  label: string;
  icon: keyof typeof Icons;
  section: 'main' | 'finance' | 'management' | 'admin';
}

interface MainLayoutProps {
  onLogout: () => void;
  user?: {
    username?: string;
    role?: string;
    avatar?: string;
  };
  children?: React.ReactNode;
}

const navItems: NavItem[] = [
  // Main section
  { id: 'overview', label: 'Overview', icon: 'Dashboard', section: 'main' },
  { id: 'job-orders', label: 'Job Orders', icon: 'JobOrders', section: 'main' },
  { id: 'inspection', label: 'Inspection', icon: 'Inspection', section: 'main' },
  { id: 'service-execution', label: 'Service Execution', icon: 'ServiceExecution', section: 'main' },
  { id: 'quality-check', label: 'Quality Check', icon: 'QualityCheck', section: 'main' },
  
  // Finance section
  { id: 'payment-invoice', label: 'Payment & Invoice', icon: 'PaymentInvoice', section: 'finance' },
  { id: 'exit-permit', label: 'Exit Permit', icon: 'ExitPermit', section: 'finance' },
  
  // Management section
  { id: 'job-history', label: 'Job History', icon: 'JobHistory', section: 'management' },
  { id: 'customers', label: 'Customers', icon: 'Customers', section: 'management' },
  { id: 'vehicles', label: 'Vehicles', icon: 'Vehicles', section: 'management' },
  
  // Admin section
  { id: 'department-role', label: 'Department & Role', icon: 'DepartmentRole', section: 'admin' },
  { id: 'system-users', label: 'System Users', icon: 'SystemUsers', section: 'admin' },
  { id: 'user-role-access', label: 'User Role Access', icon: 'UserRoleAccess', section: 'admin' },
];

const sectionTitles = {
  main: 'MAIN',
  finance: 'FINANCE',
  management: 'MANAGEMENT',
  admin: 'ADMIN',
};

export const MainLayout: React.FC<MainLayoutProps> = ({ onLogout, user, children }) => {
  const [currentPage, setCurrentPage] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getInitials = (name: string = 'User') => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const groupedNavItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className="main-layout">
      {/* Modern Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-area">
            <img src={logo} alt="Rodeo Drive" className="logo-icon" />
            <span className="logo-text">Rodeo Drive CRM</span>
          </div>
          <button 
            className="sidebar-toggle" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        
        <div className="user-info">
          <div className="user-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              getInitials(user?.username)
            )}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.username || 'Guest User'}</div>
            <div className="user-role">{user?.role || 'Service Manager'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(groupedNavItems).map(([section, items]) => (
            <div key={section} className="nav-section">
              <div className="nav-section-title">{sectionTitles[section as keyof typeof sectionTitles]}</div>
              {items.map((item) => {
                const IconComponent = Icons[item.icon];
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                    onClick={() => setCurrentPage(item.id)}
                  >
                    <span className="nav-icon"><IconComponent /></span>
                    <span className="nav-label">{item.label}</span>
                    {currentPage === item.id && <span className="active-indicator" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <button className="logout-btn" onClick={onLogout}>
          <span className="logout-icon"><Icons.Logout /></span>
          <span className="logout-label">Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Page Header with Actions */}
          <div className="page-header">
            <div className="header-top">
              <h1>
                {navItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
            </div>
            <p className="page-description">
              Welcome back, {user?.username?.split(' ')[0] || 'User'}! Here's what's happening today.
            </p>
          </div>

          {/* Page Content */}
          <div className="page-content">
            {children ||
              (currentPage === 'department-role' ? (
                <DepartmentRole />
              ) : (
                <div className="placeholder-content">
                  <p>Select a menu item to view content</p>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;