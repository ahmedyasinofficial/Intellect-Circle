import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Generates both HTML and text versions of a session announcement email
 */
export function generateSessionAnnouncementEmail({
  recipientName = 'Valued Member',
  session,
  registrationUrl,
  googleMeetUrl,
  whatsappCommunityUrl = 'https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1',
  siteUrl = 'https://intellectcircle.dpdns.org'
}) {
  const title = session.title || 'Intellect Circle Knowledge Session';
  const presenter = session.presenter || 'Intellect Circle Speaker';
  
  let formattedDate = session.date || '';
  if (!formattedDate && session.scheduled_at) {
    try {
      formattedDate = new Date(session.scheduled_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      formattedDate = session.scheduled_at;
    }
  }

  const time = session.time || '18:00 PKT';
  const format = session.format || '30min talk + Q&A';
  const summary = session.summary || '';
  const takeaways = Array.isArray(session.takeaways) ? session.takeaways.filter(Boolean) : [];

  const subject = `Upcoming Session: ${title} | Intellect Circle`;

  const takeawaysHtml = takeaways.length > 0 ? `
    <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.15);">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #f6d887; text-transform: uppercase; letter-spacing: 0.5px;">Key Discussion Points:</p>
      <ul style="margin: 0; padding-left: 20px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
        ${takeaways.map(t => `<li style="margin-bottom: 4px;">${t}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const takeawaysText = takeaways.length > 0
    ? `\nKey Discussion Points:\n` + takeaways.map(t => `• ${t}`).join('\n')
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
    
    <!-- Top Header Banner -->
    <div style="background-color: #0b132b; padding: 32px 24px 28px; text-align: center; border-bottom: 3px solid #c9a84c;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Intellect Circle</h1>
      <p style="color: #c9a84c; margin: 8px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Upcoming Session Announcement</p>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 32px 28px; line-height: 1.6;">
      <p style="font-size: 16px; margin: 0 0 14px;">Dear <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px; color: #475569; margin: 0 0 24px; line-height: 1.6;">
        We are thrilled to invite you to our next Intellect Circle knowledge-sharing session. Join fellow thinkers, expand your perspectives, and take part in an intellectually engaging conversation.
      </p>

      <!-- Featured Session Card -->
      <div style="background: linear-gradient(135deg, #0b132b 0%, #1e293b 100%); border-radius: 10px; padding: 24px 22px; margin: 0 0 28px; color: #ffffff; border-left: 5px solid #c9a84c; box-shadow: 0 4px 12px rgba(11, 19, 43, 0.15);">
        <span style="display: inline-block; background-color: rgba(201, 168, 76, 0.2); color: #f6d887; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          Next Learning Session
        </span>
        <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 700; line-height: 1.35;">
          ${title}
        </h2>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 10px;">
          <tr>
            <td style="padding: 5px 0; width: 110px; color: #94a3b8; font-weight: 600;">Presenter:</td>
            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">${presenter}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #94a3b8; font-weight: 600;">Date:</td>
            <td style="padding: 5px 0; color: #f6d887; font-weight: 600;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #94a3b8; font-weight: 600;">Time:</td>
            <td style="padding: 5px 0; color: #ffffff;">${time}</td>
          </tr>
          ${format ? `
          <tr>
            <td style="padding: 5px 0; color: #94a3b8; font-weight: 600;">Format:</td>
            <td style="padding: 5px 0; color: #ffffff;">${format}</td>
          </tr>` : ''}
        </table>

        ${summary ? `
        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.15); font-size: 13.5px; color: #cbd5e1; line-height: 1.55;">
          ${summary}
        </div>` : ''}

        ${takeawaysHtml}
      </div>

      <!-- Registration CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${registrationUrl}" style="display: inline-block; background-color: #c9a84c; color: #0b132b; text-decoration: none; font-weight: 700; font-size: 15px; padding: 13px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(201, 168, 76, 0.4); letter-spacing: 0.3px;">
          Register for this Session &rarr;
        </a>
        <p style="margin: 10px 0 0; font-size: 12.5px; color: #64748b;">
          Reserve your spot now to receive live agenda files, reminders, and discussion links.
        </p>
      </div>

      ${googleMeetUrl ? `
      <!-- Google Meet Box -->
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e40af;">Online Meeting Link</p>
        <a href="${googleMeetUrl}" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; font-weight: 600; padding: 8px 18px; border-radius: 6px; font-size: 13px;">
          Join Google Meet &rarr;
        </a>
        <p style="margin: 8px 0 0; font-size: 11.5px; color: #64748b; word-break: break-all;">${googleMeetUrl}</p>
      </div>` : ''}

      <!-- WhatsApp Community Card -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #166534;">Join Our Official WhatsApp Community</p>
        <p style="margin: 0 0 14px; font-size: 13px; color: #15803d; line-height: 1.5;">
          Connect with fellow attendees, receive timely session reminders, and access meeting summaries.
        </p>
        <a href="${whatsappCommunityUrl}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 22px; border-radius: 6px; font-size: 14px; box-shadow: 0 2px 8px rgba(37, 211, 102, 0.25);">
          Join WhatsApp Community &rarr;
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />

      <!-- Footer -->
      <div style="text-align: center; font-size: 12.5px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 4px;"><strong>Intellect Circle</strong></p>
        <p style="margin: 0 0 6px;">A structured peer-to-peer knowledge sharing community.</p>
        <p style="margin: 0 0 12px;"><a href="${siteUrl}" style="color: #c9a84c; text-decoration: none; font-weight: 600;">intellectcircle.dpdns.org</a></p>
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          You received this email because you previously submitted an application, registered for a session, or subscribed with Intellect Circle.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;

  const text = `Dear ${recipientName},

We are thrilled to announce our next Intellect Circle knowledge sharing session!

SESSION DETAILS:
----------------------------------------
Topic: ${title}
Presenter: ${presenter}
Date: ${formattedDate}
Time: ${time}
Format: ${format}
${summary ? `\nOverview:\n${summary}\n` : ''}${takeawaysText}

REGISTER FOR THIS SESSION:
Reserve your attendance using our registration link:
${registrationUrl}

${googleMeetUrl ? `Google Meet Link:\n${googleMeetUrl}\n\n` : ''}JOIN OUR WHATSAPP COMMUNITY:
Stay connected and receive real-time notifications:
${whatsappCommunityUrl}

Follow us on social media:
- Instagram: https://instagram.com/intellectcircle
- LinkedIn: https://www.linkedin.com/company/intellect-circle/
- Facebook: https://www.facebook.com/profile.php?id=61590726385267

Best regards,
Intellect Circle Team
${siteUrl}
`;

  return { subject, text, html };
}

/**
 * Sends a single email via nodemailer (or simulates if SMTP is not configured)
 */
export async function sendEmail({ to, subject, text, html }) {
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
        to,
        subject,
        text,
        html
      });

      return { success: true };
    } catch (err) {
      console.error(`[Email Service] Failed to send email to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[Email Service Simulation] SMTP not configured. Logged session notification for ${to}.`);
    return { success: true, simulated: true };
  }
}

