# XR Home Chat — Vercel (Full)
One repo → deploy to Vercel → serves **A‑Frame front-end** from `/public` and **Edge API** at `/api/*`.

## Deploy (Vercel)
1. Create a new project in Vercel and import this folder.
2. In **Settings → Environment Variables** add:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `OPENAI_MODEL_TEXT` = `gpt-4o-mini` (or `gpt-4o`)
   - `OPENAI_MODEL_REALTIME` = `gpt-4o-realtime-preview`
3. Deploy. Visit your domain (e.g., `https://<app>.vercel.app`).

No `vercel.json` is required; each API file declares `runtime: 'edge'`.

## Local Dev
- Install Vercel CLI: `npm i -g vercel`
- Run: `vercel dev`
- Open: `http://localhost:3000`

## Files
- `/public/index.html` — A‑Frame scene + minimal UI
- `/public/client.js` — calls same-origin API endpoints
- `/api/chat.js` — streams text from OpenAI Responses API
- `/api/realtime-token.js` — mints ephemeral WebRTC session for Realtime API
