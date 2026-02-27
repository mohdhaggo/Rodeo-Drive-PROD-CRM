import { defineFunction } from '@aws-amplify/backend';

export const sendWelcomeEmail = defineFunction({
  name: 'send-welcome-email',
  entry: './handler.ts',
});
