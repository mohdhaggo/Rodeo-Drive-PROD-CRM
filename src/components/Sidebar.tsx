import { useState } from 'react';
import '../styles/Sidebar.css';

interface SidebarProps {
  onMenuClick: (item: string) => void;
  currentPage: string;
  onLogout: () => void;
  username?: string;
}

export default function Sidebar({ onMenuClick, currentPage, onLogout, username }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'job-orders', label: 'Job Order Management', icon: '📋' },
    { id: 'inspection', label: 'Inspection', icon: '🔍' },
    { id: 'service-execution', label: 'Service & Work Execution', icon: '🔧' },
    { id: 'quality-check', label: 'Quality Check', icon: '✓' },
    { id: 'payment-invoice', label: 'Payment & Invoice', icon: '💰' },
    { id: 'exit-permit', label: 'Exit Permit', icon: '🚪' },
    { id: 'job-history', label: 'Job Order History', icon: '📜' },
    { id: 'customers', label: 'Customers Management', icon: '👥' },
    { id: 'vehicles', label: 'Vehicles Management', icon: '🚗' },
    { id: 'department-role', label: 'Department & Role Management', icon: '🏢' },
    { id: 'system-users', label: 'System User Management', icon: '👨‍💼' },
    { id: 'user-role-access', label: 'User role access', icon: '🔐' },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Rodeo Drive CRM</h2>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* User Info */}
      <div className="user-info">
        <div className="user-avatar">{username?.charAt(0).toUpperCase()}</div>
        {!isCollapsed && <span className="user-name">{username}</span>}
      </div>

      {/* Menu Items */}
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onMenuClick(item.id)}
                title={item.label}
              >
                <span className="menu-icon">{item.icon}</span>
                {!isCollapsed && <span className="menu-label">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <span className="logout-icon">🚪</span>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
