export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM || 'WatermarkErase AI <noreply@watermarkeraseai.com>';

  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f6f7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0d1117;padding:24px 32px;">
              <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
                WatermarkErase<span style="color:#0dd3bb;">AI</span>
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.02em;">
                Verify your email
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
                Hi ${name ? name.split(' ')[0] : 'there'}, enter this 6-digit code to finish creating your account.
                The code expires in <strong>10 minutes</strong>.
              </p>
              <!-- OTP box -->
              <div style="background:#f5f6f7;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">
                  Verification Code
                </p>
                <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:12px;color:#111827;font-family:'Courier New',monospace;">
                  ${otp}
                </p>
              </div>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.
                Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; 2026 WatermarkErase AI &mdash; watermarkeraseai.com<br>
                Files are processed locally and never uploaded to our servers.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `${otp} is your WatermarkErase AI verification code`,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[send-otp] Resend error:', err);
      return res.status(502).json({ error: err.message || 'Failed to send email' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-otp] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
