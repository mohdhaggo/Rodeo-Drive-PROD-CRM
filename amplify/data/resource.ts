import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { adminCreateUserFunction } from '../auth/admin-create-user/resource';
import { adminResetUserPasswordFunction } from '../auth/admin-reset-password/resource';
import { adminDeleteUserFunction } from '../auth/admin-delete-user/resource';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  Department: a
    .model({
      name: a.string().required(),
      description: a.string(),
      roles: a.hasMany("Role", "departmentId"),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  Role: a
    .model({
      name: a.string().required(),
      description: a.string(),
      departmentId: a.id().required(),
      department: a.belongsTo("Department", "departmentId"),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  SystemUser: a
    .model({
      employeeId: a.string().required(),
      name: a.string().required(),
      email: a.string().required(),
      mobile: a.string().required(),
      departmentId: a.id().required(),
      roleId: a.id().required(),
      lineManagerId: a.id(),
      status: a.enum(['active', 'inactive']),
      dashboardAccess: a.enum(['allowed', 'blocked']),
      failedLoginAttempts: a.integer().default(0),
      createdDate: a.string().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
  
  // Custom mutation for creating Cognito users
  createUser: a
    .mutation()
    .arguments({
      email: a.string().required(),
      name: a.string().required(),
      password: a.string().required(),
    })
    .returns(
      a.customType({
        success: a.boolean().required(),
        username: a.string(),
      })
    )
    .handler(a.handler.function(adminCreateUserFunction))
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  // Custom mutation for admin password reset with temporary password
  adminResetUserPassword: a
    .mutation()
    .arguments({
      email: a.string().required(),
    })
    .returns(
      a.customType({
        success: a.boolean().required(),
        message: a.string(),
      })
    )
    .handler(a.handler.function(adminResetUserPasswordFunction))
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),

  // Custom mutation for deleting Cognito users
  adminDeleteUser: a
    .mutation()
    .arguments({
      email: a.string().required(),
    })
    .returns(
      a.customType({
        success: a.boolean().required(),
        message: a.string(),
      })
    )
    .handler(a.handler.function(adminDeleteUserFunction))
    .authorization((allow) => [allow.publicApiKey(), allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
