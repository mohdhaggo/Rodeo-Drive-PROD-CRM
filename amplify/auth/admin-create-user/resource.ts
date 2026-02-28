import { defineFunction } from '@aws-amplify/backend';

export const adminCreateUserFunction = defineFunction({
  name: 'admin-create-user',
  entry: './handler.ts',
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
});
