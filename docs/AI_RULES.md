# AI Rules

## General
- Never rewrite working code unless requested.
- Make the smallest possible change.
- Preserve the current UI and functionality.
- Finish one task completely before starting another.
- If a database change is required, update both the frontend and backend.
- Keep the project production-ready.

## Coding
- Follow the existing React + Vite structure.
- Keep components clean and readable.
- Do not duplicate code.
- Reuse existing utilities whenever possible.
- Avoid unnecessary dependencies.

## Database
- Keep Supabase schema and APIs synchronized.
- Never remove existing data.
- Add migrations instead of breaking changes.

## Certificate System
- Use the uploaded certificate template from /public.
- Never redraw the certificate.
- Overlay only dynamic fields.
- Certificate IDs must be unique.
- QR codes must verify certificates.
- Layout values come from the database.

## UI
- Maintain the existing design language.
- Make responsive changes only.
- Never redesign pages unless requested.

## Security
- Never expose API keys.
- Protect admin routes.
- Validate all inputs.
- Check authentication before admin actions.

## Performance
- Prefer fixing existing code over rewriting it.
- Keep prompts token-efficient.
- Reuse existing logic whenever possible.

## Before finishing
- Verify the build succeeds.
- Check for console errors.
- Keep changes minimal.