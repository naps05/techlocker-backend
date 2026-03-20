const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server ready');
  }
});

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const emailTemplate = (subtitle, username, bodyContent, code, footerNote) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#0a0010;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0010">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table width="540" cellpadding="0" cellspacing="0" style="width:540px;background-color:#080008;border:2px solid #dc2626;">
        
        <!-- TOP ACCENT -->
        <tr><td bgcolor="#dc2626" height="4" style="font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- HEADER -->
        <tr>
          <td bgcolor="#0d0010" align="center" style="padding:32px 40px;border-bottom:1px solid #dc2626;">
            <div style="font-size:44px;margin-bottom:10px;">🔒</div>
            <div style="font-size:28px;font-weight:900;font-family:Arial Black,Arial,sans-serif;color:#ffffff;letter-spacing:6px;">
              TECH<span style="color:#dc2626;">LOCKER</span>
            </div>
            <div style="font-size:11px;color:#dc2626;letter-spacing:4px;margin-top:6px;font-family:'Courier New',monospace;">
              ${subtitle}
            </div>
          </td>
        </tr>

        <!-- OPERATOR BOX -->
        <tr>
          <td bgcolor="#080008" style="padding:28px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#1a0008" style="padding:14px 18px;border:1px solid #500010;">
                  <div style="font-size:9px;color:#dc2626;letter-spacing:4px;font-family:'Courier New',monospace;margin-bottom:6px;">// OPERATOR IDENTIFIED //</div>
                  <div style="font-size:15px;color:#ffffff;font-family:'Courier New',monospace;">
                    WELCOME, <b style="color:#f87171;">${username.toUpperCase()}</b>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY CONTENT -->
        <tr>
          <td bgcolor="#080008" style="padding:20px 40px;font-family:'Courier New',monospace;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8;">
            ${bodyContent}
          </td>
        </tr>

        <!-- CODE BOX -->
        <tr>
          <td bgcolor="#080008" style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#1a0005" align="center" style="padding:24px 20px;border:2px solid #dc2626;">
                  <div style="font-size:10px;color:#dc2626;letter-spacing:5px;font-family:'Courier New',monospace;margin-bottom:12px;">
                    [ ACCESS CODE ]
                  </div>
                  <div style="font-size:52px;font-weight:900;color:#dc2626;letter-spacing:16px;font-family:'Courier New',monospace;padding-left:16px;">
                    ${code}
                  </div>
                  <div style="margin:14px auto 0;width:200px;height:3px;background-color:#dc2626;"></div>
                  <div style="font-size:10px;color:#666666;letter-spacing:3px;font-family:'Courier New',monospace;margin-top:10px;">
                    EXPIRES IN 10 MINUTES
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- WARNING -->
        <tr>
          <td bgcolor="#080008" style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#1a0008" style="padding:12px 16px;border-left:4px solid #dc2626;">
                  <div style="font-size:11px;color:#666666;font-family:'Courier New',monospace;line-height:1.7;">
                    &#9888; ${footerNote}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#0a0008" style="padding:16px 40px;border-top:1px solid #300008;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:10px;color:#333333;font-family:'Courier New',monospace;letter-spacing:2px;">// TECHLOCKER VAULT //</td>
                <td align="right" style="font-size:10px;color:#333333;font-family:'Courier New',monospace;letter-spacing:2px;">SECURE YOUR GEAR</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BOTTOM ACCENT -->
        <tr><td bgcolor="#dc2626" height="4" style="font-size:0;line-height:0;">&nbsp;</td></tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationCode: code,
      verificationExpires: expires
    });

    await transporter.sendMail({
      from: `"TechLocker" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔒 TechLocker — Initialize Your Vault',
      html: emailTemplate(
        '// VAULT INITIALIZATION //',
        username,
        `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.9;letter-spacing:0.5px;">
              Your vault has been created. Use the access code below to verify your identity and unlock your gear vault.
            </td>
          </tr>
        </table>
        `,
        code,
        'If you did not create a TechLocker account, disregard this transmission. Your data remains secure.'
      )
    });

    res.status(201).json({
      message: 'Verification code sent to your email',
      email: user.email
    });

  } catch (err) {
    console.log('Register error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Verify code
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Account already verified' });
    if (user.verificationCode !== code) return res.status(400).json({ message: 'Invalid verification code' });
    if (new Date() > user.verificationExpires) return res.status(400).json({ message: 'Verification code has expired' });

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });

  } catch (err) {
    console.log('Verify error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Account already verified' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = code;
    user.verificationExpires = expires;
    await user.save();

    await transporter.sendMail({
      from: `"TechLocker" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔒 TechLocker — New Access Code',
      html: emailTemplate(
        '// NEW ACCESS CODE ISSUED //',
        user.username,
        `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.9;letter-spacing:0.5px;">
              A new access code has been issued for your vault. Use it to complete your verification before it expires.
            </td>
          </tr>
        </table>
        `,
        code,
        'If you did not request a new code, your account may be at risk. Contact support immediately.'
      )
    });

    res.json({ message: 'New verification code sent' });

  } catch (err) {
    console.log('Resend code error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(400).json({
        message: 'Please verify your email first',
        needsVerification: true,
        email: user.email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });

  } catch (err) {
    console.log('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update username only
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username },
      { new: true }
    );
    res.json({ user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.log('Profile update error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Request email change
router.post('/request-email-change', authMiddleware, async (req, res) => {
  try {
    const { newEmail } = req.body;

    const existing = await User.findOne({ email: newEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.findById(req.user.id);
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.pendingEmail = newEmail;
    user.emailChangeCode = code;
    user.emailChangeExpires = expires;
    await user.save();

    await transporter.sendMail({
      from: `"TechLocker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🔒 TechLocker — Email Change Request',
      html: emailTemplate(
        '// EMAIL CHANGE REQUEST //',
        user.username,
        `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.9;letter-spacing:0.5px;padding-bottom:12px;">
              A request has been made to transfer your vault access to a new email target:
            </td>
          </tr>
          <tr>
            <td style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.25);border-radius:4px;padding:12px 18px;">
              <div style="color:rgba(220,38,38,0.5);font-size:9px;letter-spacing:4px;margin-bottom:6px;">[ NEW EMAIL TARGET ]</div>
              <div style="color:#f87171;font-size:15px;font-weight:bold;letter-spacing:1px;">${newEmail}</div>
            </td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.9;letter-spacing:0.5px;padding-top:12px;">
              Enter the access code below to authorize this change.
            </td>
          </tr>
        </table>
        `,
        code,
        'If you did not initiate this request, ignore this message. Your vault remains locked and secure.'
      )
    });

    res.json({ message: 'Verification code sent to your current email' });

  } catch (err) {
    console.log('Email change request error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Confirm email change
router.post('/confirm-email-change', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.user.id);

    if (!user.emailChangeCode) {
      return res.status(400).json({ message: 'No email change request found' });
    }

    if (user.emailChangeCode !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > user.emailChangeExpires) {
      return res.status(400).json({ message: 'Code has expired' });
    }

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeCode = null;
    user.emailChangeExpires = null;
    await user.save();

    res.json({
      message: 'Email updated successfully',
      user: { id: user._id, username: user.username, email: user.email }
    });

  } catch (err) {
    console.log('Email change confirm error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Change password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.log('Password change error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;