# Welcome Email on User Creation

## Overview
When a new user is created by an admin via the System Users page and their account is confirmed in Cognito, a welcome email is automatically sent to their email address. This email is sent through a **post-confirmation trigger** - an AWS Lambda function that runs automatically when a user confirms their email.

## Implementation

### Cognito Post-Confirmation Trigger
**Location:** [amplify/auth/post-confirmation/](amplify/auth/post-confirmation/)

The post-confirmation trigger Lambda function handles:
- **When it runs:** Automatically after user confirms their email in Cognito
- **Email Service:** AWS SES (Simple Email Service)
- **Content:** HTML and plain text versions of welcome email
- **Styling:** Professional email template with company branding
- **Error Handling:** Graceful error handling to prevent user confirmation from failing if email sending fails

### File Structure
```
amplify/auth/post-confirmation/
├── resource.ts      # Lambda trigger definition
├── handler.ts       # Email sending logic
├── package.json     # Dependencies (AWS SDK for SES, AWS Lambda types)
├── tsconfig.json    # TypeScript configuration
└── .gitignore       # Git ignore rules
```

### Backend Integration
**File:** [amplify/auth/resource.ts](amplify/auth/resource.ts)

The post-confirmation trigger is registered in the auth configuration:
```typescript
import { postConfirmation } from './post-confirmation/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  triggers: {
    postConfirmation,
  },
});
```

### Frontend Integration
**File:** [src/pages/SystemUsers.tsx](src/pages/SystemUsers.tsx)

When admin creates a new user:
1. Admin fills in user details and submits the form
2. User is created in the database
3. User is created in Cognito user pool
4. **Automatically:** Post-confirmation trigger Lambda runs
5. Welcome email is sent to user's email address

Simple process - no additional code needed on frontend!

## Email Template

The welcome email includes:
- **Header:** Company branding with gradient (matching app theme)
- **Opening Message:** Welcome greeting
- **Account Status:** Confirmation that account is active
- **Getting Started Instructions:** How to log in
- **Security Notice:** Password security tips
- **Support Information:** Contact information for assistance
- **Footer:** Automated message notice and copyright

### Email Sections
1. **Welcome Message** - Account is ready to use
2. **Getting Started Guide** - Step-by-step login instructions including password reset
3. **Security Warning** - Importance of keeping credentials secure
4. **Support Footer** - Contact and legal information

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
The Lambda function (via Cognito) requires IAM permissions:
```json
{
  "Effect": "Allow",
  "Action": ["ses:SendEmail", "ses:SendRawEmail"],
  "Resource": "*"
}
```

Amplify automatically configures these permissions when deploying the post-confirmation trigger.

## User Email Workflow

### 1. Admin Creates User (System Users Page)
- Admin enters user details (name, email, department, role, etc.)
- User is created in SystemUser database table
- User is created in Cognito user pool with **FORCE_CHANGE_PASSWORD** status
- User receives email with temporary credentials

### 2. User Confirms Email
- User receives Cognito confirmation email (automatically from Cognito)
- User clicks confirmation link or uses confirmation code

### 3. Post-Confirmation Trigger Runs
- Lambda function is triggered automatically by Cognito
- **Our custom welcome email is sent** with company branding
- Email contains login instructions and security tips

### 4. User Logs In
- User uses email address and password to log in
- If password reset email was sent by admin, user can use that link

## Testing

### Local Testing
To test the email function locally:

1. Run Amplify sandbox:
   ```bash
   npx @aws-amplify/backend-cli sandbox
   ```

2. Create a user via System Users page
3. When Cognito creates user, confirm the email (via console or test)
4. Check email in your mailbox or AWS SES console

### Mock Testing
For development without AWS SES:
- Use AWS SES test email addresses
- Check CloudWatch logs for function execution
- Verify the post-confirmation trigger is being invoked

### Logs & Monitoring
Monitor post-confirmation execution:
- **CloudWatch Logs:** `/aws/lambda/post-confirmation-[hash]`
- **Cognito Console:** User sign-up activity
- **SES Console:** Email delivery status

## Error Handling

The implementation is designed to be fault-tolerant:
- If email sending fails, it logs the error but **does not** block user confirmation
- User's Cognito account remains active and usable
- Admin can manually resend welcome email if needed
- Error messages are logged to CloudWatch for debugging

## Comparison: Admin-Created vs Self-Signup

| Scenario | Process | Email |
|----------|---------|-------|
| **Admin Creates User** | Admin creates via UI → Cognito creates account → User confirms email | Post-confirmation trigger sends welcome email |
| **Self-Signup** | User signs up (disabled in this app) | N/A - signup is hidden |

## Related Files
- [ADMIN_ONLY_SIGNUP.md](ADMIN_ONLY_SIGNUP.md) - Admin signup configuration
- [amplify/auth/resource.ts](amplify/auth/resource.ts) - Authentication setup with post-confirmation trigger
- [amplify/data/resource.ts](amplify/data/resource.ts) - System User schema
- [src/pages/SystemUsers.tsx](src/pages/SystemUsers.tsx) - Admin user creation UI

## Troubleshooting

### Email Not Received
- Check AWS SES sandbox status (may need production access)
- Verify sender email is verified in SES console
- Check spam/junk folder
- Review CloudWatch logs for Lambda execution errors
- Confirm user's email was confirmed (not just created)

### Lambda Timeout or Execution Error
- Check CloudWatch logs in `/aws/lambda/post-confirmation-*`
- Verify SES permissions in IAM role
- Test SES sending capability directly in console

### Missing Environment Variables
- `FROM_EMAIL` must be set if not using default
- Check Lambda environment variables in AWS console
- Restart Amplify sandbox after env changes

### Email Template Issues
- Update sender address in `FROM_EMAIL` variable
- Modify email templates in `handler.ts`
- Test with different email addresses to verify content

## Future Enhancements

1. **Email Templates:**
   - Store templates in database for easy updates
   - Support for multiple languages
   - Custom branding per department

2. **Additional Triggers:**
   - Pre-sign-up trigger to auto-confirm admin-created users
   - Custom message trigger to customize Cognito emails
   - Post-authentication triggers for login notifications

3. **Email Tracking:**
   - Email delivery status tracking  
   - Bounce/complaint handling
   - User engagement analytics

4. **Scheduled Communications:**
   - Password expiration reminders
   - Activity notifications
   - Department-specific announcements

