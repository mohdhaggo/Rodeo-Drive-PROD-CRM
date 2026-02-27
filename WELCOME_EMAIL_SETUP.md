# Welcome Email on User Creation

## Overview
When an admin creates a new user via the System Users page, a welcome email is automatically sent to the user's email address. This email contains their account details and instructions for accessing the CRM system.

## Implementation

### Lambda Function
**Location:** [amplify/functions/send-welcome-email/](amplify/functions/send-welcome-email/)

The Lambda function handles:
- **Email Service:** AWS SES (Simple Email Service)
- **Content:** HTML and plain text versions of welcome email
- **Styling:** Professional email template with company branding
- **Error Handling:** Graceful error handling to prevent user creation from failing if email sending fails

### File Structure
```
amplify/functions/send-welcome-email/
├── resource.ts      # Lambda function definition
├── handler.ts       # Email sending logic
├── package.json     # Dependencies (AWS SDK for SES)
├── tsconfig.json    # TypeScript configuration
└── .gitignore       # Git ignore rules
```

### Backend Integration
**File:** [amplify/backend.ts](amplify/backend.ts)

The `send-welcome-email` function is registered as a backend function:
```typescript
import { sendWelcomeEmail } from './functions/send-welcome-email/resource';

defineBackend({
  functions: {
    sendWelcomeEmail,
  },
});
```

### Frontend Integration
**File:** [src/pages/SystemUsers.tsx](src/pages/SystemUsers.tsx)

When a new user is created:
1. Admin fills in user details and submits the form
2. User is created in the database
3. `invokeFunction` is called to trigger the Lambda function
4. Welcome email is sent to the user's email address
5. User creation confirms success message

```typescript
// Send welcome email to the new user
try {
  await invokeFunction({
    functionName: 'send-welcome-email',
    payload: {
      email,
      name: employeeName,
      employeeId,
      department: dept.name,
      role: role.name,
    },
  });
  console.log(`Welcome email sent to ${email}`);
} catch (emailError) {
  console.error('Error sending welcome email:', emailError);
  // Don't block user creation if email fails
}
```

## Email Template

The welcome email includes:
- **Header:** Company branding with gradient (matching app theme)
- **User Details:** Name, Employee ID, Email, Department, Role
- **Instructions:** How to log in and set password
- **Security Notice:** Warning to keep credentials secure
- **Support Information:** Contact information for assistance
- **Footer:** Automated message notice and copyright

### Email Sections
1. **Welcome Message** - Friendly greeting
2. **Account Details Table** - All relevant user information
3. **Getting Started Guide** - Step-by-step login instructions
4. **Security Warning** - Important security information
5. **Support Footer** - Contact and legal information

## Setup Requirements

### AWS SES Configuration
Before emails can be sent, AWS SES must be properly configured:

1. **Verify Email Domain/Address:**
   - Go to AWS SES console
   - Add verified email address as sender
   - Configure DKIM/SPF records for domain

2. **Move Out of Sandbox (Production):**
   - Request production access in SES console
   - Set appropriate sending limits
   - Configure bounce and complaint notifications

3. **Environment Variables:**
   - `FROM_EMAIL` - Sender email address (default: noreply@rodeo-drive.com)
   - `AWS_REGION` - AWS region for SES (default: us-east-1)

### Lambda Execution Role Permissions
The Lambda function requires IAM permissions:
```json
{
  "Effect": "Allow",
  "Action": ["ses:SendEmail", "ses:SendRawEmail"],
  "Resource": "*"
}
```

## Testing

### Local Testing
To test the email function locally:

1. Run Amplify sandbox:
   ```bash
   npx @aws-amplify/backend-cli sandbox
   ```

2. Create a user via System Users page
3. Check email in your mailbox or AWS SES console

### Mock Testing
For development without AWS SES:
- Use AWS SES test email addresses
- Check CloudWatch logs for function execution
- Verify payload structure in Lambda handler

## Error Handling

The implementation is designed to be fault-tolerant:
- If email sending fails, it logs the error but **does not** prevent user creation
- Admin can manually send password reset email later if needed
- Error messages are logged to CloudWatch for debugging

## Future Enhancements

1. **Email Templates:**
   - Configurable email templates via database
   - Support for multiple languages
   - Custom branding per department

2. **Scheduled Emails:**
   - Follow-up emails after 7 days if no login
   - Password expiration reminders
   - Account activity notifications

3. **Email Verification:**
   - Implement double opt-in
   - Email verification before account activation
   - Prevent typos in email addresses

4. **Batch Operations:**
   - Bulk user creation with email notifications
   - CSV import with email sending
   - Scheduled bulk onboarding campaigns

5. **Advanced Features:**
   - Email delivery status tracking
   - Bounce/complaint handling
   - Unsubscribe management
   - Email analytics

## Troubleshooting

### Email Not Received
- Check AWS SES sandbox status
- Verify sender email is verified in SES
- Check spam/junk folder
- Review CloudWatch logs for errors

### Email Contains Test Content
- Update `handler.ts` with actual company information
- Customize sender address in `FROM_EMAIL`
- Modify email templates as needed

### Lambda Timeout
- Increase Lambda timeout in Amplify configuration
- Check SES service availability
- Verify network connectivity

## Related Files
- [ADMIN_ONLY_SIGNUP.md](ADMIN_ONLY_SIGNUP.md) - Admin signup configuration
- [amplify/auth/resource.ts](amplify/auth/resource.ts) - Authentication setup
- [amplify/data/resource.ts](amplify/data/resource.ts) - System User schema
