# Media Prestige WhatsApp Bot

WhatsApp sales assistant for Media Prestige built with Node.js and `whatsapp-web.js`.

The bot handles inbound WhatsApp conversations, qualifies the customer, recommends products, sends product images, and tracks leads in `leads.csv`. For open-ended replies it can route across multiple AI providers with fallbacks: Gemini, Groq, and local Ollama.

Website: https://media-prestige.com/

## What The Bot Does

- Connects to WhatsApp Web and replies to private messages
- Greets new customers and asks a qualification question
- Detects likely customer segment:
  - residential
  - professional
  - portable / event
- Recommends products from the local Bose catalog
- Sends product images from `public/` when the customer asks for photos
- Answers a small FAQ set directly without calling AI
- Detects explicit purchase intent and sends a prefilled WhatsApp checkout/contact link
- Tracks leads and status changes in `leads.csv`
- Keeps lightweight in-memory conversation state per phone number

## Current Architecture

### Main Runtime

- `index.js`: bootstraps the WhatsApp client and handles the full message flow
- `leads.js`: initializes and updates `leads.csv`
- `segmentDetector.js`: detects segment, FAQ answers, language hints, and conversation stage
- `productsDatabase.js`: local product catalog with descriptions, prices, and image paths
- `templates.js`: static response templates used for greetings, contact info, checkout, and fallbacks
- `systemPrompt.js`: centralized prompt for AI-generated replies

### AI Providers

- `apiManager.js`: provider routing, availability checks, timeout handling, and fallback order
- `gemini.js`: Gemini primary plus secondary and tertiary API keys
- `groq.js`: Groq primary and fallback API keys with model rotation
- `ollama.js`: local Ollama fallback

### Data And Assets

- `leads.csv`: persisted lead log
- `public/`: product and showroom images
- `.wwebjs_auth/` and `.wwebjs_cache/`: WhatsApp session/auth cache

## Message Flow

1. A customer sends a private WhatsApp message.
2. The bot ignores group messages and status traffic.
3. New customers receive a fixed greeting and qualification prompt.
4. The bot tracks conversation history and lead status per phone number.
5. On later messages, it can:
   - answer FAQ items directly
   - detect a segment and recommend matching products
   - send product images
   - use AI for richer follow-up answers
   - detect strong purchase intent and send a WhatsApp contact/checkout link
6. Lead status is updated in `leads.csv` as `new`, `interested`, or `confirmed`.

## Lead Tracking

Lead logging is handled by `leads.js`.

- Creates `leads.csv` if it does not exist
- Stores:
  - timestamp
  - phone number
  - status
  - message count
  - last message
  - notes
- Updates existing contacts instead of duplicating them
- Upgrades status forward only:
  - `new -> interested -> confirmed`

`confirmed` is used when the bot actually sends the sales WhatsApp link.

## Product Segments

Segment detection is keyword-based and currently routes customers into these groups:

- `residential`: home cinema, TV, home audio
- `professional`: restaurant, hotel, boutique, commercial installation
- `portable`: DJ, concert, wedding, event, live use

The bot then uses `productsDatabase.js` to suggest or illustrate matching products such as:

- Smart Soundbar / Smart Ultra Soundbar
- DM series ceiling speakers
- Bose Music Amplifier / IZA2120
- L1 PRO 8 / L1 PRO 16

## AI Fallback Order

Open-ended response generation is routed through `apiManager.js`.

Default priority:

1. Gemini primary
2. Gemini fallback key 2
3. Gemini fallback key 3
4. Groq primary
5. Groq fallback
6. Ollama local fallback

Notes:

- Gemini usage is tracked with a conservative daily cap in code.
- Groq uses model rotation to reduce rate-limit pressure.
- Ollama is only used if a local Ollama server is available.

## Requirements

- Node.js
- npm
- A WhatsApp account to link with WhatsApp Web
- At least one configured AI provider if you want AI-generated responses
- Optional local Ollama installation for offline/local fallback

## Installation

```bash
npm install
```

## Environment Variables

The code expects environment values in `.env`. Based on the current implementation, these are the relevant keys:

```env
GEMINI_API_KEY=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
GROQ_API_KEY=
GROQ_API_KEY_2=
SALES_WHATSAPP_NUMBER=212600051612
GOOGLE_MAPS_URL=https://maps.app.goo.gl/KPfEza6pFAwdg89X9
```

Notes:

- You do not need every key.
- The bot can run with just one provider configured.
- `SALES_WHATSAPP_NUMBER` is used when generating the purchase/contact link.
- `GOOGLE_MAPS_URL` is used in showroom/contact replies.

## Run

```bash
npm start
```

For development:

```bash
npm run dev
```

On first run:

1. A QR code appears in the terminal.
2. Open WhatsApp on your phone.
3. Go to Linked Devices.
4. Scan the QR code.

After that, session data is stored locally and reused until WhatsApp authentication expires or is cleared.

## Important Runtime Notes

- The bot only processes private messages.
- It stores active conversation state in memory, so a restart clears the live in-memory context.
- Lead data still persists in `leads.csv`.
- Product images are sent from local files under `public/`.
- There are periodic console logs for lead summaries and API health checks.

## Known Gaps In The Docs

Older documentation in this repo describes a simpler bot. The current codebase now includes:

- CSV lead tracking
- segment-based product recommendation
- product image sending
- multi-provider AI routing
- purchase-intent confirmation logic

If you update other docs, use `index.js` as the source of truth.

## File Map

```text
.
|-- index.js
|-- apiManager.js
|-- gemini.js
|-- groq.js
|-- ollama.js
|-- leads.js
|-- leads.csv
|-- segmentDetector.js
|-- productsDatabase.js
|-- templates.js
|-- systemPrompt.js
|-- public/
|-- .wwebjs_auth/
`-- .wwebjs_cache/
```

## Quick Customization

Common places to edit:

- `templates.js`: fixed customer-facing messages
- `segmentDetector.js`: segment keywords and FAQ answers
- `productsDatabase.js`: product catalog, descriptions, prices, images
- `systemPrompt.js`: AI tone and response rules
- `index.js`: orchestration, purchase logic, and conversation flow

## Start Scripts

- `npm start`: runs `node index.js`
- `npm run dev`: runs `nodemon index.js`

## One-Click Windows Launcher

If you want to run the bot without opening VS Code:

- Double-click `Launch Media Prestige GUI.bat`
- The luxury control dashboard opens automatically in your browser
- Use the `Start Bot` / `Stop Bot` controls inside the dashboard
- If WhatsApp needs a login QR code, it appears in the dashboard console

This launcher starts both:

- `dashboard-server.js` for the local control dashboard at `http://localhost:3001`
- `index.js` from inside the dashboard controls when you click `Start Bot`

## Support

If behavior looks inconsistent, check the code in this order:

1. `index.js`
2. `templates.js`
3. `segmentDetector.js`
4. `apiManager.js`

That matches the actual runtime behavior more closely than the older summary docs.
