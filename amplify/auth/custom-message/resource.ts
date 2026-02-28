import { defineFunction } from '@aws-amplify/backend';

export const customMessage = defineFunction({
  name: 'custom-message',
  entry: './handler.ts',
  environment: {
    APP_DOMAIN_URL: 'https://main.d2twgrdrz02e5i.amplifyapp.com/', // Change this to your actual domain
  },
});
