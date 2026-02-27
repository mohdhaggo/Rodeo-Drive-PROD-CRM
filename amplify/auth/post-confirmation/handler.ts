/// <reference types="node" />
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { PostConfirmationTriggerEvent } from 'aws-lambda';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  console.log('Post-confirmation trigger invoked:', event);

  try {
    const userEmail = event.request.userAttributes.email;
    const userName = event.request.userAttributes.name || event.userName;
    const userSub = event.request.userAttributes.sub;

    console.log(`User ${userName} (${userEmail}) confirmed`);

    // Send welcome email
    const subject = 'Welcome to Rodeo Drive CRM System';
    const htmlContent = generateWelcomeEmailHTML(userName, userEmail);
    const textContent = generateWelcomeEmailText(userName, userEmail);

    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'noreply@rodeo-drive.com',
      Destination: {
        ToAddresses: [userEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textContent,
            Charset: 'UTF-8',
          },
        },
      },
    });

    const response = await sesClient.send(command);
    console.log('Welcome email sent successfully:', response.MessageId);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw - we don't want to block user confirmation
  }

  return event;
};

function generateWelcomeEmailHTML(name: string, email: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .info-block { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Rodeo Drive CRM</h1>
      <p>Your account is ready to use</p>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      
      <p>Your account has been successfully created and activated in the Rodeo Drive CRM system.</p>
      
      <p><strong>Account Details:</strong></p>
      <div class="info-block">
        <p><strong>Email:</strong> ${email}</p>
      </div>
      
      <p><strong>Getting Started:</strong></p>
      <ol>
        <li>Log in using your email address</li>
        <li>Your account is now active and ready to use</li>
        <li>If you need to reset your password, use the password reset option on the login page</li>
      </ol>
      
      <div class="info-block" style="border-left-color: #f59e0b; background-color: #fffbeb;">
        <p style="margin: 0;"><strong>Security Tip:</strong> Keep your credentials secure and never share your password with anyone.</p>
      </div>
      
      <p>If you have any questions or need assistance, please contact your system administrator.</p>
      
      <p>Best regards,<br><strong>Rodeo Drive CRM Team</strong></p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Rodeo Drive. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateWelcomeEmailText(name: string, email: string): string {
  return `
Welcome to Rodeo Drive CRM

Hello ${name},

Your account has been successfully created and activated in the Rodeo Drive CRM system.

Account Details:
Email: ${email}

Getting Started:
1. Log in using your email address
2. Your account is now active and ready to use
3. If you need to reset your password, use the password reset option on the login page

Security Tip: Keep your credentials secure and never share your password with anyone.

If you have any questions or need assistance, please contact your system administrator.

Best regards,
Rodeo Drive CRM Team

---
This is an automated message, please do not reply to this email.
© 2026 Rodeo Drive. All rights reserved.
  `;
}
