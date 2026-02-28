import { defineFunction } from '@aws-amplify/backend';

export const adminDeleteUserFunction = defineFunction({
  name: 'admin-delete-user',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
