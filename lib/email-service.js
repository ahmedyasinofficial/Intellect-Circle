import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Normalizes an image/poster URL for email clients.
 * Relative paths (e.g. /uploads/image.png) must be converted into absolute URLs
 * so that email clients (Gmail, Outlook, etc.) can load and render them.
 */
export function formatEmailImageUrl(url, baseUrl = 'https://intellectcircle.dpdns.org') {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanBase = (baseUrl || 'https://intellectcircle.dpdns.org').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

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
  const posterUrl = formatEmailImageUrl(session.photo || session.poster, siteUrl);

  const subject = `Upcoming Session: ${title} | Intellect Circle`;

  const posterHtml = posterUrl ? `
    <div style="margin-bottom: 22px; text-align: center;">
      <img src="${posterUrl}" alt="${title} Poster" style="width: 100%; max-width: 540px; height: auto; max-height: 380px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); display: block; margin: 0 auto;" />
    </div>
  ` : '';

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
        
        ${posterHtml}

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
 * Generates the registration confirmation email sent immediately to a user who registered for a session.
 * Features session details, Google Meet link, WhatsApp community CTA, and the session poster image.
 */
export function generateSessionRegistrationConfirmedEmail({
  name = 'Valued Member',
  sessionTitle = 'Intellect Circle Knowledge Session',
  presenter = '',
  date = '',
  time = '',
  format = '',
  meetLink = '',
  photo = '',
  siteUrl = 'https://intellectcircle.dpdns.org',
  whatsappCommunityUrl = 'https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1'
}) {
  const posterUrl = formatEmailImageUrl(photo, siteUrl);
  const subject = `Registration Confirmed: ${sessionTitle} | Intellect Circle`;

  const posterHtml = posterUrl ? `
    <div style="margin-bottom: 22px; text-align: center;">
      <img src="${posterUrl}" alt="${sessionTitle} Poster" style="width: 100%; max-width: 540px; height: auto; max-height: 380px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); display: block; margin: 0 auto;" />
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sessionTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
    
    <!-- Top Header Banner -->
    <div style="background-color: #0b132b; padding: 28px 24px; text-align: center; border-bottom: 3px solid #c9a84c;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Intellect Circle</h1>
      <p style="color: #c9a84c; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Session Registration Confirmed</p>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 30px 24px; color: #1e293b; line-height: 1.6;">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>${name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; margin: 0 0 22px;">
        You are successfully registered for our upcoming session. We look forward to your presence and active participation!
      </p>

      <!-- Featured Session Card with Poster -->
      <div style="background: linear-gradient(135deg, #0b132b 0%, #1e293b 100%); border-radius: 10px; padding: 22px 20px; margin: 0 0 26px; color: #ffffff; border-left: 5px solid #c9a84c; box-shadow: 0 4px 12px rgba(11, 19, 43, 0.15);">
        
        ${posterHtml}

        <span style="display: inline-block; background-color: rgba(201, 168, 76, 0.2); color: #f6d887; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
          Registered Session
        </span>
        <h2 style="margin: 0 0 14px; color: #ffffff; font-size: 19px; font-weight: 700; line-height: 1.35;">
          ${sessionTitle}
        </h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${presenter ? `
          <tr>
            <td style="padding: 4px 0; width: 110px; color: #94a3b8; font-weight: 600;">Presenter:</td>
            <td style="padding: 4px 0; color: #ffffff; font-weight: 600;">${presenter}</td>
          </tr>` : ''}
          ${date ? `
          <tr>
            <td style="padding: 4px 0; color: #94a3b8; font-weight: 600;">Date/Time:</td>
            <td style="padding: 4px 0; color: #f6d887; font-weight: 600;">${date} ${time ? `at ${time}` : ''}</td>
          </tr>` : ''}
          ${format ? `
          <tr>
            <td style="padding: 4px 0; color: #94a3b8; font-weight: 600;">Format:</td>
            <td style="padding: 4px 0; color: #ffffff;">${format}</td>
          </tr>` : ''}
        </table>
      </div>

      ${meetLink ? `
      <!-- Google Meet Box -->
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e40af;">Online Meeting Link (Google Meet)</p>
        <a href="${meetLink}" style="display: inline-block; background-color: #1a73e8; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 22px; border-radius: 6px; font-size: 14px; box-shadow: 0 2px 6px rgba(26, 115, 232, 0.3);">
          Join Google Meet Session &rarr;
        </a>
        <p style="margin: 8px 0 0; font-size: 11.5px; color: #64748b; word-break: break-all;">${meetLink}</p>
      </div>` : ''}

      <!-- WhatsApp Community Card -->
      <div style="text-align: center; margin: 26px 0; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px 18px;">
        <p style="font-size: 15px; font-weight: 700; color: #166534; margin: 0 0 6px;">Join Our WhatsApp Community</p>
        <p style="font-size: 13px; color: #15803d; margin: 0 0 16px; line-height: 1.5;">
          Get live meeting reminders, session resources, agenda files, and connect with fellow attendees.
        </p>
        <a href="${whatsappCommunityUrl}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-weight: 600; padding: 11px 24px; border-radius: 6px; font-size: 14px; box-shadow: 0 3px 10px rgba(37, 211, 102, 0.25);">
          Join WhatsApp Community &rarr;
        </a>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #92400e;">
        <strong>Friendly Reminder:</strong> We will also send you a direct reminder with the meeting link <strong>10 minutes before the session starts</strong> so you don't miss out!
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
      
      <!-- Footer -->
      <div style="text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 4px;"><strong>Intellect Circle</strong></p>
        <p style="margin: 0 0 6px;">A structured peer-to-peer knowledge sharing community.</p>
        <p style="margin: 0 0 10px;"><a href="${siteUrl}" style="color: #c9a84c; text-decoration: none; font-weight: 600;">intellectcircle.dpdns.org</a></p>
      </div>

    </div>
  </div>
</body>
</html>
  `;

  let text = `Dear ${name},

Thank you for registering for our upcoming session: "${sessionTitle}". We are excited to have you join us!

SESSION DETAILS:
----------------------------------------
Title: ${sessionTitle}
${presenter ? `Presenter: ${presenter}\n` : ''}${date ? `Date/Time: ${date} ${time ? `at ${time}` : ''}\n` : ''}${format ? `Format: ${format}\n` : ''}

${meetLink ? `ONLINE MEETING LINK (Google Meet):\n${meetLink}\n\n` : ''}JOIN OUR OFFICIAL WHATSAPP COMMUNITY:
To receive live session reminders, files, and discussion links:
${whatsappCommunityUrl}

Reminder: A starting reminder will be dispatched 10 minutes prior to session commencement.

Best regards,
Intellect Circle Team
${siteUrl}
`;

  return { subject, text, html };
}

/**
 * Generates the "Starting in 10 Minutes" reminder email sent to all registered participants.
 */
export function generateSessionStartingSoonEmail({
  recipientName = 'Valued Member',
  session,
  googleMeetUrl = '',
  minutes = 10,
  siteUrl = 'https://intellectcircle.dpdns.org',
  whatsappCommunityUrl = 'https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1'
}) {
  const title = session.title || 'Intellect Circle Knowledge Session';
  const presenter = session.presenter || 'Intellect Circle Speaker';
  const time = session.time || '';
  const posterUrl = formatEmailImageUrl(session.photo || session.poster, siteUrl);

  const subject = `Starting in ${minutes} Minutes: ${title} | Intellect Circle`;

  const posterHtml = posterUrl ? `
    <div style="margin-bottom: 22px; text-align: center;">
      <img src="${posterUrl}" alt="${title} Poster" style="width: 100%; max-width: 540px; height: auto; max-height: 380px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); display: block; margin: 0 auto;" />
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 30px -5px rgba(15, 23, 42, 0.12);">
    
    <!-- Top Header Banner with Live Alert -->
    <div style="background-color: #0b132b; padding: 28px 24px 24px; text-align: center; border-bottom: 4px solid #f59e0b;">
      <span style="display: inline-block; background-color: rgba(201, 168, 76, 0.15); border: 1px solid #c9a84c; color: #f6d887; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
        ● LIVE IN ${minutes} MINUTES
      </span>
      <h1 style="color: #ffffff; margin: 4px 0 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Intellect Circle</h1>
      <p style="color: #f6d887; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">Session Starting Soon</p>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 30px 24px; line-height: 1.6;">
      <p style="font-size: 16px; margin: 0 0 12px;">Dear <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px; color: #334155; margin: 0 0 20px; line-height: 1.6;">
        Our live session, <strong>"${title}"</strong>, is starting in <strong>${minutes} minutes</strong>! Grab a notebook, get comfortable, and join the live room now. Everyone is welcome to attend.
      </p>

      ${googleMeetUrl ? `
      <!-- High-Impact Google Meet Room Button Card -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%); border-radius: 10px; padding: 26px 20px; margin: 0 0 26px; text-align: center; color: #ffffff; box-shadow: 0 8px 20px rgba(30, 64, 175, 0.35);">
        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd;">Online Meeting Room is Ready</p>
        <h3 style="margin: 0 0 16px; font-size: 20px; color: #ffffff; font-weight: 700;">Click Below to Join Now</h3>
        <a href="${googleMeetUrl}" style="display: inline-block; background-color: #ffffff; color: #1e40af; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
          Join Google Meet &rarr;
        </a>
        <p style="margin: 12px 0 0; font-size: 12px; color: #dbeafe; word-break: break-all;">${googleMeetUrl}</p>
      </div>
      ` : `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 0 0 24px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 600;">Please check your WhatsApp group or email updates for any direct room link updates.</p>
      </div>
      `}

      <!-- Session Info Card with Poster -->
      <div style="background: #0b132b; border-radius: 10px; padding: 22px 20px; margin: 0 0 24px; color: #ffffff; border-left: 5px solid #c9a84c;">
        ${posterHtml}

        <h3 style="margin: 0 0 12px; color: #ffffff; font-size: 18px; font-weight: 700;">${title}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${presenter ? `
          <tr>
            <td style="padding: 4px 0; width: 100px; color: #94a3b8; font-weight: 600;">Presenter:</td>
            <td style="padding: 4px 0; color: #ffffff; font-weight: 600;">${presenter}</td>
          </tr>` : ''}
          ${time ? `
          <tr>
            <td style="padding: 4px 0; color: #94a3b8; font-weight: 600;">Time:</td>
            <td style="padding: 4px 0; color: #f6d887; font-weight: 600;">${time}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- WhatsApp Community Card -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #166534;">Have questions or need assistance?</p>
        <p style="margin: 0 0 12px; font-size: 13px; color: #15803d;">Join the WhatsApp community backchannel for real-time discussion and help:</p>
        <a href="${whatsappCommunityUrl}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-weight: 600; padding: 9px 20px; border-radius: 6px; font-size: 13.5px;">
          WhatsApp Discussion &rarr;
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 26px 0 18px;" />

      <!-- Footer -->
      <div style="text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 4px;"><strong>Intellect Circle</strong></p>
        <p style="margin: 0 0 6px;">A structured peer-to-peer knowledge sharing community.</p>
        <p style="margin: 0 0 8px;"><a href="${siteUrl}" style="color: #c9a84c; text-decoration: none; font-weight: 600;">intellectcircle.dpdns.org</a></p>
      </div>

    </div>
  </div>
</body>
</html>
  `;

  const text = `Dear ${recipientName},

REMINDER: The session "${title}" is starting in ${minutes} minutes!

SESSION: ${title}
${presenter ? `PRESENTER: ${presenter}\n` : ''}${time ? `TIME: ${time}\n` : ''}
${googleMeetUrl ? `JOIN GOOGLE MEET NOW:\n${googleMeetUrl}\n\n` : ''}WHATSAPP COMMUNITY:
${whatsappCommunityUrl}

See you in the room!
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
    console.log(`[Email Service Simulation] SMTP not configured. Logged notification for ${to}: "${subject}"`);
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

  // Otherwise fetch all members from submissions
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
 * Broadcasts a starting soon reminder email before the session begins.
 * Defaults to targetAudience: 'all' (sends to all email submitters across applications, contacts, and registrations),
 * or can be set to targetAudience: 'registered' (strictly session registrants).
 */
export async function broadcastSessionStartingSoonReminder({
  session,
  supabase = null,
  localDataPath = null,
  siteBaseUrl = 'https://intellectcircle.dpdns.org',
  recipients = null,
  minutes = 10,
  targetAudience = 'all'
}) {
  const googleMeetUrl = session.google_meet_link || session.googleMeetLink || session.meet_link || session.meetLink || '';

  // 1. If explicit recipients are provided, use them directly
  if (Array.isArray(recipients) && recipients.length > 0) {
    const targetAttendees = recipients
      .filter(r => r.email && r.email.includes('@'))
      .map(r => ({ email: r.email.trim().toLowerCase(), name: (r.name || 'Valued Member').trim() || 'Valued Member' }));

    if (targetAttendees.length === 0) {
      return { success: true, total: 0, sent: 0, failed: 0, message: 'No valid recipient emails.' };
    }

    let sentCount = 0, failedCount = 0, simulatedCount = 0;
    for (const attendee of targetAttendees) {
      const { subject, text, html } = generateSessionStartingSoonEmail({
        recipientName: attendee.name,
        session,
        googleMeetUrl,
        minutes,
        siteUrl: siteBaseUrl
      });
      const result = await sendEmail({ to: attendee.email, subject, text, html });
      if (result.success) { sentCount++; if (result.simulated) simulatedCount++; } else failedCount++;
    }
    return {
      success: true,
      total: targetAttendees.length,
      sent: sentCount,
      failed: failedCount,
      simulated: simulatedCount > 0,
      recipients: targetAttendees.map(a => a.email)
    };
  }

  // 2. Fetch recipients according to targetAudience ('all' by default vs 'registered')
  const recipientMap = new Map();
  const sessionId = String(session.id || '');
  const sessionTitle = (session.title || '').trim().toLowerCase();

  if (targetAudience === 'registered') {
    // Registered attendees only
    if (supabase) {
      try {
        const { data: rows, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('type', 'session_registration');

        if (!error && rows && rows.length > 0) {
          for (const row of rows) {
            const rowSessionId = String(row.session_id || '');
            const rowSessionTitle = (row.session_title || row.why_join || '').trim().toLowerCase();
            const isMatch = (sessionId && rowSessionId === sessionId) ||
                            (sessionTitle && rowSessionTitle && (rowSessionTitle === sessionTitle || sessionTitle.includes(rowSessionTitle) || rowSessionTitle.includes(sessionTitle)));

            if (isMatch && row.email && row.email.includes('@')) {
              const cleanEmail = row.email.trim().toLowerCase();
              if (!recipientMap.has(cleanEmail)) {
                recipientMap.set(cleanEmail, {
                  email: cleanEmail,
                  name: (row.name && row.name.trim()) ? row.name.trim() : 'Valued Attendee'
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('[Starting Soon Reminder] Supabase query failed:', err.message);
      }
    }

    if (localDataPath && fs.existsSync(localDataPath)) {
      try {
        const raw = fs.readFileSync(localDataPath, 'utf-8');
        const data = JSON.parse(raw);
        const regs = (data.submissions && data.submissions.sessionRegistrations) || [];
        for (const reg of regs) {
          const regSessionId = String(reg.sessionId || '');
          const regSessionTitle = (reg.sessionTitle || '').trim().toLowerCase();
          const isMatch = (sessionId && regSessionId === sessionId) ||
                          (sessionTitle && regSessionTitle && (regSessionTitle === sessionTitle || sessionTitle.includes(regSessionTitle) || regSessionTitle.includes(sessionTitle)));

          if (isMatch && reg.email && reg.email.includes('@')) {
            const cleanEmail = reg.email.trim().toLowerCase();
            if (!recipientMap.has(cleanEmail)) {
              recipientMap.set(cleanEmail, {
                email: cleanEmail,
                name: (reg.name && reg.name.trim()) ? reg.name.trim() : 'Valued Attendee'
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Starting Soon Reminder] Local data read failed:', err.message);
      }
    }
  } else {
    // Everyone: all unique emails submitted across the site (applications, contacts, registrations)
    if (supabase) {
      try {
        const { data: rows, error } = await supabase
          .from('submissions')
          .select('name, email, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Starting Soon Reminder] Error querying submissions from Supabase:', error.message);
        } else if (rows && rows.length > 0) {
          for (const row of rows) {
            if (row.email && typeof row.email === 'string' && row.email.includes('@')) {
              const cleanEmail = row.email.trim().toLowerCase();
              if (!recipientMap.has(cleanEmail)) {
                recipientMap.set(cleanEmail, {
                  email: cleanEmail,
                  name: (row.name && row.name.trim()) ? row.name.trim() : 'Valued Member'
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('[Starting Soon Reminder] Supabase query failed:', err.message);
      }
    }

    if (localDataPath && fs.existsSync(localDataPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
        const subs = data.submissions || {};
        const allSubs = [
          ...(subs.applications || []),
          ...(subs.contacts || []),
          ...(subs.sessionRegistrations || [])
        ];
        for (const item of allSubs) {
          if (item.email && typeof item.email === 'string' && item.email.includes('@')) {
            const cleanEmail = item.email.trim().toLowerCase();
            if (!recipientMap.has(cleanEmail)) {
              recipientMap.set(cleanEmail, {
                email: cleanEmail,
                name: (item.name && item.name.trim()) ? item.name.trim() : 'Valued Member'
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Starting Soon Reminder] Local data read failed:', err.message);
      }
    }
  }

  const recipientsList = Array.from(recipientMap.values());
  if (recipientsList.length === 0) {
    console.log(`[Starting Soon Reminder] No recipients found for session "${session.title}" (targetAudience: ${targetAudience}).`);
    return {
      success: true,
      total: 0,
      sent: 0,
      failed: 0,
      message: 'No recipients found to notify.'
    };
  }

  const audienceLabel = targetAudience === 'registered' ? 'registered attendees' : 'all community members / email submitters';
  console.log(`[Starting Soon Reminder] Dispatching ${minutes}-minute reminder to ${recipientsList.length} ${audienceLabel} for "${session.title}"...`);

  let sentCount = 0;
  let failedCount = 0;
  let simulatedCount = 0;

  for (const attendee of recipientsList) {
    const { subject, text, html } = generateSessionStartingSoonEmail({
      recipientName: attendee.name,
      session,
      googleMeetUrl,
      minutes,
      siteUrl: siteBaseUrl
    });

    const result = await sendEmail({
      to: attendee.email,
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

  console.log(`[Starting Soon Reminder] Completed: ${sentCount} sent (${simulatedCount} simulated), ${failedCount} failed out of ${recipientsList.length} recipients.`);

  return {
    success: true,
    total: recipientsList.length,
    sent: sentCount,
    failed: failedCount,
    simulated: simulatedCount > 0,
    recipients: recipientsList.map(a => a.email)
  };
}

/**
 * Checks and dispatches:
 * 1. Scheduled session announcement emails.
 * 2. Automated 10-minute pre-session reminders to registered attendees.
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
      // A. General scheduled announcements
      const { data: scheduledSessions, error: sErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('notify_enabled', true)
        .eq('notify_status', 'scheduled')
        .lte('notify_send_at', nowIso);

      if (!sErr && scheduledSessions && scheduledSessions.length > 0) {
        console.log(`[Scheduled Sessions] Processing ${scheduledSessions.length} session email(s) scheduled for announcement dispatch.`);
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

      // B. Automated 10-minute reminders for upcoming sessions
      const { data: upcomingSessions, error: uErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'upcoming')
        .neq('reminder_10m_status', 'sent')
        .neq('reminder_10m_status', 'disabled');

      if (!uErr && upcomingSessions && upcomingSessions.length > 0) {
        for (const s of upcomingSessions) {
          if (s.reminder_10m_enabled === false) continue;
          if (!s.scheduled_at) continue;

          const scheduledTime = new Date(s.scheduled_at).getTime();
          if (isNaN(scheduledTime)) continue;

          const reminderMinutes = parseInt(s.reminder_10m_minutes || '10', 10) || 10;
          const reminderTargetMs = scheduledTime - (reminderMinutes * 60 * 1000);
          const nowMs = now.getTime();

          // Fire if current time is within or past reminder window, but not older than 30 mins after start
          if (nowMs >= reminderTargetMs && nowMs < (scheduledTime + 30 * 60 * 1000)) {
            console.log(`[Scheduled Reminders] Firing automated ${reminderMinutes}m reminder for "${s.title}"...`);
            const remResult = await broadcastSessionStartingSoonReminder({
              session: s,
              supabase,
              siteBaseUrl,
              minutes: reminderMinutes,
              targetAudience: s.reminder_10m_audience || 'all'
            });
            await supabase
              .from('sessions')
              .update({
                reminder_10m_status: remResult.sent > 0 ? 'sent' : (remResult.total === 0 ? 'sent' : 'failed'),
                reminder_10m_sent_at: nowIso
              })
              .eq('id', s.id);
          }
        }
      }
    } catch (err) {
      console.warn('[Scheduled Sessions/Reminders] Supabase check error:', err.message);
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
          // A. General scheduled announcement
          if (
            s.notify_enabled !== false &&
            s.notify_status === 'scheduled' &&
            s.notify_send_at &&
            new Date(s.notify_send_at) <= now
          ) {
            console.log(`[Local Scheduled Sessions] Dispatching announcement for "${s.title}"...`);
            const result = await broadcastSessionAnnouncementToMembers({
              session: s,
              localDataPath,
              siteBaseUrl
            });
            s.notify_status = result.sent > 0 ? 'sent' : 'failed';
            s.notify_sent_at = nowIso;
            modified = true;
          }

          // B. 10-Minute Reminder
          if (
            s.status === 'upcoming' &&
            s.reminder_10m_enabled !== false &&
            s.reminder_10m_status !== 'sent' &&
            s.reminder_10m_status !== 'disabled' &&
            s.scheduled_at
          ) {
            const scheduledTime = new Date(s.scheduled_at).getTime();
            if (!isNaN(scheduledTime)) {
              const reminderMinutes = parseInt(s.reminder_10m_minutes || '10', 10) || 10;
              const reminderTargetMs = scheduledTime - (reminderMinutes * 60 * 1000);
              const nowMs = now.getTime();

              if (nowMs >= reminderTargetMs && nowMs < (scheduledTime + 30 * 60 * 1000)) {
                console.log(`[Local Scheduled Reminders] Dispatching ${reminderMinutes}m reminder for "${s.title}"...`);
                const remResult = await broadcastSessionStartingSoonReminder({
                  session: s,
                  localDataPath,
                  siteBaseUrl,
                  minutes: reminderMinutes,
                  targetAudience: s.reminder_10m_audience || 'all'
                });
                s.reminder_10m_status = remResult.sent > 0 ? 'sent' : (remResult.total === 0 ? 'sent' : 'failed');
                s.reminder_10m_sent_at = nowIso;
                modified = true;
              }
            }
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
