# XR Home Chat — Diagnostics Build

Adds better error surfacing and a /api/health endpoint.
- API returns the **upstream HTTP status** from OpenAI instead of masking as 500.
- /api/health validates envs and can optionally run a minimal OpenAI call.

Deploy as usual, then open /api/health to verify config.
