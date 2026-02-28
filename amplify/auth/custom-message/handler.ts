import type { CustomMessageTriggerEvent } from 'aws-lambda';

export const handler = async (event: CustomMessageTriggerEvent) => {
  console.log('CustomMessage trigger invoked with source:', event.triggerSource);
  console.log('Full event:', JSON.stringify(event, null, 2));

  const domainUrl = 'http://localhost:5174/';
  const userAttributes = event.request.userAttributes;
  const name = userAttributes.name || 'User';
  const username = event.userName;

  // Handle Admin Create User invitation emails
  if (event.triggerSource === 'CustomMessage_AdminCreateUser') {
    const tempPassword = event.request.codeParameter || '{####}';

    event.response.emailSubject = '🎉 Welcome to RodeoDrive CRM';
    event.response.emailMessage = generateWelcomeEmail(domainUrl, name, username, tempPassword);
  }

  // Handle Forgot Password and Resend Code emails - user-initiated flows
  if (event.triggerSource === 'CustomMessage_ForgotPassword' || 
      event.triggerSource === 'CustomMessage_ResendCode') {
    const resetCode = event.request.codeParameter || '{####}';

    event.response.emailSubject = 'Reset your password';
    event.response.emailMessage = generatePasswordResetEmail(name, resetCode);
  }

  // Handle Admin Set User Password - admin-initiated password reset
  // Note: AWS type definitions may not include this trigger source, so we check the string directly
  const triggerSource = event.triggerSource as string;
  if (triggerSource === 'CustomMessage_AdminSetUserPassword') {
    const tempPassword = (event as any).request.codeParameter || '{####}';

    (event as any).response.emailSubject = 'Reset your password';
    (event as any).response.emailMessage = generatePasswordResetEmail(name, tempPassword);
  }

  // For other trigger sources, pass through unchanged
  return event;
};

function generateWelcomeEmail(domainUrl: string, name: string, username: string, tempPassword: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .credentials { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .credentials p { margin: 10px 0; }
    .credentials strong { color: #667eea; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .button:hover { background: #764ba2; }
    .warning { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏁 Welcome to RodeoDrive CRM</h1>
    </div>
    <div class="content">
      <h2>Hello ${name}! 👋</h2>
      <p>Your account has been successfully created. We're thrilled to have you join our team!</p>
      
      <div class="credentials">
        <h3>🔐 Your Login Credentials</h3>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 5px 10px; border-radius: 3px;">${tempPassword}</code></p>
      </div>
      
      <div style="text-align: center;">
        <a href="${domainUrl}" class="button">🚀 Login to Your Account</a>
      </div>
      
      <div class="warning">
        <h4>⚠️ Important Security Notice</h4>
        <ul>
          <li>You will be required to change this password on your first login</li>
          <li>Never share your credentials with anyone</li>
          <li>Use a strong, unique password for your account</li>
        </ul>
      </div>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} RodeoDrive CRM. All rights reserved.</p>
      <p style="font-size: 12px;">This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generatePasswordResetEmail(name: string, resetCode: string): string {
  return `Dear ${name},

We received a request to reset the password for your account associated with this email address.

To reset your password, please use the code below (this code will expire in 2 hours):

Temporary Password: ${resetCode}

If you did not request a password reset, please ignore this email. Your password will remain unchanged, and your account is secure.

Best Regards,
RodeoDrive CRM Team`;
}
