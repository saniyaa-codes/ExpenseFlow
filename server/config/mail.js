import nodemailer from 'nodemailer';

let cachedTransporter = null;

const isPlaceholderCreds = (user, pass) => {
  if (!user || !pass) return true;
  const dummyUsers = ['your_email@gmail.com'];
  const dummyPasses = ['your_app_password_here'];
  return dummyUsers.includes(user) || dummyPasses.includes(pass);
};

/**
 * Gmail requires the From address to match the authenticated account.
 */
export const getMailFrom = () => {
  if (process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('example.com')) {
    return process.env.EMAIL_FROM;
  }
  if (process.env.SMTP_USER && !isPlaceholderCreds(process.env.SMTP_USER, process.env.SMTP_PASS || 'x')) {
    return `"ExpenseFlow" <${process.env.SMTP_USER}>`;
  }
  return process.env.EMAIL_FROM || '"ExpenseFlow" <notifications@expenseflow.com>';
};

/**
 * Creates and caches the Nodemailer SMTP transporter.
 * Uses Gmail App Password when SMTP_USER / SMTP_PASS are real credentials.
 * Falls back to console logging in local/placeholder mode.
 */
export const createMailTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!isPlaceholderCreds(user, pass)) {
    const isGmail = /gmail\.com/i.test(host) || /@gmail\.com$/i.test(user);

    cachedTransporter = isGmail
      ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    })
  : nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });

    return cachedTransporter;
  }

  cachedTransporter = {
    sendMail: async (mailOptions) => {
      console.log('=================================================================');
      console.log('[DEV EMAIL INTERCEPTOR] Transporter in Local Mode (₹0 Cost)');
      console.log(`To:      ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('-----------------------------------------------------------------');
      console.log(mailOptions.text || mailOptions.html);
      console.log('=================================================================');
      return { messageId: `dev-mock-${Date.now()}` };
    },
  };

  return cachedTransporter;
};

export default createMailTransporter;
