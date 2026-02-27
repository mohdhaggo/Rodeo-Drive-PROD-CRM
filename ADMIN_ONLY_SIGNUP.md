# Admin-Only Signup Configuration

## Overview
The application has been configured for **admin-only user creation**. Users cannot self-register; only administrators can create new accounts.

## Changes Made

### 1. Frontend Changes ([src/App.tsx](src/App.tsx))
- Added `hideSignUp` prop to the `Authenticator` component
- Login screen now only shows the sign-in tab
- Signup tab is completely hidden from users

### 2. Backend Configuration ([amplify/auth/resource.ts](amplify/auth/resource.ts))
- Configured email-based authentication for login only
- Added account recovery via email for password resets
- User attributes configured with required email field

## Admin Workflow

### Creating New Users
1. **Login** - Use existing admin credentials to log in
2. **Navigate** - Go to "System Users" page in the admin section
3. **Add User** - Click "Add User" button to create new account
4. **Fill Details** - Enter:
   - Employee ID
   - Employee Name
   - Email Address
   - Mobile Number
   - Department
   - Role
   - Line Manager (optional)
5. **Submit** - New user is created with temporary password
6. **Send Password** - Use "Send Password Reset Email" to notify user

### Password Reset
- Users can request password reset from the login screen
- Admins can send password reset emails from System Users page

## Technical Details

- Users cannot access signup form
- Only Cognito admins (via AWS Console or API) can create users programmatically
- System Users page provides the UI for admin user creation
- Each created user gets default settings:
  - Status: Active
  - Dashboard Access: Allowed
  - Failed Login Attempts: 0

## Future Enhancements
- Automated welcome email with temporary credentials
- Bulk user import functionality
- User invitation workflow with email verification
- Role-based access controls for admin functions