/**
 * Broadcasts an upcoming session announcement to all unique members from submissions
 */
export async function broadcastSessionAnnouncementToMembers({
  session,
  supabase = null,
  localDataPath = null,
  siteBaseUrl = 'https://intellectcircle.dpdns.org',
  recipients = null  // optional override: [{email, name}] — if null, fetch all from submissions
}) {
  // If specific recipients were provided, use them directly
  if (Array.isArray(recipients) && recipients.length > 0) {
    const members = recipients
      .filter(r => r.email && r.email.includes('@'))
      .map(r => ({ email: r.email.trim().toLowerCase(), name: (r.name || 'Valued Member').trim() || 'Valued Member' }));

    if (members.length === 0) {
      return { success: true, total: 0, sent: 0, failed: 0, message: 'No valid recipient emails provided.' };
    }

    const sessionId = session.id || '';
    const customLink = session.registration_link || session.registrationLink;
    const registrationUrl = customLink?.trim() || `${siteBaseUrl}/sessions${sessionId ? `?register=${sessionId}` : ''}`;
    const googleMeetUrl = session.google_meet_link || session.googleMeetLink || session.meet_link || session.meetLink || '';

    let sentCount = 0, failedCount = 0, simulatedCount = 0;
    for (const member of members) {
      const { subject, text, html } = generateSessionAnnouncementEmail({ recipientName: member.name, session, registrationUrl, googleMeetUrl, siteUrl: siteBaseUrl });
      const result = await sendEmail({ to: member.email, subject, text, html });
      if (result.success) { sentCount++; if (result.simulated) simulatedCount++; } else failedCount++;
    }
    return { success: true, total: members.length, sent: sentCount, failed: failedCount, simulated: simulatedCount > 0, recipients: members.map(m => m.email) };
  }

  // Otherwise fall through to full member list query
  const memberMap = new Map();

  // 1. Fetch from Supabase if available
  if (supabase) {
    try {
      const { data: rows, error } = await supabase
        .from('submissions')
        .select('name, email, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Session Broadcast] Error querying submissions from Supabase:', error.message);
      } else if (rows && rows.length > 0) {
        for (const row of rows) {
          if (row.email && typeof row.email === 'string' && row.email.includes('@')) {
            const cleanEmail = row.email.trim().toLowerCase();
            if (!memberMap.has(cleanEmail)) {
              memberMap.set(cleanEmail, {
                email: cleanEmail,
                name: (row.name && row.name.trim()) ? row.name.trim() : 'Valued Member'
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Session Broadcast] Supabase query failed:', err.message);
    }
  }

  // 2. Fetch from local data.json if available or as supplementary
  if (localDataPath && fs.existsSync(localDataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
      const subs = data.submissions || {};
      const allSubs = [
        ...(subs.applications || []),
        ...(subs.sessionRegistrations || []),
        ...(subs.contacts || [])
      ];

      for (const item of allSubs) {
        if (item.email && typeof item.email === 'string' && item.email.includes('@')) {
          const cleanEmail = item.email.trim().toLowerCase();
          if (!memberMap.has(cleanEmail)) {
            memberMap.set(cleanEmail, {
              email: cleanEmail,
              name: (item.name && item.name.trim()) ? item.name.trim() : 'Valued Member'
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Session Broadcast] Failed reading local submissions data:', err.message);
    }
  }

  const members = Array.from(memberMap.values());
  if (members.length === 0) {
    console.log('[Session Broadcast] No member submissions found to notify.');
    return { success: true, total: 0, sent: 0, failed: 0, message: 'No registered members found.' };
  }

  // Determine registration URL
  const sessionId = session.id || '';
  const customLink = session.registration_link || session.registrationLink;
  const registrationUrl = customLink && customLink.trim()
    ? customLink.trim()
    : `${siteBaseUrl}/sessions${sessionId ? `?register=${sessionId}` : ''}`;

  const googleMeetUrl = session.google_meet_link || session.googleMeetLink || session.meet_link || session.meetLink || '';

  let sentCount = 0;
  let failedCount = 0;
  let simulatedCount = 0;

  console.log(`[Session Broadcast] Starting email notification broadcast to ${members.length} members for session "${session.title}"...`);

  // Send sequentially to prevent rate limits or connection exhaustion
  for (const member of members) {
    const { subject, text, html } = generateSessionAnnouncementEmail({
      recipientName: member.name,
      session,
      registrationUrl,
      googleMeetUrl,
      siteUrl: siteBaseUrl
    });

    const result = await sendEmail({
      to: member.email,
      subject,
      text,
      html
    });

    if (result.success) {
      sentCount++;
      if (result.simulated) simulatedCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`[Session Broadcast] Broadcast completed: ${sentCount} sent (${simulatedCount} simulated), ${failedCount} failed out of ${members.length} total members.`);

  return {
    success: true,
    total: members.length,
    sent: sentCount,
    failed: failedCount,
    simulated: simulatedCount > 0,
    recipients: members.map(m => m.email)
  };
}

/**
 * Checks and dispatches any session notifications that are scheduled and ready to be sent
 */
export async function processScheduledSessionEmails({
  supabase = null,
  localDataPath = null,
  siteBaseUrl = 'https://intellectcircle.dpdns.org'
}) {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Process in Supabase if connected
  if (supabase) {
    try {
      const { data: scheduledSessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('notify_enabled', true)
        .eq('notify_status', 'scheduled')
        .lte('notify_send_at', nowIso);

      if (!error && scheduledSessions && scheduledSessions.length > 0) {
        console.log(`[Scheduled Sessions] Processing ${scheduledSessions.length} session email(s) scheduled for dispatch.`);
        for (const s of scheduledSessions) {
          const result = await broadcastSessionAnnouncementToMembers({
            session: s,
            supabase,
            siteBaseUrl
          });
          const newStatus = result.sent > 0 ? 'sent' : (result.failed > 0 ? 'failed' : 'sent');
          await supabase
            .from('sessions')
            .update({
              notify_status: newStatus,
              notify_sent_at: nowIso
            })
            .eq('id', s.id);
        }
      }
    } catch (err) {
      console.warn('[Scheduled Sessions] Supabase check error:', err.message);
    }
  }

  // 2. Process in local data.json if available
  if (localDataPath && fs.existsSync(localDataPath)) {
    try {
      const raw = fs.readFileSync(localDataPath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.sessions)) {
        let modified = false;
        for (const s of data.sessions) {
          if (
            s.notify_enabled !== false &&
            s.notify_status === 'scheduled' &&
            s.notify_send_at &&
            new Date(s.notify_send_at) <= now
          ) {
            console.log(`[Local Scheduled Sessions] Dispatching emails for session "${s.title}"...`);
            const result = await broadcastSessionAnnouncementToMembers({
              session: s,
              localDataPath,
              siteBaseUrl
            });
            s.notify_status = result.sent > 0 ? 'sent' : 'failed';
            s.notify_sent_at = nowIso;
            modified = true;
          }
        }
        if (modified) {
          fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2), 'utf-8');
        }
      }
    } catch (err) {
      console.warn('[Local Scheduled Sessions] Error:', err.message);
    }
  }
}
