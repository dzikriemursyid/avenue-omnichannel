// Email template utilities for the Avenue Omnichannel application

export function getInviteEmailTemplate(data: { fullName: string; email: string; role: string; inviteUrl: string; companyName?: string }) {
  const roleLabels = {
    admin: "Administrator",
    general_manager: "General Manager",
    leader: "Team Leader",
    agent: "Agent",
  };

  const roleLabel = roleLabels[data.role as keyof typeof roleLabels] || data.role;
  const company = data.companyName || "Avenue Omnichannel";

  return {
    subject: `You've been invited to join ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${company}</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.fullName},</h2>
              <p>You've been invited to join ${company} as a <strong>${roleLabel}</strong>.</p>
              <p>Click the button below to set up your account and get started:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #007bff;">${data.inviteUrl}</p>
              <p>This invitation link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${company}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${data.fullName},

You've been invited to join ${company} as a ${roleLabel}.

Click the link below to set up your account and get started:
${data.inviteUrl}

This invitation link will expire in 24 hours.

${company}
    `.trim(),
  };
}

export function getPasswordResetEmailTemplate(data: { fullName: string; resetUrl: string; companyName?: string }) {
  const company = data.companyName || "Avenue Omnichannel";

  return {
    subject: `Reset your ${company} password`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${company}</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.fullName},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc3545;">${data.resetUrl}</p>
              <p>If you didn't request this password reset, you can safely ignore this email.</p>
              <p>This link will expire in 1 hour for security reasons.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${company}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${data.fullName},

We received a request to reset your password. Click the link below to create a new password:
${data.resetUrl}

If you didn't request this password reset, you can safely ignore this email.

This link will expire in 1 hour for security reasons.

${company}
    `.trim(),
  };
}
