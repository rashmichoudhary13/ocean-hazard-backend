// src/config/mailer.js
const nodemailer = require('nodemailer');

// ✨ TEMPORARY TEST: Hardcode credentials to bypass the .env file issue
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "9e1031bb0f71c5", // 👈 No quotes
    pass: "957a37e2fb9b3e", // 👈 No quotes
  },
});

const sendOtpEmail = async (to, otp) => {
  // ... the rest of the file is unchanged
  try {
    await transporter.sendMail({
      from: '"CoastWatch" <no-reply@coastwatch.com>',
      to: to,
      subject: 'Your CoastWatch Verification Code',
      html: `<p>Your One-Time Password (OTP) is: <b>${otp}</b>. It will expire in 5 minutes.</p>`,
    });
    console.log('OTP email sent successfully to', to);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Could not send OTP email.');
  }
};

module.exports = { sendOtpEmail };