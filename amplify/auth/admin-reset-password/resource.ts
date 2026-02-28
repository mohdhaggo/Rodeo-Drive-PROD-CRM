import { defineFunction } from '@aws-amplify/backend';

export const adminResetUserPasswordFunction = defineFunction({
  name: 'admin-reset-password',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
  environment: {
    USER_POOL_ID: 'ap-southeast-1_KpgCf5P7L',
  },
});
