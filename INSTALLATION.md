# 🚀 Media Prestige WhatsApp Bot - Installation & Setup Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Environment Setup](#environment-setup)
- [Running the Bot](#running-the-bot)
- [Running the Dashboard](#running-the-dashboard)
- [Project Structure](#project-structure)
- [Features](#features)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

---

## Overview

**Media Prestige WhatsApp Bot** is an intelligent sales automation system that:
- 🤖 Qualifies leads through conversational AI
- 📊 Tracks customer interactions and preferences
- 💰 Calculates product pricing automatically
- 📈 Provides real-time analytics dashboard
- 🎯 Segments customers by use case (residential, professional, commercial)
- 📱 Sends WhatsApp checkout links with product details

**Dashboard Features:**
- 📊 Real-time lead analytics with progress circles
- 🏆 Top performing products tracking
- 📅 Advanced filtering (phone, status, date range)
- 📥 Export data (CSV, JSON, Excel)
- 📈 Leads timeline and status distribution charts
- ⏱️ Live date/time display

---

## Prerequisites

Before installation, ensure you have:

### Required Software
- **Node.js** (v14.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning repositories) - [Download](https://git-scm.com/)

### Check Your Installation
```bash
node --version    # Should show v14.0.0 or higher
npm --version     # Should show v6.0.0 or higher
```

### Required Accounts
- **WhatsApp Business Account** with WhatsApp Web access
- **Groq API Key** (for AI responses) - [Get API Key](https://console.groq.com)
- **Google Maps API** (optional, for location link)

---

## Installation Steps

### Step 1: Clone/Download the Project
```bash
# If using git
git clone <repository-url>
cd "MPChatBot - Copie (3)"

# Or manually download and extract the folder
cd "c:\Users\user\Desktop\MPChatBot - Copie (3)"
```

### Step 2: Install Dependencies
```bash
npm install
```

**This will install:**
- `whatsapp-web.js` - WhatsApp Web automation
- `groq-sdk` - AI service for responses
- `chart.js` - Dashboard charts
- `dotenv` - Environment variables
- And other required packages

**Installation time:** 2-5 minutes (depending on internet speed)

### Step 3: Verify Installation
```bash
npm list --depth=0
```

You should see all packages listed without errors.

---

## Environment Setup

### Step 1: Create `.env` File
In the project root directory, create a file named `.env`:

```bash
# Windows (PowerShell)
New-Item -Path .env -ItemType File

# Windows (Command Prompt)
type nul > .env

# Mac/Linux
touch .env
```

### Step 2: Add Environment Variables
Open `.env` and add these variables:

```env
# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER=+212XXXXXXXXX    # Your WhatsApp phone number with country code
SALES_WHATSAPP_NUMBER=212600051612     # Sales team WhatsApp number

# API Keys
GROQ_API_KEY=your-groq-api-key-here    # Get from https://console.groq.com

# Google Maps (Optional)
GOOGLE_MAPS_URL=https://maps.app.goo.gl/KPfEza6pFAwdg89X9

# Server Configuration
PORT=3000                                # Dashboard server port (default: 3000)
BOT_STATUS=active                        # Set to 'active' or 'inactive'
```

### Step 3: Get Your API Keys

**Groq API Key:**
1. Visit [https://console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy and paste into `.env`

**.env File Location:**
```
c:\Users\user\Desktop\MPChatBot - Copie (3)\.env
```

**⚠️ IMPORTANT:** Never commit `.env` to Git. It's already in `.gitignore`.

---

## Running the Bot

### Start the WhatsApp Bot
```bash
npm start
```

**Expected Output:**
```
📩 WhatsApp bot initializing...
📱 Scan QR code with your phone
🔌 Connected to WhatsApp
✅ Bot is running and ready to receive messages
```

### First Time Setup
1. After running `npm start`, you'll see a **QR code** in the terminal
2. Open WhatsApp on your phone
3. Go to **Settings → Linked Devices**
4. Click **Link a Device**
5. Scan the QR code with your phone camera
6. ✅ Bot is now live!

### How It Works
The bot will:
1. **Receive messages** from customers on WhatsApp
2. **Analyze intent** (purchase, information request, etc.)
3. **Segment customers** (residential, professional, commercial)
4. **Recommend products** based on their needs
5. **Send checkout links** when purchase intent detected
6. **Log interactions** to `leads.csv`
7. **Update dashboard** in real-time

### Test the Bot
Send a message to the WhatsApp number to test:
- "Bonjour" → Bot responds with greeting
- "Hôtel" → Bot detects commercial segment
- "Oui" → Bot detects purchase intent and sends checkout link

---

## Running the Dashboard

### Start Dashboard Server (New Terminal)
```bash
# In a NEW terminal window
node dashboard-server.js
```

**Expected Output:**
```
🚀 Dashboard server running at http://localhost:3000
📊 Open http://localhost:3000 in your browser to view the dashboard
📡 API endpoint available at http://localhost:3000/api/leads
```

### Access the Dashboard
1. Open your browser
2. Go to: **http://localhost:3000**
3. You'll see:
   - 📊 Real-time lead statistics
   - 📈 Timeline and distribution charts
   - 🏆 Top performing products
   - 🔍 Advanced filtering options
   - 📥 Export functionality

### Dashboard Features

**Statistics Circles:**
- Total Leads (100% filled)
- New Leads (% of total)
- Interested Leads (% of total)
- Confirmed Leads (% of total)

**Analytics Row:**
- Average messages per lead
- Conversion rate (%)
- Interested rate (%)
- Overall engagement score

**Charts:**
- 📈 Leads timeline (7-day history)
- 📊 Status distribution (pie chart)

**Filters:**
- Search by phone number
- Filter by status (new/interested/confirmed)
- Filter by date range
- Apply/Clear filters
- Real-time results counter

**Export Options:**
- 📄 CSV format
- 📋 JSON format
- 📊 Excel format

---

## Running Both Simultaneously

### Terminal 1: Start the Bot
```bash
npm start
```

### Terminal 2: Start the Dashboard
```bash
node dashboard-server.js
```

### Terminal 3: Monitor Logs (Optional)
```bash
# View real-time logs
tail -f logs.txt
```

**Now you have:**
✅ WhatsApp bot running and receiving messages  
✅ Dashboard server displaying analytics  
✅ Leads being logged automatically  
✅ Real-time data updates  

---

## Project Structure

```
MPChatBot - Copie (3)/
├── index.js                    # Main bot logic
├── dashboard-server.js         # Dashboard API server
├── dashboard.html              # Dashboard UI (modern glassmorphic design)
├── package.json                # Dependencies
├── .env                        # Environment variables (create this)
├── leads.csv                   # Auto-generated lead logs
│
├── 📁 Core Files
│   ├── segmentDetector.js      # Customer segmentation logic
│   ├── responses.js            # Bot response templates
│   ├── templates.js            # Message templates
│   ├── productsDatabase.js     # Product information
│   ├── chatbotData.ts          # Chatbot configuration
│   └── apiManager.js           # API management
│
├── 📁 Public (Images & Assets)
│   ├── logo.webp               # Media Prestige logo
│   ├── L1pro8.webp             # Product images
│   ├── Smart_Soundbar.webp
│   └── ... (other product images)
│
├── 📁 Documentation
│   ├── README.md               # Overview
│   ├── USAGE.md                # Feature guide
│   ├── PROJECT_SUMMARY.md      # Technical summary
│   └── INSTALLATION.md         # This file
│
└── 📁 Config Files
    ├── .env                    # Environment variables
    ├── .gitignore              # Git ignore rules
    └── .env.example            # Example env file
```

---

## Features

### 🤖 AI-Powered Bot
- Natural language understanding
- Groq API integration for intelligent responses
- Multi-language support (French/English)
- Context-aware conversations

### 📊 Smart Lead Management
- Automatic customer segmentation
- Purchase intent detection
- Conversation history tracking
- Lead status management (new/interested/confirmed)

### 💰 Product Management
- Database of 15+ audio products
- Price calculation with quantities
- Automatic product recommendations
- Segment-based suggestions

### 📱 WhatsApp Integration
- QR code authentication
- Auto-generated checkout links
- Product image sharing
- Message templates

### 📈 Analytics Dashboard
- Real-time statistics
- Progress circle indicators
- Advanced filtering system
- Export functionality
- Performance metrics

### 📁 Data Management
- CSV lead logging
- Auto-delete old logs
- Database cleanup

---

## Troubleshooting

### Bot Not Connecting
```bash
# Issue: "Cannot find module 'whatsapp-web.js'"
# Solution:
npm install
```

### QR Code Not Scanning
```bash
# Issue: QR code appears but doesn't scan
# Solution:
1. Make sure WhatsApp is open on your phone
2. Go to Settings → Linked Devices
3. Click "Link a Device"
4. Try scanning again
5. If still fails, restart: npm start
```

### API Key Error
```bash
# Issue: "Invalid Groq API key"
# Solution:
1. Check .env file has GROQ_API_KEY
2. Verify key is correct from https://console.groq.com
3. Restart bot: npm start
```

### Dashboard Not Loading
```bash
# Issue: "Cannot connect to localhost:3000"
# Solution:
1. Make sure dashboard server is running: node dashboard-server.js
2. Check if port 3000 is in use:
   netstat -ano | findstr :3000
3. If in use, kill the process or use different port
4. Refresh browser: Ctrl+Shift+R
```

### Leads CSV Empty
```bash
# Issue: "leads.csv shows no data"
# Solution:
1. Check bot is running: npm start
2. Send test message to bot
3. Wait 2-3 seconds
4. Refresh dashboard
5. Check console for errors
```

### Port Already in Use
```bash
# Issue: "Port 3000 already in use"
# Solution - Option 1: Kill existing process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Solution - Option 2: Use different port
# Edit dashboard-server.js, line 5:
const PORT = 3001; // Change to any available port
```

### High Memory Usage
```bash
# Bot running slowly or using too much memory
# Solution:
1. Clear browser cache: Ctrl+Shift+Del
2. Restart bot: npm start
3. Close unnecessary applications
4. Check logs for errors: tail -f logs.txt
```

---

## Common Commands

```bash
# Start bot
npm start

# Start dashboard
node dashboard-server.js

# Install dependencies
npm install

# Check Node version
node --version

# Check npm version
npm --version

# List installed packages
npm list --depth=0

# Clean install
npm clean-install

# Check for logs
dir logs.*
```

---

## Security Best Practices

1. **Never share `.env` file** - Contains sensitive API keys
2. **Use strong passwords** - For WhatsApp account
3. **Rotate API keys regularly** - Update Groq keys monthly
4. **Don't commit `.env`** - Already in `.gitignore`
5. **Keep Node.js updated** - For security patches
6. **Monitor logs** - Check for unusual activity

---

## Performance Tips

1. **Dashboard Refresh Rate** - Auto-updates every 30 seconds
2. **Filter Data** - Use filters to reduce table size
3. **Export Old Data** - Keep leads.csv manageable
4. **Clear Browser Cache** - Improves dashboard speed
5. **Use Chrome/Edge** - Better performance than other browsers

---

## Support

### Getting Help
1. Check **USAGE.md** for feature documentation
2. Review **PROJECT_SUMMARY.md** for technical details
3. Check console logs for error messages
4. Review **Troubleshooting** section above

### Error Logs
Errors are logged to console. Watch for:
- 🔴 Red error messages
- ⚠️ Yellow warnings
- 📊 Blue info messages

---

## What's Next?

1. ✅ Install and run the bot
2. ✅ Test with WhatsApp messages
3. ✅ Monitor dashboard analytics
4. ✅ Export and analyze lead data
5. ✅ Optimize product recommendations

---

## Version Information

- **Bot Version:** 1.0.0
- **Dashboard Version:** 2.0.0
- **Node.js Required:** v14.0.0+
- **npm Required:** v6.0.0+
- **Last Updated:** April 2026

---

**Happy chatting! 🚀**

For questions or issues, check the troubleshooting section or review the log files.
