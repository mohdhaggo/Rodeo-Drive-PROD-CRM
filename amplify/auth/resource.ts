import { defineAuth, defineFunction } from '@aws-amplify/backend';

const postConfirmation = defineFunction({
  name: 'post-confirmation',
  entry: './post-confirmation/handler.ts',
});

const customMessage = defineFunction({
  name: 'custom-message',
  entry: './custom-message/handler.ts',
  environment: {
    APP_DOMAIN_URL: 'https://main.d2twgrdrz02e5i.amplifyapp.com/', // Change to your actual app URL
  },
});

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
  triggers: {
    postConfirmation,
    customMessage,
  },
});
