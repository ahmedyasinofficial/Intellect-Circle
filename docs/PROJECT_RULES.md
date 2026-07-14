# Intellect Circle - Project Rules

## Project Overview

Intellect Circle is a professional educational and psychology platform that hosts webinars, workshops, research activities, and community initiatives. The project must remain secure, scalable, and easy to maintain.

---

# Tech Stack

Frontend
- React
- Vite

Backend
- Serverless API (Vercel Functions)

Database
- Supabase

Storage
- Supabase Storage

Authentication
- Supabase Auth

Hosting
- Vercel

Version Control
- Git + GitHub

---

# General Rules

- Read this file before making any changes.
- Make only the requested changes.
- Never modify unrelated features.
- Preserve backward compatibility.
- Never remove existing functionality unless requested.
- Build the project before considering a task complete.
- Keep code modular and reusable.
- Use meaningful file and function names.

---

# Security Rules

- Never expose API keys.
- Never expose admin-only data publicly.
- Protect every admin endpoint with authentication.
- Validate every input on the server.
- Never trust client-side validation alone.
- Follow Supabase Row Level Security (RLS).

---

# Database Rules

- Never hardcode configurable values.
- Store editable values in Supabase.
- Use migrations/schema updates for database changes.
- Preserve old records whenever possible.

---

# Certificate System Rules

- Use the uploaded certificate template exactly as provided.
- Never recreate or redesign the certificate.
- Only overlay dynamic values.
- Use saved layout coordinates.
- Generate PDFs on the server.
- Generate unique certificate IDs.
- Every certificate must be verifiable.
- QR code must open the online verification page.
- Certificate layout must remain editable from the Admin Panel.

---

# Admin Panel Rules

Everything editable should be configurable.

Examples:
- Homepage content
- Featured session
- Team
- Certificate layout
- Signatures
- Promotion notices
- Analytics settings

Avoid requiring code changes for content updates.

---

# UI Rules

- Keep the existing design language.
- Maintain responsiveness.
- Don't redesign sections unless requested.
- Reuse existing components whenever possible.
- Keep animations lightweight.

---

# Coding Rules

- Avoid duplicate code.
- Prefer reusable components.
- Keep functions small.
- Write readable code.
- Comment only when necessary.

---

# AI Working Rules

- Complete one task at a time.
- Do not make unrelated improvements.
- Minimize token usage.
- Reuse existing code whenever possible.
- If unsure, ask before making breaking changes.
- At the end of every task, report only:
  - Files changed
  - Summary
  - Remaining issues

---

# Definition of Done

A task is complete only if:

✓ Build succeeds
✓ No console errors
✓ Existing features still work
✓ New feature works
✓ No unrelated files were modified