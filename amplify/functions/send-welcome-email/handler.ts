import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface EmailParams {
  email: string;
  name: string;
  employeeId: string;
  department: string;
  role: string;
  resetPasswordLink?: string;
}

export const handler = async (event: EmailParams) => {
  console.log('Sending welcome email to:', event.email);

  const subject = 'Welcome to Rodeo Drive CRM System';
  const htmlContent = generateWelcomeEmailHTML(event);
  const textContent = generateWelcomeEmailText(event);

  try {
    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'noreply@rodeo-drive.com',
      Destination: {
        ToAddresses: [event.email],
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
    console.log('Email sent successfully:', response.MessageId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email sent successfully',
        messageId: response.MessageId,
      }),
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

function generateWelcomeEmailHTML(params: EmailParams): string {
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
    .label { font-weight: bold; color: #667eea; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Rodeo Drive CRM</h1>
      <p>Your account has been created</p>
    </div>
    <div class="content">
      <p>Hello ${params.name},</p>
      
      <p>Your account has been successfully created in the Rodeo Drive CRM system. Below are your account details:</p>
      
      <div class="info-block">
        <p><span class="label">Name:</span> ${params.name}</p>
        <p><span class="label">Employee ID:</span> ${params.employeeId}</p>
        <p><span class="label">Email:</span> ${params.email}</p>
        <p><span class="label">Department:</span> ${params.department}</p>
        <p><span class="label">Role:</span> ${params.role}</p>
      </div>
      
      <p><strong>To get started:</strong></p>
      <ol>
        <li>Use your email address as your username to log in</li>
        <li>If this is your first login, you'll need to set your password</li>
        ${params.resetPasswordLink ? `<li><a href="${params.resetPasswordLink}" class="button">Set Your Password</a></li>` : '<li>Contact your administrator for password setup instructions</li>'}
      </ol>
      
      <div class="info-block" style="border-left-color: #f59e0b; background-color: #fffbeb;">
        <p style="margin: 0;"><strong>Important:</strong> Keep your credentials secure and do not share them with anyone. If you didn't request this account, please contact your system administrator immediately.</p>
      </div>
      
      <p>If you have any questions or need assistance, please contact your system administrator.</p>
      
      <p>Best regards,<br><strong>Rodeo Drive CRM System</strong></p>
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

function generateWelcomeEmailText(params: EmailParams): string {
  return `
Welcome to Rodeo Drive CRM

Hello ${params.name},

Your account has been successfully created in the Rodeo Drive CRM system. Below are your account details:

Name: ${params.name}
Employee ID: ${params.employeeId}
Email: ${params.email}
Department: ${params.department}
Role: ${params.role}

To get started:
1. Use your email address as your username to log in
2. If this is your first login, you'll need to set your password
3. Contact your administrator for password setup instructions

Important: Keep your credentials secure and do not share them with anyone. If you didn't request this account, please contact your system administrator immediately.

If you have any questions or need assistance, please contact your system administrator.

Best regards,
Rodeo Drive CRM System

---
This is an automated message, please do not reply to this email.
© 2026 Rodeo Drive. All rights reserved.
  `;
}
