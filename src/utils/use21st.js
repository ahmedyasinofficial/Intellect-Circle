/**
 * 21st.dev Magic UI Integration
 * API Key stored in: VITE_21ST_API_KEY (see .env.local)
 *
 * 21st.dev provides AI-generated, production-ready React components on demand.
 * Usage: import { get21stKey, fetch21stComponent } from '../utils/use21st'
 */

/** Returns the 21st.dev API key from environment variables */
export const get21stKey = () => import.meta.env.VITE_21ST_API_KEY || null;

/**
 * Fetch a Magic UI component from 21st.dev by name/query.
 * @param {string} query - e.g. "animated counter card", "glassmorphism toast"
 */
export async function fetch21stComponent(query, options = {}) {
  const apiKey = get21stKey();
  if (!apiKey) {
    console.warn('[21st.dev] No API key found. Set VITE_21ST_API_KEY in .env.local');
    return null;
  }
  const cacheKey = '21st_' + query + '_' + JSON.stringify(options);
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch {} }
  try {
    const res = await fetch('https://api.21st.dev/api/magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ query, stack: options.stack || 'react', theme: options.theme || 'light', ...options }),
    });
    if (!res.ok) { console.warn('[21st.dev] API error:', res.status); return null; }
    const data = await res.json();
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch (err) { console.error('[21st.dev] Fetch failed:', err); return null; }
}

/** Search 21st.dev curated component registry by category */
export async function search21stComponents(category) {
  const apiKey = get21stKey();
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.21st.dev/api/search?q=' + encodeURIComponent(category) + '&limit=6', {
      headers: { 'Authorization': 'Bearer ' + apiKey },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
