# XR Home Chat — Vercel (GitHub → Vercel)

This repo serves an A‑Frame frontend from `/public` and Edge API routes from `/api/*`.
A CSP header is configured in `vercel.json` to allow A‑Frame/three.js.

## Deploy
1) Push this folder to GitHub.
2) In Vercel, import the repo.
3) Set Environment Variables:
   - `OPENAI_API_KEY` (required)
   - `OPENAI_MODEL_TEXT` = `gpt-4o-mini` (or `gpt-4o`)
   - `OPENAI_MODEL_REALTIME` = `gpt-4o-realtime-preview`
4) Deploy.

## Endpoints
- `POST /api/chat` — streams text from OpenAI Responses API
- `GET /api/realtime-token` — mints ephemeral Realtime session

## Notes
- If `/api/chat` returns 500, check Vercel Logs. Most common issues:
  - Missing/typo in `OPENAI_API_KEY`
  - Invalid payload. This repo uses a simple `input` string with `stream: true` for compatibility.
