# Media Prestige WhatsApp Bot

WhatsApp sales assistant bot for Media Prestige.

Website: https://media-prestige.com/

## Features

- Connects to WhatsApp Web and replies to private messages
- Greets new customers with qualification question
- Detects customer segment (residential, professional, portable)
- Recommends Bose products from local catalog
- Sends product images on request
- FAQ detection for quick answers
- Purchase intent detection with checkout link
- Lead tracking in `leads.csv` data extracted to Dashboard using local server
- Multi-AI provider fallback: Gemini → Groq → Ollama

## Requirements

- Node.js 18+
- npm
- WhatsApp account
- AI provider API keys (optional)

## Installation

```bash
npm install
```

## Environment Variables (.env)

```env
GEMINI_API_KEY=your_key_here
GEMINI_API_KEY_2=your_key_here
GEMINI_API_KEY_3=your_key_here
GROQ_API_KEY=your_key_here
GROQ_API_KEY_2=your_key_here
SALES_WHATSAPP_NUMBER=212600051612
GOOGLE_MAPS_URL=https://maps.app.goo.gl/xxx
```

## Running

### Option 1: Dashboard (Recommended)

```bash
node dashboard-server.js
```

Then open http://localhost:3001 in your browser.

### Option 2: Direct

```bash
node index.js
```

On first run, scan the QR code with WhatsApp to link.

### Option 3: Windows Launcher

Double-click `Launch Media Prestige GUI.bat` - opens dashboard automatically.

### Option 4: Hidden (No Console)

Double-click `start-hidden.vbs` - runs in background without window.

### Option 5: PM2 (Production)

```bash
pm2 start dashboard-server.js --name "MPChatBot"
pm2 save
```

## Project Structure

```
.
├── index.js              # Main bot logic
├── dashboard-server.js  # Control dashboard
├── apiManager.js        # AI provider routing
├── gemini.js           # Gemini API
├── groq.js             # Groq API
├── ollama.js           # Local Ollama
├── leads.js            # Lead tracking
├── leads.csv           # Lead database
├── segmentDetector.js  # Segment & FAQ detection
├── productsDatabase.js # Product catalog
├── templates.js        # Response templates
├── systemPrompt.js     # AI prompt
├── public/             # Product images
└── .env               # Environment variables
```

## Customization

- `templates.js` - Response messages
- `segmentDetector.js` - Segment keywords & FAQ
- `productsDatabase.js` - Products, prices, images
- `systemPrompt.js` - AI behavior

## Commands

- `pm2 list` - See running bots
- `pm2 logs MPChatBot` - View logs
- `pm2 restart MPChatBot` - Restart bot
- `pm2 stop MPChatBot` - Stop bot

stop the bot using 
taskkill //F //IM node.exe