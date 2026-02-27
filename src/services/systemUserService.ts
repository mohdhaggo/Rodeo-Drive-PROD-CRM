import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Lazy initialization of client - creates it on first use after Amplify is configured
let clientInstance: ReturnType<typeof generateClient<Schema>> | null = null;

const getClient = (): ReturnType<typeof generateClient<Schema>> => {
  if (!clientInstance) {
    try {
      clientInstance = generateClient<Schema>();
    } catch (error) {
      console.error('Failed to initialize Amplify client:', error);
      throw new Error('Amplify client not initialized. Make sure Amplify.configure() is called in your app.');
    }
  }
  return clientInstance;
};

// Types matching the Amplify schema
export interface SystemUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile: string;
  departmentId: string;
  roleId: string;
  lineManagerId?: string | null;
  status: 'active' | 'inactive';
  dashboardAccess: 'allowed' | 'blocked';
  failedLoginAttempts: number;
  createdDate: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  departmentId: string;
}

/**
 * System User Service
 * Handles all CRUD operations for system users
 */
export const systemUserService = {
  // ==================== SYSTEM USERS ====================
  
  /**
   * Get all system users
   */
  async getAllUsers() {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.list({});
      if (errors) {
        console.error('Error fetching users:', errors);
        throw new Error('Failed to fetch users');
      }
      return data;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.get({ id });
      if (errors) {
        console.error('Error fetching user:', errors);
        throw new Error('Failed to fetch user');
      }
      return data;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  },

  /**
   * Get user by employee ID
   */
  async getUserByEmployeeId(employeeId: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.list({
        filter: { employeeId: { eq: employeeId } },
      });
      if (errors) {
        console.error('Error fetching user by employeeId:', errors);
        throw new Error('Failed to fetch user');
      }
      return data[0] || null;
    } catch (error) {
      console.error('Error in getUserByEmployeeId:', error);
      throw error;
    }
  },

  /**
   * Create a new system user
   */
  async createUser(userData: Omit<SystemUser, 'id'>) {
    try {
      // Check if employee ID already exists
      const existingUser = await this.getUserByEmployeeId(userData.employeeId);
      if (existingUser) {
        throw new Error('Employee ID already exists');
      }

      const client = getClient();
      const { data, errors } = await client.models.SystemUser.create(userData);
      if (errors) {
        console.error('Error creating user:', errors);
        throw new Error('Failed to create user');
      }
      return data;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  },

  /**
   * Update an existing system user
   */
  async updateUser(id: string, userData: Partial<Omit<SystemUser, 'id' | 'employeeId'>>) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.update({
        id,
        ...userData,
      });
      if (errors) {
        console.error('Error updating user:', errors);
        throw new Error('Failed to update user');
      }
      return data;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  },

  /**
   * Delete a system user
   */
  async deleteUser(id: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.delete({ id });
      if (errors) {
        console.error('Error deleting user:', errors);
        throw new Error('Failed to delete user');
      }
      return data;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  },

  /**
   * Toggle user status (active/inactive)
   */
  async toggleUserStatus(id: string) {
    try {
      const user = await this.getUserById(id);
      if (!user || Array.isArray(user)) throw new Error('User not found');

      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      const dashboardAccess = newStatus === 'inactive' ? 'blocked' : (user.dashboardAccess || 'allowed');

      return await this.updateUser(id, {
        status: newStatus,
        dashboardAccess: dashboardAccess as 'allowed' | 'blocked',
      });
    } catch (error) {
      console.error('Error in toggleUserStatus:', error);
      throw error;
    }
  },

  /**
   * Toggle dashboard access
   */
  async toggleDashboardAccess(id: string) {
    try {
      const user = await this.getUserById(id);
      if (!user || Array.isArray(user)) throw new Error('User not found');

      if (user.status !== 'active') {
        throw new Error('Cannot change dashboard access for inactive users');
      }

      const newAccess = user.dashboardAccess === 'allowed' ? 'blocked' : 'allowed';
      return await this.updateUser(id, { dashboardAccess: newAccess });
    } catch (error) {
      console.error('Error in toggleDashboardAccess:', error);
      throw error;
    }
  },

  /**
   * Get users by department
   */
  async getUsersByDepartment(departmentId: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.list({
        filter: { departmentId: { eq: departmentId } },
      });
      if (errors) {
        console.error('Error fetching users by department:', errors);
        throw new Error('Failed to fetch users');
      }
      return data;
    } catch (error) {
      console.error('Error in getUsersByDepartment:', error);
      throw error;
    }
  },

  /**
   * Get active users (for line manager selection)
   */
  async getActiveUsers() {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.list({
        filter: { status: { eq: 'active' } },
      });
      if (errors) {
        console.error('Error fetching active users:', errors);
        throw new Error('Failed to fetch active users');
      }
      return data;
    } catch (error) {
      console.error('Error in getActiveUsers:', error);
      throw error;
    }
  },

  // ==================== DEPARTMENTS ====================

  /**
   * Get all departments
   */
  async getAllDepartments() {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Department.list({});
      if (errors) {
        console.error('Error fetching departments:', errors);
        throw new Error('Failed to fetch departments');
      }
      return data;
    } catch (error) {
      console.error('Error in getAllDepartments:', error);
      throw error;
    }
  },

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Department.get({ id });
      if (errors) {
        console.error('Error fetching department:', errors);
        throw new Error('Failed to fetch department');
      }
      return data;
    } catch (error) {
      console.error('Error in getDepartmentById:', error);
      throw error;
    }
  },

  /**
   * Create a new department
   */
  async createDepartment(departmentData: Omit<Department, 'id'>) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Department.create(departmentData);
      if (errors) {
        console.error('Error creating department:', errors);
        throw new Error('Failed to create department');
      }
      return data;
    } catch (error) {
      console.error('Error in createDepartment:', error);
      throw error;
    }
  },

  /**
   * Update a department
   */
  async updateDepartment(id: string, departmentData: Partial<Omit<Department, 'id'>>) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Department.update({
        id,
        ...departmentData,
      });
      if (errors) {
        console.error('Error updating department:', errors);
        throw new Error('Failed to update department');
      }
      return data;
    } catch (error) {
      console.error('Error in updateDepartment:', error);
      throw error;
    }
  },

  /**
   * Delete a department
   */
  async deleteDepartment(id: string) {
    try {
      // Check if department has users
      const users = await this.getUsersByDepartment(id);
      if (users.length > 0) {
        throw new Error('Cannot delete department with existing users');
      }

      const client = getClient();
      const { data, errors } = await client.models.Department.delete({ id });
      if (errors) {
        console.error('Error deleting department:', errors);
        throw new Error('Failed to delete department');
      }
      return data;
    } catch (error) {
      console.error('Error in deleteDepartment:', error);
      throw error;
    }
  },

  // ==================== ROLES ====================

  /**
   * Get all roles
   */
  async getAllRoles() {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Role.list({});
      if (errors) {
        console.error('Error fetching roles:', errors);
        throw new Error('Failed to fetch roles');
      }
      return data;
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      throw error;
    }
  },

  /**
   * Get roles by department
   */
  async getRolesByDepartment(departmentId: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Role.list({
        filter: { departmentId: { eq: departmentId } },
      });
      if (errors) {
        console.error('Error fetching roles by department:', errors);
        throw new Error('Failed to fetch roles');
      }
      return data;
    } catch (error) {
      console.error('Error in getRolesByDepartment:', error);
      throw error;
    }
  },

  /**
   * Get role by ID
   */
  async getRoleById(id: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Role.get({ id });
      if (errors) {
        console.error('Error fetching role:', errors);
        throw new Error('Failed to fetch role');
      }
      return data;
    } catch (error) {
      console.error('Error in getRoleById:', error);
      throw error;
    }
  },

  /**
   * Create a new role
   */
  async createRole(roleData: Omit<Role, 'id'>) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Role.create(roleData);
      if (errors) {
        console.error('Error creating role:', errors);
        throw new Error('Failed to create role');
      }
      return data;
    } catch (error) {
      console.error('Error in createRole:', error);
      throw error;
    }
  },

  /**
   * Update a role
   */
  async updateRole(id: string, roleData: Partial<Omit<Role, 'id'>>) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Role.update({
        id,
        ...roleData,
      });
      if (errors) {
        console.error('Error updating role:', errors);
        throw new Error('Failed to update role');
      }
      return data;
    } catch (error) {
      console.error('Error in updateRole:', error);
      throw error;
    }
  },

  /**
   * Delete a role
   */
  async deleteRole(id: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.Role.delete({ id });
      if (errors) {
        console.error('Error deleting role:', errors);
        throw new Error('Failed to delete role');
      }
      return data;
    } catch (error) {
      console.error('Error in deleteRole:', error);
      throw error;
    }
  },

  // ==================== STATISTICS ====================

  /**
   * Get user statistics
   */
  async getUserStatistics() {
    try {
      const users = await this.getAllUsers();
      const total = users.length;
      const active = users.filter((u: any) => u.status === 'active').length;
      const inactive = users.filter((u: any) => u.status === 'inactive').length;
      const allowedAccess = users.filter((u: any) => u.dashboardAccess === 'allowed').length;
      const blockedAccess = users.filter((u: any) => u.dashboardAccess === 'blocked').length;

      return {
        total,
        active,
        inactive,
        allowedAccess,
        blockedAccess,
      };
    } catch (error) {
      console.error('Error in getUserStatistics:', error);
      throw error;
    }
  },

  /**
   * Search users by query
   */
  async searchUsers(query: string) {
    try {
      const users = await this.getAllUsers();
      const lowerQuery = query.toLowerCase();
      
      return users.filter((user: any) =>
        user.employeeId.toLowerCase().includes(lowerQuery) ||
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery) ||
        user.mobile.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error in searchUsers:', error);
      throw error;
    }
  },
};

export default systemUserService;
