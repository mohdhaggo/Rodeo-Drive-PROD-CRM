import type { PostConfirmationTriggerEvent } from 'aws-lambda';

export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  console.log('Post-confirmation trigger invoked:', event);

  try {
    const userEmail = event.request.userAttributes.email;
    const userName = event.request.userAttributes.name || event.userName;

    console.log(`User ${userName} (${userEmail}) confirmed`);
    // Post-confirmation hook - user account is now active
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error);
    // Don't throw - we don't want to block user confirmation
  }

  return event;
};
