# Media Prestige WhatsApp Bot - Usage Guide 📖

## Quick Start 🚀

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Bot
```bash
npm start
```

### Step 3: Scan QR Code
- A QR code will appear in your terminal
- Open WhatsApp on your phone
- Go to: **Settings > Linked Devices > Link a Device**
- Scan the QR code

### Step 4: Bot is Ready! ✅
The bot will now automatically respond to customer messages using Google Gemini AI for intelligent, context-aware conversations.

---

## Example Conversations 💬

### Example 1: Price Inquiry (English)
```
Customer: What's the price?
Bot: The price is 199 MAD 😊 Would you like to order now?
```

### Example 2: Delivery Question (French)
```
Customer: Vous livrez?
Bot: Oui livraison partout au Maroc 🇲🇦 en 2 à 4 jours 😊 Vous voulez commander?
```

### Example 3: Availability (Darija)
```
Customer: واش متوفر؟
Bot: نعم المنتج متوفر! 🎉 واش تحب تطلبو دابا؟
```

### Example 4: How to Order (English)
```
Customer: How do I order?
Bot: Ordering is easy! Just tell me: your name, phone number, and city 📝 I'll take care of the rest!
```

### Example 5: Thank You (French)
```
Customer: Merci beaucoup!
Bot: Merci à vous! 😊 Si vous avez besoin de quoi que ce soit, je suis là. Vous voulez voir d'autres produits?
```

---

## AI-Powered Responses 🤖

The bot uses **Google Gemini AI** to generate intelligent, context-aware responses:

- **Natural Conversations** - AI understands context and nuance
- **Dynamic Responses** - No repetitive, robotic replies
- **Sales-Focused** - Always guides toward purchasing
- **Multi-language** - Responds in customer's language
- **Fallback System** - Uses pre-defined responses if AI is unavailable
- **Instant Responses** - Common questions get immediate replies (no AI delay)
- **Local AI Fallback** - Uses Ollama (Llama 3) when Gemini is unavailable

### How It Works
1. Customer sends a message
2. Bot detects the language
3. **Quick Response Check** - If it's a common question (greeting, price, delivery, etc.), respond instantly
4. **AI Processing** - For complex messages, Gemini AI analyzes and generates response
5. **Ollama Fallback** - If Gemini fails, uses local Ollama (Llama 3)
6. Bot sends the reply with a call-to-action

### Speed Optimization
- **Common questions** (hello, price, delivery, etc.) → Instant response (0ms)
- **Complex messages** → Gemini AI with 3-second timeout
- **Gemini unavailable** → Ollama (Llama 3) with 5-second timeout
- **Fallback** → Pre-defined responses if all AI fails

---

## Ollama Setup (Optional) 🦙

If you want to use local Ollama (Llama 3) as a fallback when Gemini is unavailable:

### Install Ollama
1. Download Ollama from https://ollama.ai/
2. Install it on your computer
3. Run Ollama (it will start automatically)

### Download Llama 3
```bash
ollama pull llama3
```

### Verify Installation
```bash
ollama list
```

You should see `llama3` in the list.

### How It Works
- Bot tries Gemini AI first
- If Gemini fails or times out, it tries Ollama
- If Ollama also fails, it uses pre-defined responses
- Ollama runs locally (no internet required)

---

## Supported Languages 🌍

The bot automatically detects and responds in:

1. **🇲🇦 Arabic (Darija)** - Moroccan Arabic
   - Keywords: مرحبا، شحال، واش، كاين، التوصيل، شكرا، بسلامة
   
2. **🇫🇷 French** - Français
   - Keywords: bonjour, prix, livraison, disponible, commander, merci, au revoir
   
3. **🇬🇧 English** - English
   - Keywords: hello, price, delivery, available, order, thank you, goodbye

---

## Common Customer Questions ❓

### Price Questions
- "What's the price?" → Give price + encourage order
- "شحال الثمن؟" → Give price + encourage order
- "Quel est le prix?" → Give price + encourage order

### Delivery Questions
- "Do you deliver?" → Yes, Morocco-wide, 2-4 days
- "واش كاين التوصيل؟" → Yes, Morocco-wide, 2-4 days
- "Vous livrez?" → Yes, Morocco-wide, 2-4 days

### Availability Questions
- "Is this available?" → Yes + push to buy
- "واش متوفر؟" → Yes + push to buy
- "C'est disponible?" → Yes + push to buy

### How to Order
- "How to order?" → Explain (name, phone, city)
- "كيفاش نطلب؟" → Explain (name, phone, city)
- "Comment commander?" → Explain (name, phone, city)

---

## Sales Strategy 🎯

The bot follows these principles:

### 1. Always Guide Toward Buying
Every response ends with a call-to-action:
- "Do you want to place your order?"
- "واش تحب تطلبو دابا؟"
- "Vous voulez commander maintenant?"

### 2. Create Urgency
- Limited stock mentions
- Popular item highlights
- Fast delivery emphasis

### 3. Highlight Benefits
- Quality products
- Fast delivery (2-4 days)
- Cash on delivery available
- Morocco-wide coverage

### 4. Reassure Hesitant Customers
- "Don't hesitate! Our products are high quality"
- "لا تتردد! منتجاتنا عالية الجودة"
- "N'hésitez pas! Nos produits sont de haute qualité"

### 5. Simple Ordering Process
Always explain ordering in 3 steps:
1. Name
2. Phone number
3. City

---

## Bot Behavior Rules 📋

### ✅ DO:
- Reply in the same language as customer
- Keep responses short (max 2 sentences)
- Use emojis naturally
- End with call-to-action
- Be friendly and helpful
- Guide toward buying

### ❌ DON'T:
- Say you are an AI
- Give long paragraphs
- Ignore customer questions
- Be robotic or formal
- Start conversations (only reply)

---

## Customization 🎨

### Adding New Products

Edit `responses.js` to add product-specific responses:

```javascript
const productResponses = {
    'product-name': {
        darija: 'وصف المنتج بالدارجة',
        french: 'Description du produit en français',
        english: 'Product description in English'
    }
};
```

### Adding New Keywords

Edit the `keywords` object in `responses.js`:

```javascript
const keywords = {
    newCategory: ['keyword1', 'keyword2', 'كلمة1', 'كلمة2']
};
```

### Changing Store Information

Edit `config.js`:

```javascript
store: {
    name: 'Media Prestige',
    website: 'https://media-prestige.com/',
    deliveryTime: '2-4 days',
    deliveryArea: 'All over Morocco 🇲🇦'
}
```

---

## Troubleshooting 🔧

### Bot not responding?
1. Check if QR code was scanned
2. Verify WhatsApp is connected
3. Check terminal for error messages
4. Restart the bot: `npm start`

### Wrong language detected?
- The bot uses keyword matching
- Add more keywords to improve detection
- Test with `node test.js`

### Need to reset?
1. Delete `.wwebjs_auth/` folder
2. Restart the bot
3. Scan QR code again

---

## Testing 🧪

Run the test suite:
```bash
node test.js
```

This will test:
- Language detection
- Response generation
- All supported languages
- Common customer questions

---

## Support 📞

For issues or questions:
1. Check this guide
2. Review README.md
3. Contact development team

---

**Media Prestige** - Quality Products, Fast Delivery 🇲🇦
