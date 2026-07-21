import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

const CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const CALLBACK_URL = (process.env.APP_URL || 'http://localhost:5173') + '/api/twitter/callback';
const SCOPE = 'tweet.read users.read follows.read';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const maxAge = 5 * 60;
  res.setHeader('Set-Cookie', [
    `tw_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
    `tw_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
  ]);

  const url = new URL('https://twitter.com/i/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', CALLBACK_URL);
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 's256');

  res.writeHead(302, { Location: url.toString() });
  res.end();
}
