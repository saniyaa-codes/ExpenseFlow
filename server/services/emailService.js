import createMailTransporter, { getMailFrom } from '../config/mail.js';

const getTransporter = () => createMailTransporter();

/**
 * A. Registration Welcome Email
 */
export const sendWelcomeEmail = async ({ user }) => {
  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: 'Welcome to ExpenseFlow',
    text: `Hello ${user.name},\n\nWelcome to ExpenseFlow.\n\nYour account has been created successfully.\n\nYou can now use ExpenseFlow to manage your income, expenses, budgets and saving goals.\n\nThank you,\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1F2937; margin-top: 0;">Welcome to ExpenseFlow</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">Welcome to ExpenseFlow.</p>
          <p style="color: #525252; font-size: 15px;">Your account has been created successfully.</p>
          <p style="color: #525252; font-size: 15px;">You can now use ExpenseFlow to manage your income, expenses, budgets and saving goals.</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #525252; font-size: 14px; margin-bottom: 4px;">Thank you,</p>
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    console.log('[Email Success] Registration welcome email sent to:', user.email);
    return result;
  } catch (err) {
    console.error('[Email Error] Registration welcome email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * B. Login Security Email
 */
export const sendLoginSecurityEmail = async ({ user, ipAddress }) => {
  const loginTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  });

  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: 'New Login to ExpenseFlow',
    text: `Hello ${user.name},\n\nYour ExpenseFlow account was just used to sign in.\n\nLogin time: ${loginTime}\n\nIf this was you, no action is required.\n\nThank you,\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1F2937; margin-top: 0;">New Login to ExpenseFlow</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">Your ExpenseFlow account was just used to sign in.</p>
          <div style="background-color: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; padding: 14px; margin: 18px 0; font-size: 13px; color: #4B5563;">
            <p style="margin: 0 0 6px 0;"><strong>Login time:</strong> ${loginTime}</p>
            ${ipAddress ? `<p style="margin: 0;"><strong>Origin IP:</strong> ${ipAddress}</p>` : ''}
          </div>
          <p style="color: #525252; font-size: 14px;">If this was you, no action is required.</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #525252; font-size: 14px; margin-bottom: 4px;">Thank you,</p>
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    console.log('[Email Success] Login email sent to:', user.email);
    return result;
  } catch (err) {
    console.error('[Email Error] Login email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * C. Logout Notification Email
 */
export const sendLogoutEmail = async ({ user }) => {
  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: 'You have logged out of ExpenseFlow',
    text: `Hello ${user.name},\n\nYou have successfully logged out of your ExpenseFlow account.\n\nThank you for using ExpenseFlow.\n\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1F2937; margin-top: 0;">You have logged out of ExpenseFlow</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">You have successfully logged out of your ExpenseFlow account.</p>
          <p style="color: #525252; font-size: 15px;">Thank you for using ExpenseFlow.</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    console.log('[Email Success] Logout email sent to:', user.email);
    return result;
  } catch (err) {
    console.error('[Email Error] Logout email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * D. Budget Alert Email
 */
export const sendBudgetAlertEmail = async ({ user, category, spent, limit, percentage }) => {
  const pct = percentage || 100;
  const isCritical = pct >= 90;
  const bannerColor = pct >= 100 ? '#EF4444' : pct >= 90 ? '#F59E0B' : '#6366F1';
  const bgColor = pct >= 100 ? '#FEE2E2' : pct >= 90 ? '#FEF3C7' : '#EEF2FF';
  const borderColor = pct >= 100 ? '#FCA5A5' : pct >= 90 ? '#FCD34D' : '#C7D2FE';

  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: `⚠️ Budget Alert: ${category} reached ${pct}% (${spent} of ${limit})`,
    text: `Hello ${user.name},\n\nYou have spent ${pct}% of your ${category} budget.\n\nSpent: ${spent}\nBudget: ${limit}\n\nPlease review your spending.\n\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: ${bannerColor}; margin-top: 0;">Budget Alert — ${pct}% Reached</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">You have reached <strong>${pct}%</strong> of your <strong>${category}</strong> budget.</p>
          <div style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Category:</strong> ${category}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Spent so far:</strong> ${spent} (${pct}%)</p>
            <p style="margin: 0; font-size: 14px;"><strong>Total Budget:</strong> ${limit}</p>
          </div>
          <p style="color: #525252; font-size: 14px;">Manage your expenses in your ExpenseFlow dashboard.</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    console.log('[Email Success] Budget alert email sent to:', user.email);
    return result;
  } catch (err) {
    console.error('[Email Error] Budget alert email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * E. Unusual / Abnormal Spending Detected Alert
 */
export const sendUnusualSpendingEmail = async ({ user, category, currentSpending, usualSpending }) => {
  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: 'Unusual Spending Detected',
    text: `Hello ${user.name},\n\nYour spending on ${category} is higher than your usual spending pattern.\n\nCurrent spending: ${currentSpending}\nUsual spending: ${usualSpending}\n\nPlease review your recent transactions.\n\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #DC2626; margin-top: 0;">Unusual Spending Detected</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">Your spending on <strong>${category}</strong> is higher than your usual spending pattern.</p>
          <div style="background-color: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #991B1B;"><strong>Current spending:</strong> ${currentSpending}</p>
            <p style="margin: 0; font-size: 14px; color: #991B1B;"><strong>Usual spending:</strong> ${usualSpending}</p>
          </div>
          <p style="color: #525252; font-size: 14px;">Please review your recent transactions.</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    console.log('[Email Success] Unusual spending email sent to:', user.email);
    return result;
  } catch (err) {
    console.error('[Email Error] Unusual spending email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * F. Savings Goal Alert Email
 */
export const sendSavingsGoalAlertEmail = async ({ user, goalName, currentAmount, targetAmount, isAchieved }) => {
  const subject = isAchieved
    ? `ExpenseFlow Saving Goal Achieved: ${goalName}`
    : `ExpenseFlow Saving Goal Progress: ${goalName}`;

  const message = isAchieved
    ? `Congratulations! You have successfully reached your saving goal target for ${goalName}.\n\nTarget: ${targetAmount}\nSaved: ${currentAmount}`
    : `You have made progress on your saving goal "${goalName}".\n\nTarget: ${targetAmount}\nCurrent: ${currentAmount}`;

  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject,
    text: `Hello ${user.name},\n\n${message}\n\nKeep up the great financial discipline!\n\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #059669; margin-top: 0;">${isAchieved ? '🎉 Goal Achieved!' : 'Saving Goal Progress'}</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">${isAchieved ? `Congratulations! You have reached your saving target for <strong>${goalName}</strong>.` : `Great job on funding your saving goal <strong>${goalName}</strong>.`}</p>
          <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #065F46;"><strong>Goal:</strong> ${goalName}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #065F46;"><strong>Saved:</strong> ${currentAmount}</p>
            <p style="margin: 0; font-size: 14px; color: #065F46;"><strong>Target:</strong> ${targetAmount}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    console.log('[Email Success] Savings goal email sent to:', user.email);
    return result;
  } catch (err) {
    console.error('[Email Error] Savings goal email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * Account Alert Email (e.g. Block / Unblock)
 */
export const sendAccountAlertEmail = async ({ user, alertTitle, alertMessage }) => {
  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: `ExpenseFlow Account Alert — ${alertTitle}`,
    text: `Hello ${user.name},\n\n${alertTitle}\n\n${alertMessage}\n\nThank you,\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #DC2626; margin-top: 0;">${alertTitle}</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">${alertMessage}</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    return await getTransporter().sendMail(mailOptions);
  } catch (err) {
    console.error('[Email Error] Account alert email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * Password Reset Email
 */
export const sendPasswordResetEmail = async ({ user, rawToken, clientOrigin }) => {
  const baseClientUrl = (clientOrigin && clientOrigin !== 'null') ? clientOrigin : (process.env.CLIENT_URL || 'http://localhost:5173');
  const clientUrl = baseClientUrl.split(',')[0].trim().replace(/\/$/, '');
  const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: 'ExpenseFlow — Password Reset Request',
    text: `Hello ${user.name},\n\nYou requested a password reset for your ExpenseFlow account.\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis link is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1F2937; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">We received a request to reset your ExpenseFlow account password.</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #1F2937; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #991B1B; font-size: 13px; font-weight: bold;">⚠️ This link will expire in 15 minutes.</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    return await getTransporter().sendMail(mailOptions);
  } catch (err) {
    console.error('[Email Error] Password reset email failed for', user.email, ':', err.message);
    return null;
  }
};

/**
 * Password Changed Confirmation Email
 */
export const sendPasswordChangedEmail = async ({ user }) => {
  const mailOptions = {
    from: getMailFrom(),
    to: user.email,
    subject: 'ExpenseFlow — Password Changed',
    text: `Hello ${user.name},\n\nYour ExpenseFlow account password was updated successfully.\n\nIf you made this change, no action is needed.\nIf you did not make this change, please reset your password immediately.\n\nExpenseFlow Team`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #F7F7F5; padding: 24px; color: #171717;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #D4D4D4; border-radius: 8px; padding: 32px;">
          <h2 style="color: #1F2937; margin-top: 0;">Password Changed</h2>
          <p style="color: #525252; font-size: 15px;">Hello ${user.name},</p>
          <p style="color: #525252; font-size: 15px;">Your ExpenseFlow account password was updated successfully.</p>
          <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;">
          <p style="color: #1F2937; font-weight: bold; margin-top: 0;">ExpenseFlow Team</p>
        </div>
      </div>
    `,
  };

  try {
    return await getTransporter().sendMail(mailOptions);
  } catch (err) {
    console.error('[Email Error] Password changed email failed for', user.email, ':', err.message);
    return null;
  }
};
