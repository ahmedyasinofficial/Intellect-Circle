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

Thank you for your application to join Intellect Circle. We have received your submission, and our admissions committee is currently reviewing it.

Our weekly review process ensures we maintain a focused and high-signal community. We will be in touch with you shortly regarding the next steps, which may include a brief introductory call.

Please check your spam folder if you do not receive further updates from us, and ensure to mark our emails as safe.

Best regards,
Intellect Circle Admissions Team
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
