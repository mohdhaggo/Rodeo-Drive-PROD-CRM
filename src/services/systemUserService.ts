import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { resendSignUpCode, fetchAuthSession } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';

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

interface ErrorWithNameAndMessage {
  name?: string;
  message?: string;
}

const getErrorDetails = (error: unknown): ErrorWithNameAndMessage => {
  if (typeof error === 'object' && error !== null) {
    return error as ErrorWithNameAndMessage;
  }
  return {};
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message;
  }
  const details = getErrorDetails(error);
  return details.message ?? fallback;
};

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
   * Get user by email
   */
  async getUserByEmail(email: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.models.SystemUser.list({
        filter: { email: { eq: email } },
      });
      if (errors) {
        console.error('Error fetching user by email:', errors);
        throw new Error('Failed to fetch user');
      }
      return data[0] || null;
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      throw error;
    }
  },
  /**
   * Create a new system user with Cognito authentication using AdminCreateUser
   * Sends invitation email with custom template and temporary password
   */
  async createUser(userData: Omit<SystemUser, 'id'>) {
    try {
      // Check if employee ID already exists
      const existingUser = await this.getUserByEmployeeId(userData.employeeId);
      if (existingUser) {
        throw new Error('Employee ID already exists');
      }

      // Check if email already exists
      const existingEmail = await this.getUserByEmail(userData.email);
      if (existingEmail) {
        throw new Error('Email address already exists');
      }

      // Generate a temporary password for the user
      const tempPassword = this.generateTemporaryPassword();

      // Create Cognito user via Lambda (skipped if no auth session, e.g. dev bypass mode)
      let hasAuthSession = false;
      try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString() ?? '';
        hasAuthSession = !!accessToken;
      } catch {
        hasAuthSession = false;
      }

      if (hasAuthSession) {
        try {
          const session = await fetchAuthSession();
          const accessToken = session.tokens?.accessToken?.toString() ?? '';

          console.log('Creating user via Lambda with email:', userData.email);
          
          // Call Lambda via AppSync endpoint
          const response = await fetch(
            outputs.data.url,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': accessToken,
              },
              body: JSON.stringify({
                query: `
                  mutation CreateUser($email: String!, $name: String!, $password: String!) {
                    createUser(email: $email, name: $name, password: $password) {
                      success
                      username
                    }
                  }
                `,
                variables: {
                  email: userData.email,
                  name: userData.name,
                  password: tempPassword,
                },
              }),
            }
          );

          // Check if response is OK before parsing
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
          }

          // Check if response has content
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Expected JSON response but got: ${contentType || 'no content-type'}`);
          }

          const result = await response.json() as { data?: { createUser?: { success: boolean } }; errors?: Array<{ message: string }> };
          
          if (result.errors && result.errors.length > 0) {
            throw new Error(result.errors[0].message);
          }

          if (!result.data?.createUser?.success) {
            throw new Error('Failed to create Cognito user');
          }

          console.log('Cognito user created via Lambda. Invitation email sent to:', userData.email);
        } catch (cognitoError: unknown) {
          console.error('Cognito user creation error:', cognitoError);
          const errorMsg = cognitoError instanceof Error ? cognitoError.message : 'Unknown error';
          
          // Provide more user-friendly error messages
          if (errorMsg.includes('already exists') || errorMsg.includes('UsernameExistsException')) {
            throw new Error('This email address is already registered in the system. Please use a different email or contact the administrator.');
          }
          
          throw new Error('Failed to create authentication account: ' + errorMsg);
        }
      } else {
        console.warn('⚠️ DEV BYPASS: No auth session found. Skipping Cognito user creation. DB record will still be created.');
      }

      // Create user in database
      const dbClient = getClient();
      const { data, errors } = await dbClient.models.SystemUser.create(userData);
      if (errors) {
        console.error('Error creating user in database:', errors);
        throw new Error('Failed to create user in database');
      }

      console.log('User created successfully in database');
      
      return data;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  },

  /**
   * Generate a secure temporary password
   */
  generateTemporaryPassword(): string {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  },

  /**
   * Send password reset email to user via admin API
   * Generates a temporary password and sends it via email
   */
  async sendPasswordResetEmail(email: string) {
    try {
      const client = getClient();
      const { data, errors } = await client.mutations.adminResetUserPassword({
        email,
      });

      if (errors) {
        console.error('GraphQL errors:', errors);
        throw new Error('Failed to reset password');
      }

      console.log('Password reset result:', data);
      
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to send password reset email');
      }

      return { success: true };
    } catch (error: unknown) {
      console.error('Error sending password reset email:', error);
      const details = getErrorDetails(error);
      
      // Handle specific Cognito errors
      if (details.name === 'InvalidParameterException' || details.message?.includes('no registered/verified email')) {
        throw new Error('The user has not verified their email address yet. Please ask the user to check their email and verify their account first.');
      }
      
      if (details.name === 'UserNotFoundException') {
        throw new Error('User not found in the authentication system.');
      }

      throw new Error('Failed to send password reset email: ' + getErrorMessage(error, 'Unknown error'));
    }
  },

  /**
   * Resend verification email to user via Cognito
   */
  async resendVerificationEmail(email: string) {
    try {
      await resendSignUpCode({ username: email });
      console.log('Verification email resent to:', email);
      return { success: true };
    } catch (error: unknown) {
      console.error('Error resending verification email:', error);
      const details = getErrorDetails(error);
      
      if (details.name === 'UserNotFoundException') {
        throw new Error('User not found in the authentication system.');
      }
      
      if (details.name === 'InvalidParameterException' && details.message?.includes('already confirmed')) {
        throw new Error('This user has already verified their email address.');
      }
      
      throw new Error('Failed to resend verification email: ' + getErrorMessage(error, 'Unknown error'));
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
   * Delete a system user (both from Cognito and database)
   */
  async deleteUser(id: string) {
    try {
      const client = getClient();
      
      // First, get the user to retrieve their email
      const { data: userData, errors: getUserErrors } = await client.models.SystemUser.get({ id });
      if (getUserErrors || !userData) {
        console.error('Error getting user for deletion:', getUserErrors);
        throw new Error('Failed to find user to delete');
      }

      const userEmail = userData.email;
      console.log('Deleting user from Cognito with email:', userEmail);

      // Delete from Cognito first using the mutation
      try {
        const { data: cognitoResult, errors: cognitoErrors } = await client.mutations.adminDeleteUser({
          email: userEmail,
        });

        if (cognitoErrors) {
          console.error('Error deleting user from Cognito:', cognitoErrors);
          // Continue to delete from DB even if Cognito deletion fails (user might not exist in Cognito)
          console.warn('Continuing to delete from database despite Cognito error');
        } else if (cognitoResult?.success) {
          console.log('Successfully deleted user from Cognito:', cognitoResult.message);
        }
      } catch (cognitoError) {
        console.error('Exception deleting user from Cognito:', cognitoError);
        // Continue to delete from DB even if Cognito deletion fails
        console.warn('Continuing to delete from database despite Cognito exception');
      }

      // Delete from database
      const { data, errors } = await client.models.SystemUser.delete({ id });
      if (errors) {
        console.error('Error deleting user from database:', errors);
        throw new Error('Failed to delete user from database');
      }
      
      console.log('Successfully deleted user from database');
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
      const active = users.filter(u => u.status === 'active').length;
      const inactive = users.filter(u => u.status === 'inactive').length;
      const allowedAccess = users.filter(u => u.dashboardAccess === 'allowed').length;
      const blockedAccess = users.filter(u => u.dashboardAccess === 'blocked').length;

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
      
      return users.filter(user =>
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
