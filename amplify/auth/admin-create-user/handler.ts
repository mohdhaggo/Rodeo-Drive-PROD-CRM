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

  // Declare variables in outer scope for error logging
  let email = '';
  let userPoolId = 'ap-southeast-1_KpgCf5P7L';

  try {
    // Handle both AppSync format (event.arguments) and direct invocation format
    const args = 'arguments' in event ? event.arguments : event;
    
    const { email: userEmail, name, password } = args;
    email = userEmail;

    console.log('Extracted params:', { userPoolId, email, name, password: '***' });

    if (!email || !name || !password) {
      console.error('Missing required parameters');
      throw new Error('Missing required parameters: email, name, and password are required');
    }

    console.log('Creating user in pool:', userPoolId, 'with username (email):', email);

    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
      ],
      MessageAction: 'SUPPRESS', // Suppress auto-generated email, use custom message trigger instead
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
    const errorType = (error as any)?.__type || (error as any)?.name || 'Unknown';
    console.error('Error type:', errorType);
    console.error('Error details:', errorMessage);

    // Provide user-friendly error messages
    if (errorMessage.includes('UsernameExistsException') || errorMessage.includes('already exists') || errorType === 'UsernameExistsException') {
      throw new Error('User account already exists');
    }
    
    if (errorMessage.includes('InvalidPasswordException') || errorType === 'InvalidPasswordException') {
      throw new Error('Invalid password format');
    }

    // Log more specific error info for debugging
    console.error('Cognito error type:', errorType);
    console.error('Pool ID used:', userPoolId);
    console.error('Email attempted:', email);

    // For AppSync, throw error to be returned as GraphQL error
    throw new Error(`Failed to create user: ${errorMessage}`);
  }
};
