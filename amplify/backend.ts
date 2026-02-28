import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { adminCreateUserFunction } from './auth/admin-create-user/resource';
import { adminResetUserPasswordFunction } from './auth/admin-reset-password/resource';
import { adminDeleteUserFunction } from './auth/admin-delete-user/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  adminCreateUserFunction,
  adminResetUserPasswordFunction,
  adminDeleteUserFunction,
});

// Add comprehensive permissions for the Lambda to manage Cognito users
backend.adminCreateUserFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminSetUserPassword',
    ],
    resources: [
      backend.auth.resources.userPool.userPoolArn,
      'arn:aws:cognito-idp:ap-southeast-1:836595559002:userpool/ap-southeast-1_KpgCf5P7L', // Original pool
    ],
  })
);

// Add permissions for admin reset password Lambda
backend.adminResetUserPasswordFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminSetUserPassword',
    ],
    resources: [
      backend.auth.resources.userPool.userPoolArn,
      'arn:aws:cognito-idp:ap-southeast-1:836595559002:userpool/ap-southeast-1_KpgCf5P7L', // Original pool
    ],
  })
);

// Add permissions for admin delete user Lambda
backend.adminDeleteUserFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminDeleteUser',
      'cognito-idp:AdminGetUser',
    ],
    resources: [
      backend.auth.resources.userPool.userPoolArn,
      'arn:aws:cognito-idp:ap-southeast-1:836595559002:userpool/ap-southeast-1_KpgCf5P7L', // Original pool
    ],
  })
);
