
// spotify/spotify-auth.js

// ---- EDIT THESE ----
const SPOTIFY_CLIENT_ID   = 'e89a56e4ba4948e5a60a0f1880b07aad';
const SPOTIFY_REDIRECT_URI = 'https://web2xr.neocities.org/callback';
const SPOTIFY_SCOPES = [
  // add if you need playback control:
  // 'streaming','user-read-email','user-read-private',
  // 'user-read-playback-state','user-modify-playback-state'
].join(' ');

// ---- Helpers ----
function b64url(buf){return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha256(str){const data=new TextEncoder().encode(str);return crypto.subtle.digest('SHA-256',data)}
function randStr(len=64){const a=new Uint8Array(len);crypto.getRandomValues(a);return Array.from(a,v=>('0'+v.toString(16)).slice(-2)).join('')}

async function startPkce(){
  const verifier = randStr(64);
  const challenge = b64url(await sha256(verifier));
  sessionStorage.setItem('sp_verifier', verifier);

  const auth = new URL('https://accounts.spotify.com/authorize');
  auth.search = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES
  });
  location.href = auth.toString();
}

async function exchangeCodeForToken(){
  const code = new URLSearchParams(location.search).get('code');
  if (!code) return null;
  const verifier = sessionStorage.getItem('sp_verifier');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier
  });
  const res = await fetch('https://accounts.spotify.com/api/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  if (!res.ok) throw new Error('Token exchange failed');
  const d = await res.json();
  localStorage.setItem('sp_access_token', d.access_token);
  localStorage.setItem('sp_refresh_token', d.refresh_token || '');
  localStorage.setItem('sp_token_expires', (Date.now()+(d.expires_in-60)*1000)+'');
  return d.access_token;
}

async function refreshTokenIfNeeded(){
  const access = localStorage.getItem('sp_access_token');
  const exp    = +(localStorage.getItem('sp_token_expires')||0);
  if (access && Date.now() < exp) return access;

  const refresh = localStorage.getItem('sp_refresh_token');
  if (!refresh) return null;

  const body = new URLSearchParams({
    grant_type:'refresh_token',
    refresh_token:refresh,
    client_id:SPOTIFY_CLIENT_ID
  });
  const res = await fetch('https://accounts.spotify.com/api/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  if (!res.ok) return null;
  const d = await res.json();
  localStorage.setItem('sp_access_token', d.access_token);
  localStorage.setItem('sp_token_expires', (Date.now()+(d.expires_in-60)*1000)+'');
  if (d.refresh_token) localStorage.setItem('sp_refresh_token', d.refresh_token);
  return d.access_token;
}

/**
 * Public: returns a token or redirects to Spotify if needed.
 * Also dispatches 'spotify-token-ready' when token is available.
 */
window.ensureSpotifyAccessToken = async function ensureSpotifyAccessToken() {
  let token = await refreshTokenIfNeeded();
  if (!token) token = await exchangeCodeForToken();
  if (!token) { await startPkce(); return null; }

  // Let the app know Spotify is ready
  document.dispatchEvent(new CustomEvent('spotify-token-ready', { detail: { token } }));
  return token;
};

