import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * Admin-only user creation - self signup is disabled
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  accountRecovery: 'EMAIL_ONLY',
  userAttributes: {
    email: {
      mutable: true,
      required: true,
    },
  },
});
