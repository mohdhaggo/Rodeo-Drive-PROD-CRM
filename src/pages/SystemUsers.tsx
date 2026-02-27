import React, { useCallback, useEffect, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { systemUserService } from '../services/systemUserService';
import './DepartmentRole.css';

// Frontend-enriched user type (backend fields + resolved names)
interface SystemUser {
  id: string;
  employeeId: string;
  employeeName: string;         // maps to backend "name"
  email: string;
  mobile: string;
  departmentId: string;
  departmentName: string;       // resolved locally
  roleId: string;
  roleName: string;             // resolved locally
  lineManagerId?: string;
  lineManagerName?: string;     // resolved locally
  isActive: boolean;            // maps to backend status === 'active'
  isBlockedFromDashboard: boolean; // maps to backend dashboardAccess === 'blocked'
  failedLoginAttempts: number;
}

interface Department {
  id: string;
  name: string;
  description: string;
  roles: Role[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  departmentId: string;
}

interface AlertOptions {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  buttons?: Array<{
    text: string;
    class: string;
    action: () => void;
  }>;
}

interface RawSystemUser {
  id: string;
  employeeId?: string | null;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  departmentId?: string | null;
  roleId?: string | null;
  lineManagerId?: string | null;
  status?: string | null;
  dashboardAccess?: string | null;
  failedLoginAttempts?: number | null;
}

const client = generateClient<Schema>();

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

const SystemUsers: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    title: '',
    message: '',
    type: 'info',
  });
  const [viewingUser, setViewingUser] = useState<SystemUser | null>(null);
  const [userIsActive, setUserIsActive] = useState(true);
  const [userIsBlocked, setUserIsBlocked] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const employeeIdRef = useRef<HTMLInputElement>(null);
  const employeeNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const departmentRef = useRef<HTMLSelectElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const lineManagerRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllModals();
        closeAlert();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (showAddUserModal && employeeIdRef.current) {
      employeeIdRef.current.focus();
    }
  }, [showAddUserModal]);

  const closeAllModals = () => {
    setShowAddUserModal(false);
    setShowViewDetailsModal(false);
    setViewingUser(null);
    setIsEditingDetails(false);
    document.body.style.overflow = 'auto';
  };

  const closeAlert = () => {
    setShowAlert(false);
  };

  const showAlertMessage = (options: AlertOptions) => {
    setAlertOptions(options);
    setShowAlert(true);

    if (options.type === 'success' && !options.buttons) {
      setTimeout(closeAlert, 3000);
    }
  };

  // Helper: resolve department/role/manager names from raw backend user
  const enrichUser = (
    raw: RawSystemUser,
    depts: Department[],
    allRawUsers: RawSystemUser[]
  ): SystemUser => {
    const dept = depts.find(d => d.id === raw.departmentId);
    const role = dept?.roles.find(r => r.id === raw.roleId);
    const manager = raw.lineManagerId
      ? allRawUsers.find(u => u.id === raw.lineManagerId)
      : null;

    return {
      id: raw.id,
      employeeId: raw.employeeId ?? '',
      employeeName: raw.name ?? '',
      email: raw.email ?? '',
      mobile: raw.mobile ?? '',
      departmentId: raw.departmentId ?? '',
      departmentName: dept?.name ?? '',
      roleId: raw.roleId ?? '',
      roleName: role?.name ?? '',
      lineManagerId: raw.lineManagerId ?? undefined,
      lineManagerName: manager?.name ?? undefined,
      isActive: raw.status === 'active',
      isBlockedFromDashboard: raw.dashboardAccess === 'blocked',
      failedLoginAttempts: raw.failedLoginAttempts ?? 0,
    };
  };

  const loadDepartments = useCallback(async (): Promise<Department[]> => {
    try {
      const [{ data: deptData }, { data: roleData }] = await Promise.all([
        client.models.Department.list(),
        client.models.Role.list(),
      ]);

      const rolesByDept = new Map<string, Role[]>();
      (roleData ?? []).forEach(role => {
        if (!role.departmentId) return;
        const mappedRole: Role = {
          id: role.id,
          name: role.name ?? '',
          description: role.description ?? '',
          departmentId: role.departmentId,
        };
        const existing = rolesByDept.get(role.departmentId) ?? [];
        rolesByDept.set(role.departmentId, [...existing, mappedRole]);
      });

      const mappedDepartments = (deptData ?? []).map(dept => ({
        id: dept.id,
        name: dept.name ?? '',
        description: dept.description ?? '',
        roles: rolesByDept.get(dept.id) ?? [],
      }));

      setDepartments(mappedDepartments);
      return mappedDepartments;
    } catch (error) {
      console.error('Error loading departments:', error);
      return [];
    }
  }, []);

  const loadUsers = useCallback(async (depts: Department[]) => {
    setIsLoading(true);
    try {
      const { data: rawUsers, errors } = await client.models.SystemUser.list();
      if (errors) {
        console.error('Error loading users:', errors);
        return;
      }
      const typedRawUsers = (rawUsers ?? []) as RawSystemUser[];
      const enriched = typedRawUsers.map(u => enrichUser(u, depts, typedRawUsers));
      setUsers(enriched);
    } catch (error) {
      console.error('Error loading users from backend:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const depts = await loadDepartments();
      await loadUsers(depts);
    };
    void init();
  }, [loadDepartments, loadUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const employeeId = employeeIdRef.current?.value.trim();
    const employeeName = employeeNameRef.current?.value.trim();
    const email = emailRef.current?.value.trim();
    const mobile = mobileRef.current?.value.trim();
    const departmentId = departmentRef.current?.value.trim();
    const roleId = roleRef.current?.value.trim();
    const lineManagerId = lineManagerRef.current?.value.trim() || '';

    if (!employeeId || !employeeName || !email || !mobile || !departmentId || !roleId) {
      showAlertMessage({
        title: 'Error',
        message: 'Please fill in all required fields',
        type: 'error',
      });
      return;
    }

    const dept = departments.find(d => d.id === departmentId);
    const role = dept?.roles.find(r => r.id === roleId);

    if (!dept || !role) {
      showAlertMessage({
        title: 'Error',
        message: 'Invalid department or role selection',
        type: 'error',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create user in both Cognito and database
      await systemUserService.createUser({
        employeeId,
        name: employeeName,
        email,
        mobile,
        departmentId,
        roleId,
        lineManagerId: lineManagerId || null,
        status: 'active',
        dashboardAccess: 'allowed',
        failedLoginAttempts: 0,
        createdDate: new Date().toISOString(),
      });

      // Reload users from backend to stay in sync
      await loadUsers(departments);

      if (employeeIdRef.current) employeeIdRef.current.value = '';
      if (employeeNameRef.current) employeeNameRef.current.value = '';
      if (emailRef.current) emailRef.current.value = '';
      if (mobileRef.current) mobileRef.current.value = '';
      if (departmentRef.current) departmentRef.current.value = '';
      if (roleRef.current) roleRef.current.value = '';
      if (lineManagerRef.current) lineManagerRef.current.value = '';
      setSelectedDepartmentId('');

      closeAllModals();
      showAlertMessage({
        title: 'Success',
        message: `User created successfully! A verification email with temporary password has been sent to ${email}. IMPORTANT: The user must verify their email before you can send password reset emails.`,
        type: 'success',
      });
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      showAlertMessage({
        title: 'Error',
        message: getErrorMessage(error, 'Failed to create user. Please try again.'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!viewingUser) return;

    const employeeId = (document.getElementById('editEmployeeId') as HTMLInputElement)?.value.trim();
    const employeeName = (document.getElementById('editEmployeeName') as HTMLInputElement)?.value.trim();
    const email = (document.getElementById('editEmail') as HTMLInputElement)?.value.trim();
    const mobile = (document.getElementById('editMobile') as HTMLInputElement)?.value.trim();
    const departmentId = (document.getElementById('editDepartment') as HTMLSelectElement)?.value.trim();
    const roleId = (document.getElementById('editRole') as HTMLSelectElement)?.value.trim();
    const lineManagerId = (document.getElementById('editLineManager') as HTMLSelectElement)?.value.trim() || '';

    if (!employeeId || !employeeName || !email || !mobile || !departmentId || !roleId) {
      showAlertMessage({
        title: 'Error',
        message: 'Please fill in all required fields',
        type: 'error',
      });
      return;
    }

    const dept = departments.find(d => d.id === departmentId);
    const role = dept?.roles.find(r => r.id === roleId);

    if (!dept || !role) {
      showAlertMessage({
        title: 'Error',
        message: 'Invalid department or role selection',
        type: 'error',
      });
      return;
    }

    try {
      setIsLoading(true);
      const { errors } = await client.models.SystemUser.update({
        id: viewingUser.id,
        employeeId,
        name: employeeName,
        email,
        mobile,
        departmentId,
        roleId,
        lineManagerId: lineManagerId || null,
      });

      if (errors) {
        console.error('Error updating user:', errors);
        showAlertMessage({
          title: 'Error',
          message: 'Failed to update user. Please try again.',
          type: 'error',
        });
        return;
      }

      // Reload and update local state
      await loadUsers(departments);

      // Update the viewing user with resolved names
      const lineManagerName = lineManagerId ? users.find(u => u.id === lineManagerId)?.employeeName : '';
      const updatedUser: SystemUser = {
        ...viewingUser,
        employeeId,
        employeeName,
        email,
        mobile,
        departmentId,
        departmentName: dept.name,
        roleId,
        roleName: role.name,
        lineManagerId,
        lineManagerName,
      };
      setViewingUser(updatedUser);
      setIsEditingDetails(false);

      showAlertMessage({
        title: 'Success',
        message: 'User updated successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      showAlertMessage({
        title: 'Error',
        message: 'Failed to update user. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    showAlertMessage({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${user.employeeName}"?`,
      type: 'warning',
      buttons: [
        {
          text: 'Cancel',
          class: 'alert-btn-secondary',
          action: closeAlert,
        },
        {
          text: 'Delete',
          class: 'alert-btn-danger',
          action: async () => {
            try {
              const { errors } = await client.models.SystemUser.delete({ id: userId });
              if (errors) {
                console.error('Error deleting user:', errors);
                closeAlert();
                showAlertMessage({
                  title: 'Error',
                  message: 'Failed to delete user. Please try again.',
                  type: 'error',
                });
                return;
              }
              await loadUsers(departments);
              closeAlert();
              showAlertMessage({
                title: 'Success',
                message: 'User deleted successfully!',
                type: 'success',
              });
            } catch (error) {
              console.error('Error deleting user:', error);
              closeAlert();
              showAlertMessage({
                title: 'Error',
                message: 'Failed to delete user. Please try again.',
                type: 'error',
              });
            }
          },
        },
      ],
    });
  };

  const handleResendVerification = () => {
    if (!viewingUser) return;
    
    showAlertMessage({
      title: 'Resend Verification Email',
      message: `Resend verification email to ${viewingUser.email}?`,
      type: 'info',
      buttons: [
        {
          text: 'Send',
          class: 'alert-btn-primary',
          action: async () => {
            closeAlert();
            try {
              await systemUserService.resendVerificationEmail(viewingUser.email);
              showAlertMessage({
                title: 'Success',
                message: `Verification email resent to ${viewingUser.email}. The user will receive an email with a link to verify their account.`,
                type: 'success',
              });
            } catch (error: unknown) {
              console.error('Error resending verification email:', error);
              showAlertMessage({
                title: 'Error',
                message: getErrorMessage(error, 'Failed to resend verification email. Please try again.'),
                type: 'error',
              });
            }
          },
        },
       {
          text: 'Cancel',
          class: 'alert-btn-secondary',
          action: closeAlert,
        },
      ],
    });
  };

  const openViewDetailsModal = (user: SystemUser) => {
    setViewingUser(user);
    setUserIsActive(user.isActive);
    setUserIsBlocked(user.isBlockedFromDashboard);
    setIsEditingDetails(false);
    setShowViewDetailsModal(true);
  };

  const openAddUserModal = () => {
    setShowAddUserModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleToggleUserStatus = async () => {
    if (!viewingUser) return;
    
    const updatedIsActive = !userIsActive;
    setUserIsActive(updatedIsActive);
    
    try {
      const newStatus = updatedIsActive ? 'active' : 'inactive';
      const dashboardAccess = !updatedIsActive ? 'blocked' : (viewingUser.isBlockedFromDashboard ? 'blocked' : 'allowed');

      await client.models.SystemUser.update({
        id: viewingUser.id,
        status: newStatus,
        dashboardAccess: dashboardAccess,
      });

      const updatedUsers = users.map(u =>
        u.id === viewingUser.id
          ? { ...u, isActive: updatedIsActive, isBlockedFromDashboard: dashboardAccess === 'blocked' }
          : u
      );
      setUsers(updatedUsers);
      setViewingUser({ ...viewingUser, isActive: updatedIsActive, isBlockedFromDashboard: dashboardAccess === 'blocked' });
      if (dashboardAccess === 'blocked') setUserIsBlocked(true);
    } catch (error) {
      console.error('Error toggling user status:', error);
      setUserIsActive(!updatedIsActive); // revert on error
    }
  };

  const handleToggleBlockAccess = async () => {
    if (!viewingUser) return;
    
    const updatedIsBlocked = !userIsBlocked;
    setUserIsBlocked(updatedIsBlocked);
    
    try {
      const newAccess = updatedIsBlocked ? 'blocked' : 'allowed';
      const newFailedAttempts = updatedIsBlocked ? viewingUser.failedLoginAttempts : 0;

      await client.models.SystemUser.update({
        id: viewingUser.id,
        dashboardAccess: newAccess,
        failedLoginAttempts: newFailedAttempts,
      });

      const updatedUsers = users.map(u =>
        u.id === viewingUser.id
          ? { ...u, isBlockedFromDashboard: updatedIsBlocked, failedLoginAttempts: newFailedAttempts }
          : u
      );
      setUsers(updatedUsers);
      setViewingUser({ ...viewingUser, isBlockedFromDashboard: updatedIsBlocked, failedLoginAttempts: newFailedAttempts });
    } catch (error) {
      console.error('Error toggling block access:', error);
      setUserIsBlocked(!updatedIsBlocked); // revert on error
    }
  };

  const handleResetPassword = () => {
    if (!viewingUser) return;
    
    showAlertMessage({
      title: 'Reset Password',
      message: `Send password reset email to ${viewingUser.email}?`,
      type: 'info',
      buttons: [
        {
          text: 'Send',
          class: 'alert-btn-primary',
          action: async () => {
            closeAlert();
            try {
              await systemUserService.sendPasswordResetEmail(viewingUser.email);
              showAlertMessage({
                title: 'Success',
                message: `Password reset email sent to ${viewingUser.email}. The user will receive an email with instructions to reset their password.`,
                type: 'success',
              });
            } catch (error: unknown) {
              console.error('Error sending password reset email:', error);
              showAlertMessage({
                title: 'Error',
                message: getErrorMessage(error, 'Failed to send password reset email. Please try again.'),
                type: 'error',
              });
            }
          },
        },
       {
          text: 'Cancel',
          class: 'alert-btn-secondary',
          action: closeAlert,
        },
      ],
    });
  };

  const getStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.length;
    const uniqueRoles = new Set(users.map(u => u.roleName)).size;

    return { totalUsers, activeUsers, uniqueRoles };
  };

  const stats = getStats();

  return (
    <div className="department-role-container">
      <div className="page-header">
        <div className="header-top">
          <h1>
            <i className="fas fa-users"></i>
            System Users Management
          </h1>
          <button className="btn btn-primary" onClick={openAddUserModal}>
            <i className="fas fa-plus-circle"></i> Add User
          </button>
        </div>
        <p className="page-description">
          Create and manage system users and their roles
        </p>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.activeUsers}</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.uniqueRoles}</div>
          <div className="stat-label">Unique Roles</div>
        </div>
      </div>

      <div className="departments-list">
        {isLoading ? (
          <div className="empty-state">
            <i className="fas fa-spinner fa-spin"></i>
            <h3>Loading Users...</h3>
            <p>Fetching data from the database</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <h3>No Users Yet</h3>
            <p>Click "Add User" to create your first system user</p>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Line Manager</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.employeeId}</td>
                    <td>{user.employeeName}</td>
                    <td>{user.email}</td>
                    <td>{user.mobile}</td>
                    <td>{user.departmentName}</td>
                    <td>{user.roleName}</td>
                    <td>{user.lineManagerName || '-'}</td>
                    <td>
                      <div className="action-dropdown">
                        <button className="dropdown-toggle">
                          Actions <i className="fas fa-chevron-down"></i>
                        </button>
                        <div className="dropdown-menu">
                          <button
                            className="dropdown-item"
                            onClick={() => openViewDetailsModal(user)}
                          >
                            <i className="fas fa-eye"></i> View
                          </button>
                          <button
                            className="dropdown-item delete"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddUserModal && (
        <div className="modal" onClick={e => e.target === e.currentTarget && closeAllModals()}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-user-plus"></i>
                Add New User
              </h3>
              <button className="close-modal" onClick={closeAllModals}>&times;</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label htmlFor="employeeId">Employee ID *</label>
                <input type="text" id="employeeId" ref={employeeIdRef} placeholder="Enter employee ID" required />
              </div>
              <div className="form-group">
                <label htmlFor="employeeName">Employee Name *</label>
                <input type="text" id="employeeName" ref={employeeNameRef} placeholder="Enter full name" required />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input type="email" id="email" ref={emailRef} placeholder="Enter email address" required />
              </div>
              <div className="form-group">
                <label htmlFor="mobile">Mobile Number *</label>
                <input type="tel" id="mobile" ref={mobileRef} placeholder="Enter mobile number" required />
              </div>
              <div className="form-group">
                <label htmlFor="department">Department *</label>
                <select 
                  id="department" 
                  ref={departmentRef}
                  value={selectedDepartmentId}
                  onChange={(e) => {
                    setSelectedDepartmentId(e.target.value);
                    if (roleRef.current) roleRef.current.value = '';
                  }}
                  required
                >
                  <option value="">Select a department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select id="role" ref={roleRef} required disabled={!selectedDepartmentId}>
                  <option value="">Select a role</option>
                  {selectedDepartmentId && departments.find(d => d.id === selectedDepartmentId)?.roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lineManager">Line Manager</label>
                <select id="lineManager" ref={lineManagerRef}>
                  <option value="">Select Line Manager</option>
                  {users.length > 0 ? (
                    users.map(user => (
                      <option key={user.id} value={user.id}>{user.employeeName}</option>
                    ))
                  ) : (
                    <option disabled>Not Available</option>
                  )}
                </select>
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">Create User</button>
                <button type="button" className="btn btn-secondary" onClick={closeAllModals}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showViewDetailsModal && viewingUser && (
        <div className="details-overlay">
          <div className="details-fullwidth-container">
            <div className="details-header">
              <h3 className="details-title">
                <i className="fas fa-user-circle"></i>
                User Details
              </h3>
              <button className="close-details" onClick={closeAllModals}>&times;</button>
            </div>
            <div className="details-body">
              <div className="user-details-card">
                <div className="card-header-actions">
                  <h3 className="card-title">
                    <i className="fas fa-id-card"></i>
                    {viewingUser.employeeName}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {isEditingDetails ? (
                      <>
                        <button
                          className="btn btn-success"
                          onClick={(e) => {
                            e.preventDefault();
                            void handleUpdateUser();
                          }}
                        >
                          <i className="fas fa-save"></i> Save Changes
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setIsEditingDetails(false)}
                        >
                          <i className="fas fa-times"></i> Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => setIsEditingDetails(true)}
                      >
                        <i className="fas fa-edit"></i> Edit User
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  {isEditingDetails ? (
                    <form onSubmit={handleUpdateUser} className="edit-form">
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="editEmployeeId">
                            <i className="fas fa-id-badge"></i>
                            Employee ID *
                          </label>
                          <input type="text" id="editEmployeeId" defaultValue={viewingUser.employeeId} required />
                        </div>
                        <div className="form-group">
                          <label htmlFor="editEmployeeName">
                            <i className="fas fa-user"></i>
                            Employee Name *
                          </label>
                          <input type="text" id="editEmployeeName" defaultValue={viewingUser.employeeName} required />
                        </div>
                        <div className="form-group">
                          <label htmlFor="editEmail">
                            <i className="fas fa-envelope"></i>
                            Email Address *
                          </label>
                          <input type="email" id="editEmail" defaultValue={viewingUser.email} required />
                        </div>
                        <div className="form-group">
                          <label htmlFor="editMobile">
                            <i className="fas fa-phone"></i>
                            Mobile Number *
                          </label>
                          <input type="tel" id="editMobile" defaultValue={viewingUser.mobile} required />
                        </div>
                        <div className="form-group">
                          <label htmlFor="editDepartment">
                            <i className="fas fa-building"></i>
                            Department *
                          </label>
                          <select id="editDepartment" defaultValue={viewingUser.departmentId} required>
                            <option value="">Select a department</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="editRole">
                            <i className="fas fa-user-tie"></i>
                            Role *
                          </label>
                          <select id="editRole" defaultValue={viewingUser.roleId} required>
                            <option value="">Select a role</option>
                            {departments.find(d => d.id === viewingUser.departmentId)?.roles.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="editLineManager">
                            <i className="fas fa-user-friends"></i>
                            Line Manager
                          </label>
                          <select id="editLineManager" defaultValue={viewingUser.lineManagerId || ''}>
                            <option value="">Select Line Manager</option>
                            {users.length > 0 ? (
                              users.filter(user => user.id !== viewingUser.id).map(user => (
                                <option key={user.id} value={user.id}>{user.employeeName}</option>
                              ))
                            ) : (
                              <option disabled>Not Available</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="user-info-grid">
                      <div className="info-item">
                        <div className="info-label">
                          <i className="fas fa-id-badge"></i>
                          Employee ID
                        </div>
                        <div className="info-value">{viewingUser.employeeId}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">
                          <i className="fas fa-user"></i>
                          Employee Name
                        </div>
                        <div className="info-value">{viewingUser.employeeName}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">
                          <i className="fas fa-envelope"></i>
                          Email Address
                        </div>
                        <div className="info-value">{viewingUser.email}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">
                          <i className="fas fa-phone"></i>
                          Mobile Number
                        </div>
                        <div className="info-value">{viewingUser.mobile}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">
                          <i className="fas fa-building"></i>
                          Department
                        </div>
                        <div className="info-value">{viewingUser.departmentName}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">
                          <i className="fas fa-user-tie"></i>
                          Role
                        </div>
                        <div className="info-value">{viewingUser.roleName}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">
                          <i className="fas fa-user-friends"></i>
                          Line Manager
                        </div>
                        <div className="info-value">{viewingUser.lineManagerName || '-'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dashboard Access Information Card */}
              <div className="dashboard-access-card">
                <div className="card-header-access">
                  <h3 className="card-title-access">
                    <i className="fas fa-lock"></i>
                    Dashboard Access Information
                  </h3>
                </div>
                <div className="card-body-access">
                  <div className="access-item">
                    <div className="access-label">
                      <i className="fas fa-power-off"></i>
                      User Status
                    </div>
                    <div className="access-control">
                      <span className={`status-badge ${userIsActive ? 'active' : 'inactive'}`}>
                        {userIsActive ? 'Active' : 'Inactive'}
                      </span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={userIsActive}
                          onChange={handleToggleUserStatus}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="access-item">
                    <div className="access-label">
                      <i className="fas fa-ban"></i>
                      Dashboard Access
                    </div>
                    <div className="access-control">
                      <span className={`access-badge ${userIsBlocked ? 'blocked' : 'allowed'}`}>
                        {userIsBlocked ? 'Blocked' : 'Allowed'}
                      </span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!userIsBlocked}
                          onChange={handleToggleBlockAccess}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="access-item">
                    <div className="access-label">
                      <i className="fas fa-lock-open"></i>
                      Failed Login Attempts
                    </div>
                    <div className="access-value">
                      <span className="attempt-badge">{viewingUser.failedLoginAttempts}/3</span>
                      <span className="attempt-description">
                        {viewingUser.failedLoginAttempts >= 3
                          ? 'User is blocked after 3 failed attempts'
                          : `${3 - viewingUser.failedLoginAttempts} attempts remaining`}
                      </span>
                    </div>
                  </div>

                  <div className="access-item button-item">
                    <button
                      className="btn btn-warning"
                      onClick={handleResetPassword}
                    >
                      <i className="fas fa-redo"></i>
                      Reset Password
                    </button>
                    <span className="button-description">
                      Send password reset email to {viewingUser.email}
                    </span>
                  </div>

                  <div className="access-item button-item">
                    <button
                      className="btn btn-info"
                      onClick={handleResendVerification}
                    >
                      <i className="fas fa-envelope"></i>
                      Resend Verification Email
                    </button>
                    <span className="button-description">
                      Resend verification email if user hasn't verified yet
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAlert && (
        <div className="alert-popup" onClick={(e) => e.target === e.currentTarget && closeAlert()}>
          <div className="alert-content">
            <div className={`alert-header ${alertOptions.type}`}>
              <div className="alert-icon">
                {alertOptions.type === 'success' && <i className="fas fa-check-circle"></i>}
                {alertOptions.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
                {alertOptions.type === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
                {alertOptions.type === 'info' && <i className="fas fa-info-circle"></i>}
              </div>
              <div className="alert-title">{alertOptions.title}</div>
            </div>
            <div className="alert-body">
              <div className="alert-message">{alertOptions.message}</div>
              <div className="alert-actions">
                {alertOptions.buttons ? (
                  alertOptions.buttons.map((button, index) => (
                    <button
                      key={index}
                      className={`alert-btn ${button.class}`}
                      onClick={button.action}
                    >
                      {button.text}
                    </button>
                  ))
                ) : (
                  <button className="alert-btn alert-btn-primary" onClick={closeAlert}>
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemUsers;
