# ASTRA AURA

Mobile-first PWA for an AI-powered astrology and esoteric consultation service.

## v0.1
- responsive mobile interface
- PWA manifest and service worker
- birth profile stored locally
- consultation UI
- provider-agnostic frontend foundation

## Planned architecture
GitHub Pages -> Web/PWA -> Supabase -> Edge Functions -> AI provider
Telegram -> Supabase Edge Functions -> same AI layer

Secrets such as Telegram bot tokens, Supabase service-role keys and AI API keys must never be placed in the frontend or committed to Git.

## GitHub Pages
The repository is designed to run as a static site from the main branch root.
