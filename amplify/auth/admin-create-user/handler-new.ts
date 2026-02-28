import { CognitoIdentityProviderClient, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

interface AppSyncEvent {
  arguments: CreateUserInput;
  identity?: {
    sub: string;
    username: string;
  };
}

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler = async (event: AppSyncEvent | CreateUserInput) => {
  console.log('AdminCreateUser Lambda invoked:', JSON.stringify(event));

  try {
    // Handle both AppSync format (event.arguments) and direct invocation format
    const args = 'arguments' in event ? event.arguments : event;
    
    const { email, name, password } = args;
    // Pool ID is hardcoded but typically set via env var during deployment
    const userPoolId = 'ap-southeast-1_KpgCf5P7L';

    console.log('Extracted params:', { userPoolId, email, name, password: '***' });

    if (!email || !name || !password) {
      console.error('Missing required parameters');
      throw new Error('Missing required parameters: email, name, and password are required');
    }

    console.log('Creating user in pool:', userPoolId, 'with username:', email);

    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
      ],
      MessageAction: 'RESEND', // Send invitation email with temporary password
      DesiredDeliveryMediums: ['EMAIL'],
    });

    const response = await cognitoClient.send(command);
    console.log('User created successfully:', response.User?.Username);

    // Return format for AppSync
    return {
      success: true,
      username: response.User?.Username || email,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);

    // Provide user-friendly error messages
    if (errorMessage.includes('UsernameExistsException') || errorMessage.includes('already exists')) {
      throw new Error('User account already exists');
    }
    
    if (errorMessage.includes('InvalidPasswordException')) {
      throw new Error('Invalid password format');
    }

    if (errorMessage.includes('does not exist') || errorMessage.includes('UserPoolId')) {
      throw new Error('User pool not found or not accessible');
    }

    // For AppSync, throw error to be returned as GraphQL error
    throw new Error(`Failed to create user: ${errorMessage}`);
  }
};
