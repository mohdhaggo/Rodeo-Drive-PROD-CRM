import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendWelcomeEmail } from './functions/send-welcome-email/resource';

defineBackend({
  auth,
  data,
  functions: {
    sendWelcomeEmail,
  },
});
