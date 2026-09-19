import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

async function sendWelcomeEmail({ name, email }) {
  const mailSubject = `Welcome to the Intellect Circle Community!`;
  const mailText = `Dear ${name},

Welcome to the Intellect Circle community! We are excited to have you on board.

To get started, please join our WhatsApp Community using the link below:
https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1

Stay connected and follow our social media pages:
- Instagram: https://instagram.com/intellectcircle
- LinkedIn: https://www.linkedin.com/company/intellect-circle/
- Facebook: https://www.facebook.com/profile.php?id=61590726385267

Best regards,
Intellect Circle Team
https://intellectcircle.dpdns.org`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@intellectcircle.dpdns.org';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"Intellect Circle" <${smtpFrom}>`,
        to: email,
        subject: mailSubject,
        text: mailText
      });
      console.log(`[Welcome Email] Sent welcome email to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`[Welcome Email] SMTP error sending to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  } else {
    const msg = `[Welcome Email Simulation] SMTP not configured. Welcomed ${name} (${email}).`;
    console.log(msg);
    return { success: true, simulated: true };
  }
}

async function sendReceiptEmail({ name, email }) {
  const mailSubject = `Application Received - Intellect Circle`;
  const mailText = `Dear ${name},

Thank you for your application to join Intellect Circle! We have successfully received your submission, and our review committee is currently reviewing your profile.

What Happens Next:
1. Weekly Review: We evaluate each application to maintain a focused, high-signal peer learning network.
2. Introductory Call: Shortlisted applicants receive an invite for a brief 10-minute online introductory call.
3. Circle Induction: Accepted members are introduced in our bi-weekly meetings, joined to local chapters, and scheduled for their first presentation.

While your application is being processed, you are warmly invited to join our official WhatsApp Community:
https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1

Stay connected and follow our social media pages:
- Instagram: https://instagram.com/intellectcircle
- LinkedIn: https://www.linkedin.com/company/intellect-circle/
- Facebook: https://www.facebook.com/profile.php?id=61590726385267

Please check your spam or junk folder if you do not receive further updates, and ensure to mark our address as safe.

Best regards,
Intellect Circle Team
https://intellectcircle.dpdns.org`;

  const mailHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #0b132b; padding: 28px 24px; text-align: center; border-bottom: 3px solid #c9a84c;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Intellect Circle</h1>
      <p style="color: #c9a84c; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Application Received</p>
    </div>
    <div style="padding: 30px 24px; color: #1e293b; line-height: 1.6;">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 15px; color: #475569;">Thank you for applying to join Intellect Circle. We have received your application, and our selection committee is currently reviewing your profile.</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #c9a84c; border-radius: 6px; padding: 18px 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 10px; color: #0b132b; font-size: 16px;">What Happens Next</h3>
        <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 14px; line-height: 1.6;">
          <li style="margin-bottom: 6px;"><strong>Weekly Review:</strong> We verify background and motivation to maintain a high-signal environment.</li>
          <li style="margin-bottom: 6px;"><strong>Brief Call:</strong> Qualified candidates receive an invitation for a 10-minute online introductory chat.</li>
          <li><strong>Circle Induction:</strong> Accepted members get access to internal bi-weekly sessions and regional chapters.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 22px 18px;">
        <p style="font-size: 16px; font-weight: 700; color: #166534; margin: 0 0 6px;">Join Our WhatsApp Community</p>
        <p style="font-size: 13px; color: #15803d; margin: 0 0 16px; line-height: 1.5;">
          While your application is reviewed, connect with members and get instant alerts for upcoming knowledge talks.
        </p>
        <a href="https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 26px; border-radius: 6px; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
          Join WhatsApp Community →
        </a>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #92400e;">
        <strong>Tip:</strong> Please check your spam or junk folder if you do not receive further updates, and add our email to your safe contacts.
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
      <p style="font-size: 13px; color: #94a3b8; margin: 0;">
        Intellect Circle — A structured peer-to-peer knowledge sharing community.<br />
        Visit us at <a href="https://intellectcircle.dpdns.org" style="color: #c9a84c;">intellectcircle.dpdns.org</a>
      </p>
    </div>
  </div>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@intellectcircle.dpdns.org';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"Intellect Circle" <${smtpFrom}>`,
        to: email,
        subject: mailSubject,
        text: mailText,
        html: mailHtml
      });
      console.log(`[Receipt Email] Sent application receipt email to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`[Receipt Email] SMTP error sending to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  } else {
    const msg = `[Receipt Email Simulation] SMTP not configured. Acknowledged application for ${name} (${email}).`;
    console.log(msg);
    return { success: true, simulated: true };
  }
}

