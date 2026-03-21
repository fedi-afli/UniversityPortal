const nodemailer = require('nodemailer');

/**
 * Send a verification email using nodemailer.
 * @param {string} to - Recipient email address
 * @param {string} verifyURL - Verification link URL
 * @returns {Promise<void>}
 */
async function sendVerificationEmail(to, verifyURL) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        logger: true,
        debug: true
    });

    const emailHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
                body { margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    padding: 20px; 
                    font-family: Arial, sans-serif; 
                    background-color: #ffffff; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 8px rgba(0,0,0,0.05); 
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    font-size: 16px;
                    color: #ffffff !important; 
                    background-color: #007bff; 
                    border-radius: 5px;
                    text-decoration: none;
                    font-weight: bold;
                    border: 1px solid #007bff;
                }
                .footer {
                    margin-top: 25px;
                    font-size: 12px;
                    color: #888888;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2 style="color: #333;">🚀 Action Required: Verify Your Email Address</h2>
                <p style="color: #555; line-height: 1.6;">Hello,</p>
                <p style="color: #555; line-height: 1.6;">Thank you for signing up with <strong>SocialSphere</strong>! Please click the button below to confirm your email and activate your account.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyURL}" class="button">Verify My Email Address</a>
                </div>
                <p style="color: #555; line-height: 1.6;">If the button above does not work, please copy and paste the following link into your web browser:</p>
                <p style="word-break: break-all; font-size: 14px; color: #007bff;">${verifyURL}</p>
                <div class="footer">
                    <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 15px 0;">
                    <p>This email was sent by SocialSphere. If you did not register for this service, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: '🚀 Action Required: Verify Your Email Address for SocialSphere',
        html: emailHTML
    });
}

/**
 * Send a password reset email with a reset link.
 * @param {string} to - Recipient email address
 * @param {string} resetURL - Password reset link URL
 */
async function sendPasswordResetEmail(to, resetURL) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:20px auto; padding:20px; background:#fff; border-radius:8px;">
            <h2 style="color:#333;">Password Reset Request</h2>
            <p style="color:#555; line-height:1.5;">We received a request to reset your SocialSphere password. Click the button below to reset it. This link expires in one hour.</p>
            <div style="text-align:center; margin:30px 0;">
                <a href="${resetURL}" style="display:inline-block;padding:12px 22px;background:#007bff;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">Reset Password</a>
            </div>
            <p style="color:#555;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break:break-all;color:#007bff;">${resetURL}</p>
            <hr style="margin-top:20px;border:none;border-top:1px solid #eee;">
            <p style="font-size:12px;color:#888;">If you did not request a password reset, please ignore this email.</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: 'SocialSphere — Password Reset',
        html: emailHTML
    });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };