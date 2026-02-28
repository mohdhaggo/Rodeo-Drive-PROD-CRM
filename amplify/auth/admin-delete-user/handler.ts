import { AdminDeleteUserCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

export const handler = async (event: { arguments: { email: string } }) => {
  const { email } = event.arguments;

  console.log("Admin Delete User invoked for email:", email);

  // Hardcoded user pool ID to match other Lambda functions
  const userPoolId = 'ap-southeast-1_KpgCf5P7L';

  try {
    // Delete the user from Cognito
    const deleteCommand = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: email, // Email is used as username
    });

    await cognitoClient.send(deleteCommand);

    console.log(`Successfully deleted user ${email} from Cognito`);

    return {
      success: true,
      message: `User ${email} has been deleted from authentication system`,
    };
  } catch (error: unknown) {
    console.error("Error deleting user from Cognito:", error);

    if (error instanceof Error) {
      // Handle specific Cognito errors
      if (error.name === 'UserNotFoundException') {
        console.warn(`User ${email} not found in Cognito, may have been already deleted`);
        // Return success if user doesn't exist (idempotent operation)
        return {
          success: true,
          message: `User ${email} was not found in authentication system (may have been already deleted)`,
        };
      }

      return {
        success: false,
        message: `Failed to delete user: ${error.message}`,
      };
    }

    return {
      success: false,
      message: "Failed to delete user from authentication system",
    };
  }
};
