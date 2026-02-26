import React, { useEffect, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import './DepartmentRole.css';

interface Role {
  id: string;
  name: string;
  description: string;
  departmentId: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
  roles: Role[];
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

const client = generateClient<Schema>();

const DEPARTMENTS_STORAGE_KEY = 'departments_cache';

const DepartmentRole: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    title: '',
    message: '',
    type: 'info',
  });

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingRole, setEditingRole] = useState<{ deptId: string; role: Role } | null>(null);

  const deptNameRef = useRef<HTMLInputElement>(null);
  const deptDescRef = useRef<HTMLTextAreaElement>(null);
  const roleNameRef = useRef<HTMLInputElement>(null);
  const roleDescRef = useRef<HTMLTextAreaElement>(null);

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
    if (showAddDeptModal && deptNameRef.current) {
      deptNameRef.current.focus();
    }
    if (showAddRoleModal && roleNameRef.current) {
      roleNameRef.current.focus();
    }
  }, [showAddDeptModal, showAddRoleModal]);

  const closeAllModals = () => {
    setShowAddDeptModal(false);
    setShowAddRoleModal(false);
    setShowEditDeptModal(false);
    setShowEditRoleModal(false);
    setSelectedDeptId(null);
    setEditingDept(null);
    setEditingRole(null);
    document.body.style.overflow = 'auto';
  };

  const openModal = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
    document.body.style.overflow = 'hidden';
  };

  const closeAlert = () => {
    setShowAlert(false);
    document.body.style.overflow = 'auto';
  };

  const showAlertMessage = (options: AlertOptions) => {
    setAlertOptions(options);
    setShowAlert(true);
    document.body.style.overflow = 'hidden';

    if (options.type === 'success' && !options.buttons) {
      setTimeout(closeAlert, 3000);
    }
  };

  const saveDepartsToLocalStorage = (depts: Department[]) => {
    localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(depts));
  };

  const loadDepartmentsFromLocalStorage = (): Department[] => {
    try {
      const stored = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const loadDepartments = async () => {
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
      setUseLocalStorage(false);
    } catch (error) {
      // Backend models not deployed yet, fall back to localStorage
      console.warn('Backend models not available, using localStorage:', error);
      const stored = loadDepartmentsFromLocalStorage();
      setDepartments(stored);
      setUseLocalStorage(true);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const getStats = () => {
    const totalDepartments = departments.length;
    const totalRoles = departments.reduce((acc, dept) => acc + dept.roles.length, 0);
    const avgRoles = totalDepartments > 0 ? (totalRoles / totalDepartments).toFixed(1) : '0';

    return { totalDepartments, totalRoles, avgRoles };
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = deptNameRef.current?.value.trim();
    const description = deptDescRef.current?.value.trim() || '';

    if (!name) {
      showAlertMessage({
        title: 'Error',
        message: 'Department name is required',
        type: 'error',
      });
      return;
    }

    try {
      if (useLocalStorage) {
        // Use localStorage
        const newDept: Department = {
          id: generateId(),
          name,
          description,
          roles: [],
        };
        
        const updated = [...departments, newDept];
        setDepartments(updated);
        saveDepartsToLocalStorage(updated);
      } else {
        // Try backend first
        const { data, errors } = await client.models.Department.create({
          name,
          description,
        });

        if (!data || (errors && errors.length > 0)) {
          throw new Error('Failed to create department');
        }

        await loadDepartments();
      }

      if (deptNameRef.current) deptNameRef.current.value = '';
      if (deptDescRef.current) deptDescRef.current.value = '';

      closeAllModals();
      showAlertMessage({
        title: 'Success',
        message: 'Department added successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Add department error:', error);
      showAlertMessage({
        title: 'Error',
        message: 'Unable to add department. Please try again.',
        type: 'error',
      });
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = roleNameRef.current?.value.trim();
    const description = roleDescRef.current?.value.trim() || '';

    if (!name) {
      showAlertMessage({
        title: 'Error',
        message: 'Role name is required',
        type: 'error',
      });
      return;
    }

    if (!selectedDeptId) return;

    try {
      if (useLocalStorage) {
        // Use localStorage
        const updated = departments.map(dept => {
          if (dept.id === selectedDeptId) {
            return {
              ...dept,
              roles: [
                ...dept.roles,
                {
                  id: generateId(),
                  name,
                  description,
                  departmentId: selectedDeptId,
                },
              ],
            };
          }
          return dept;
        });
        setDepartments(updated);
        saveDepartsToLocalStorage(updated);
      } else {
        // Try backend
        const { data, errors } = await client.models.Role.create({
          name,
          description,
          departmentId: selectedDeptId,
        });

        if (!data || (errors && errors.length > 0)) {
          throw new Error('Failed to create role');
        }

        await loadDepartments();
      }

      if (roleNameRef.current) roleNameRef.current.value = '';
      if (roleDescRef.current) roleDescRef.current.value = '';

      closeAllModals();
      showAlertMessage({
        title: 'Success',
        message: 'Role added successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Add role error:', error);
      showAlertMessage({
        title: 'Error',
        message: 'Unable to add role. Please try again.',
        type: 'error',
      });
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingDept) return;

    const name = (document.getElementById('editDeptName') as HTMLInputElement)?.value.trim();
    const description =
      (document.getElementById('editDeptDescription') as HTMLTextAreaElement)?.value.trim() || '';

    if (!name) {
      showAlertMessage({
        title: 'Error',
        message: 'Department name is required',
        type: 'error',
      });
      return;
    }

    try {
      if (useLocalStorage) {
        const updated = departments.map(dept => {
          if (dept.id === editingDept.id) {
            return {
              ...dept,
              name,
              description,
            };
          }
          return dept;
        });
        setDepartments(updated);
        saveDepartsToLocalStorage(updated);
      } else {
        const { data, errors } = await client.models.Department.update({
          id: editingDept.id,
          name,
          description,
        });

        if (!data || (errors && errors.length > 0)) {
          throw new Error('Failed to update department');
        }

        await loadDepartments();
      }

      closeAllModals();
      showAlertMessage({
        title: 'Success',
        message: 'Department updated successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Update department error:', error);
      showAlertMessage({
        title: 'Error',
        message: 'Unable to update department. Please try again.',
        type: 'error',
      });
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRole) return;

    const name = (document.getElementById('editRoleName') as HTMLInputElement)?.value.trim();
    const description =
      (document.getElementById('editRoleDescription') as HTMLTextAreaElement)?.value.trim() || '';

    if (!name) {
      showAlertMessage({
        title: 'Error',
        message: 'Role name is required',
        type: 'error',
      });
      return;
    }

    try {
      if (useLocalStorage) {
        const updated = departments.map(dept => {
          if (dept.id === editingRole.deptId) {
            return {
              ...dept,
              roles: dept.roles.map(role => {
                if (role.id === editingRole.role.id) {
                  return {
                    ...role,
                    name,
                    description,
                  };
                }
                return role;
              }),
            };
          }
          return dept;
        });
        setDepartments(updated);
        saveDepartsToLocalStorage(updated);
      } else {
        const { data, errors } = await client.models.Role.update({
          id: editingRole.role.id,
          name,
          description,
        });

        if (!data || (errors && errors.length > 0)) {
          throw new Error('Failed to update role');
        }

        await loadDepartments();
      }

      closeAllModals();
      showAlertMessage({
        title: 'Success',
        message: 'Role updated successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Update role error:', error);
      showAlertMessage({
        title: 'Error',
        message: 'Unable to update role. Please try again.',
        type: 'error',
      });
    }
  };

  const deleteDepartmentAndRoles = async (deptId: string) => {
    if (useLocalStorage) {
      const updated = departments.filter(d => d.id !== deptId);
      setDepartments(updated);
      saveDepartsToLocalStorage(updated);
    } else {
      const { data: roleData } = await client.models.Role.list({
        filter: {
          departmentId: { eq: deptId },
        },
      });

      await Promise.all(
        (roleData ?? []).map(role => client.models.Role.delete({ id: role.id }))
      );

      await client.models.Department.delete({ id: deptId });
    }
  };

  const handleDeleteDepartment = (deptId: string) => {
    const department = departments.find(d => d.id === deptId);
    if (!department) return;

    showAlertMessage({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${department.name}"? This will also delete all roles in this department.`,
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
          action: () => {
            void (async () => {
              try {
                await deleteDepartmentAndRoles(deptId);
                if (!useLocalStorage) {
                  await loadDepartments();
                }
                closeAlert();
                showAlertMessage({
                  title: 'Success',
                  message: 'Department deleted successfully!',
                  type: 'success',
                });
              } catch (error) {
                console.error('Delete department error:', error);
                showAlertMessage({
                  title: 'Error',
                  message: 'Unable to delete department. Please try again.',
                  type: 'error',
                });
              }
            })();
          },
        },
      ],
    });
  };

  const handleDeleteRole = (deptId: string, roleId: string) => {
    const department = departments.find(d => d.id === deptId);
    const role = department?.roles.find(r => r.id === roleId);
    if (!department || !role) return;

    showAlertMessage({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete the role "${role.name}"?`,
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
          action: () => {
            void (async () => {
              try {
                if (useLocalStorage) {
                  const updated = departments.map(dept => {
                    if (dept.id === deptId) {
                      return {
                        ...dept,
                        roles: dept.roles.filter(r => r.id !== roleId),
                      };
                    }
                    return dept;
                  });
                  setDepartments(updated);
                  saveDepartsToLocalStorage(updated);
                } else {
                  await client.models.Role.delete({ id: roleId });
                  await loadDepartments();
                }
                closeAlert();
                showAlertMessage({
                  title: 'Success',
                  message: 'Role deleted successfully!',
                  type: 'success',
                });
              } catch (error) {
                console.error('Delete role error:', error);
                showAlertMessage({
                  title: 'Error',
                  message: 'Unable to delete role. Please try again.',
                  type: 'error',
                });
              }
            })();
          },
        },
      ],
    });
  };

  const openAddRoleModal = (deptId: string) => {
    setSelectedDeptId(deptId);
    openModal(setShowAddRoleModal);
  };

  const openEditDeptModal = (dept: Department) => {
    setEditingDept(dept);
    openModal(setShowEditDeptModal);
  };

  const openEditRoleModal = (deptId: string, role: Role) => {
    setEditingRole({ deptId, role });
    openModal(setShowEditRoleModal);
  };

  const stats = getStats();

  return (
    <div className="department-role-container">
      <div className="page-header">
        <div className="header-top">
          <h1>
            <i className="fas fa-sitemap"></i>
            Department & Role Management
          </h1>
          <button className="btn btn-primary" onClick={() => openModal(setShowAddDeptModal)}>
            <i className="fas fa-plus-circle"></i> Add Department
          </button>
        </div>
        <p className="page-description">
          Create and manage departments and roles within your organization
        </p>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-value">{stats.totalDepartments}</div>
          <div className="stat-label">Total Departments</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalRoles}</div>
          <div className="stat-label">Total Roles</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.avgRoles}</div>
          <div className="stat-label">Avg Roles/Dept</div>
        </div>
      </div>

      <div className="departments-list">
        {departments.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-building"></i>
            <h3>No Departments Yet</h3>
            <p>Click "Add Department" to create your first department</p>
          </div>
        ) : (
          <div className="departments-container">
            {departments.map(dept => (
              <div key={dept.id} className="department-item">
                <div className="department-header">
                  <div className="department-title">
                    <i className="fas fa-building"></i>
                    {dept.name}
                    <span className="role-count">{dept.roles.length}</span>
                  </div>
                  <div className="department-actions">
                    <button
                      className="btn btn-success btn-small"
                      onClick={() => openAddRoleModal(dept.id)}
                    >
                      <i className="fas fa-plus"></i> Add Role
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => openEditDeptModal(dept)}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteDepartment(dept.id)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
                <div className="department-body">
                  <div className="department-description">
                    {dept.description || <i>No description provided</i>}
                  </div>
                  <div className="roles-section">
                    <div className="roles-header">
                      <div className="roles-title">
                        <i className="fas fa-user-tag"></i>
                        Roles ({dept.roles.length})
                      </div>
                    </div>
                    <div className="roles-list">
                      {dept.roles.length === 0 ? (
                        <div className="no-roles">
                          <i className="fas fa-user-tag"></i>
                          <p>No roles in this department yet</p>
                        </div>
                      ) : (
                        dept.roles.map((role, index) => (
                          <div key={role.id} className="role-item">
                            <div className="role-info">
                              <h4>
                                <span className="role-number">{index + 1}</span>
                                <i className="fas fa-user-tie role-icon"></i>
                                <span className="role-title">{role.name}</span>
                              </h4>
                              <p>{role.description || <i>No description provided</i>}</p>
                            </div>
                            <div className="role-actions">
                              <button
                                className="btn btn-secondary btn-xsmall"
                                onClick={() => openEditRoleModal(dept.id, role)}
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              <button
                                className="btn btn-danger btn-xsmall"
                                onClick={() => handleDeleteRole(dept.id, role.id)}
                              >
                                <i className="fas fa-trash"></i> Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddDeptModal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeAllModals()}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-building"></i>
                Add Department
              </h3>
              <button className="close-modal" onClick={closeAllModals}>&times;</button>
            </div>
            <form onSubmit={handleAddDepartment}>
              <div className="form-group">
                <label htmlFor="deptName">Department Name *</label>
                <input
                  type="text"
                  id="deptName"
                  ref={deptNameRef}
                  placeholder="e.g., Human Resources"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="deptDescription">Description</label>
                <textarea
                  id="deptDescription"
                  ref={deptDescRef}
                  rows={4}
                  placeholder="Enter department description..."
                />
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">Create Department</button>
                <button type="button" className="btn btn-secondary" onClick={closeAllModals}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddRoleModal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeAllModals()}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-user-tag"></i>
                Add Role
              </h3>
              <button className="close-modal" onClick={closeAllModals}>&times;</button>
            </div>
            <form onSubmit={handleAddRole}>
              <input type="hidden" value={selectedDeptId || ''} />
              <div className="form-group">
                <label htmlFor="roleName">Role Name *</label>
                <input
                  type="text"
                  id="roleName"
                  ref={roleNameRef}
                  placeholder={`Enter role name for ${departments.find(d => d.id === selectedDeptId)?.name || 'department'}`}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="roleDescription">Description</label>
                <textarea
                  id="roleDescription"
                  ref={roleDescRef}
                  rows={4}
                  placeholder="Enter role description..."
                />
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-success">Add Role</button>
                <button type="button" className="btn btn-secondary" onClick={closeAllModals}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditDeptModal && editingDept && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeAllModals()}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-edit"></i>
                Edit Department
              </h3>
              <button className="close-modal" onClick={closeAllModals}>&times;</button>
            </div>
            <form onSubmit={handleUpdateDepartment}>
              <input type="hidden" id="editDeptId" value={editingDept.id} />
              <div className="form-group">
                <label htmlFor="editDeptName">Department Name *</label>
                <input
                  type="text"
                  id="editDeptName"
                  defaultValue={editingDept.name}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editDeptDescription">Description</label>
                <textarea
                  id="editDeptDescription"
                  rows={4}
                  defaultValue={editingDept.description}
                />
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={closeAllModals}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditRoleModal && editingRole && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeAllModals()}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-edit"></i>
                Edit Role
              </h3>
              <button className="close-modal" onClick={closeAllModals}>&times;</button>
            </div>
            <form onSubmit={handleUpdateRole}>
              <input type="hidden" id="editRoleId" value={editingRole.role.id} />
              <input type="hidden" id="editRoleDeptId" value={editingRole.deptId} />
              <div className="form-group">
                <label htmlFor="editRoleName">Role Name *</label>
                <input
                  type="text"
                  id="editRoleName"
                  defaultValue={editingRole.role.name}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editRoleDescription">Description</label>
                <textarea
                  id="editRoleDescription"
                  rows={4}
                  defaultValue={editingRole.role.description}
                />
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={closeAllModals}>Cancel</button>
              </div>
            </form>
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

export default DepartmentRole;
