import type { IncomingMessage, ServerResponse } from 'http';

const CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const TARGET_USERNAME = (process.env.TWITTER_TARGET_USERNAME || 'DGDreamsapp').toLowerCase();
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function parseCookies(header: string | undefined): Record<string, string> {
  const obj: Record<string, string> = {};
  if (!header) return obj;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) obj[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return obj;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookies = parseCookies(req.headers.cookie);
  const savedState = cookies['tw_state'];
  const codeVerifier = cookies['tw_verifier'];

  const redirect = (params: string) => {
    res.writeHead(302, { Location: APP_URL + params });
    res.end();
  };

  if (error || !code || !state || state !== savedState || !codeVerifier) {
    return redirect('/?tw_error=oauth_failed');
  }

  try {
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: APP_URL + '/api/twitter/callback',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      return redirect('/?tw_error=token_exchange_failed');
    }

    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const meRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (!meRes.ok) {
      return redirect('/?tw_error=userinfo_failed');
    }

    const meData: any = await meRes.json();
    const username: string = meData.data?.username || '';
    const userId: string = meData.data?.id || '';

    const followRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/following?max_results=1000&user.fields=username`,
      { headers: { Authorization: 'Bearer ' + accessToken } },
    );

    if (!followRes.ok) {
      return redirect('/?tw_error=follow_check_failed');
    }

    const followData: any = await followRes.json();
    const following: any[] = followData.data || [];
    const isFollowing = following.some(
      (u: any) => u.username?.toLowerCase() === TARGET_USERNAME,
    );

    if (!isFollowing) {
      return redirect('/?tw_error=not_following&tw=' + encodeURIComponent('@' + username));
    }

    return redirect('/?tw_ok=1&tw=' + encodeURIComponent('@' + username));
  } catch {
    return redirect('/?tw_error=server_error');
  }
}
