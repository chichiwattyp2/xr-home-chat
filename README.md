# A‑Frame × ChatGPT — Vercel Serverless API

Deploy the API to **Vercel** and host your static A‑Frame site on **Neocities** (or anywhere).

## Files
- `/api/chat.js` — Streams text via OpenAI Responses API.
- `/api/realtime-token.js` — Mints a short‑lived Realtime session for WebRTC.
- `/public/*` — Optional; you can ignore if hosting static elsewhere.

## Deploy steps (Vercel)
1. Create a new Vercel project (import this folder).
2. In **Vercel → Settings → Environment Variables**, add:
   - `OPENAI_API_KEY` = your key
   - `OPENAI_MODEL_TEXT` = `gpt-4o-mini` (or `gpt-4o`)
   - `OPENAI_MODEL_REALTIME` = `gpt-4o-realtime-preview`
3. Deploy.

Your endpoints will be:
- `https://<your-vercel-app>.vercel.app/api/chat`
- `https://<your-vercel-app>.vercel.app/api/realtime-token`

## Use from Neocities
- Upload your A‑Frame static site to Neocities.
- In your `client.js`, set `const API_BASE = "https://<your-vercel-app>.vercel.app";`

