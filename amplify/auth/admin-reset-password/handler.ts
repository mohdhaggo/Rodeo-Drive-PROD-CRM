import { CognitoIdentityProviderClient, AdminSetUserPasswordCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

// Generate random temporary password meeting Cognito requirements
function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  const all = uppercase + lowercase + numbers + symbols;
  for (let i = password.length; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export const handler = async (event: any) => {
  console.log('adminResetUserPassword event:', JSON.stringify(event, null, 2));

  const email = event.arguments?.email || event.email;
  const userPoolId = 'ap-southeast-1_KpgCf5P7L';

  try {
    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    console.log('Generated temporary password for:', email);

    // Get user details to find username
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    });

    const userResponse = await cognitoClient.send(getUserCommand);
    const userName = userResponse.Username;

    // Set temporary password on user account
    // Setting Permanent: false allows user to set a new password on next login
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: userName,
      Password: tempPassword,
      Permanent: false,
    });

    await cognitoClient.send(setPasswordCommand);
    console.log('Temporary password set for user:', email);
    console.log('Temporary password:', tempPassword); // Visible in CloudWatch logs for admin to send manually

    return {
      success: true,
      message: `Temporary password has been set for ${email}. Admin must send password to user securely.`,
      tempPassword: tempPassword, // Return password so admin can send it
    };
  } catch (error: any) {
    console.error('Error in adminResetUserPassword:', error);
    
    let errorMessage = 'Failed to reset password';
    
    if (error.name === 'UserNotFoundException') {
      errorMessage = 'User not found in the authentication system';
    } else if (error.name === 'InvalidParameterException') {
      errorMessage = 'Invalid parameters provided';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
};