async function processPendingWelcomeEmails(supabase) {
  try {
    const { data: pending, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('type', 'application')
      .eq('welcome_email_status', 'pending')
      .lte('welcome_email_send_after', new Date().toISOString());

    if (error) {
      console.error('[Welcome Email Processor] Failed to fetch pending submissions:', error.message);
      return;
    }

    if (!pending || pending.length === 0) {
      return;
    }

    console.log(`[Welcome Email Processor] Found ${pending.length} pending welcome emails to send.`);
    for (const app of pending) {
      const result = await sendWelcomeEmail({ name: app.name, email: app.email });
      const status = result.success ? 'sent' : 'failed';

      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          welcome_email_status: status,
          welcome_email_sent_at: new Date().toISOString()
        })
        .eq('id', app.id);

      if (updateError) {
        console.error(`[Welcome Email Processor] Failed to update status for submission ${app.id}:`, updateError.message);
      }
    }
  } catch (err) {
    console.error('[Welcome Email Processor] Error processing welcome emails:', err.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;
  if (!action || !['submit-application', 'submit-contact', 'delete-submission'].includes(action)) {
    return res.status(400).json({ error: 'Invalid or missing action parameter.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ success: true, message: 'Submission action mocked successfully' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // Run lazy email check/processor in background
  processPendingWelcomeEmails(supabase).catch(console.error);

  try {
    if (action === 'submit-application') {
      const application = req.body;
      if (!application) {
        return res.status(400).json({ error: 'Missing request body' });
      }

      // Insert application row with welcome email status and schedule
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/submissions`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          type: 'application',
          name: application.name,
          email: application.email,
          mobile_number: application.mobileNumber,
          age: parseInt(application.age, 10) || null,
          city: application.city,
          occupation: application.occupation,
          why_join: application.whyJoin,
          heard_about: application.heardAboutCombined,
          created_at: application.submittedAt || new Date().toISOString(),
          welcome_email_status: 'pending',
          welcome_email_send_after: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
        })
      });

      if (!insertRes.ok) {
        const errorText = await insertRes.text();
        throw new Error(`Supabase insert failed: ${errorText}`);
      }

      // Send auto-acknowledgement / receipt email immediately
      try {
        await sendReceiptEmail({ name: application.name, email: application.email });
      } catch (emailErr) {
        console.error('[Receipt Email Error] Auto-acknowledgement email delivery failed:', emailErr.message || emailErr);
      }

      return res.status(200).json({ success: true, message: 'Application submitted successfully' });
    }

    if (action === 'submit-contact') {
      const contactMsg = req.body;
      if (!contactMsg) {
        return res.status(400).json({ error: 'Missing request body' });
      }

      // Insert contact inquiry row
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/submissions`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          type: 'contact',
          name: contactMsg.name,
          email: contactMsg.email,
          message: contactMsg.message,
          created_at: contactMsg.submittedAt || new Date().toISOString()
        })
      });

      if (!insertRes.ok) {
        const errorText = await insertRes.text();
        throw new Error(`Supabase insert failed: ${errorText}`);
      }

      return res.status(200).json({ success: true, message: 'Contact inquiry submitted successfully' });
    }

    if (action === 'delete-submission') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing submission ID' });
      }

      // Delete submission row
      const deleteRes = await fetch(`${supabaseUrl}/rest/v1/submissions?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (!deleteRes.ok) {
        const errorText = await deleteRes.text();
        throw new Error(`Supabase delete failed: ${errorText}`);
      }

      return res.status(200).json({ success: true, message: 'Submission deleted successfully' });
    }
  } catch (error) {
    console.error(`Submissions action ${action} failed:`, error);
    return res.status(500).json({ error: error.message });
  }
}
