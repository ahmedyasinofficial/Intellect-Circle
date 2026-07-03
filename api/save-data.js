import settingsHandler from './settings.js';

export default async function handler(req, res) {
  // Proxy for backwards compatibility
  return settingsHandler(req, res);
}
