const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const { generateResponse } = require('./gemini');
const { generateOllamaResponse, isOllamaAvailable } = require('./ollama');
const { generateGroqResponse, isGroqAvailable } = require('./groq');
const { speechToText, textToSpeech, isVoiceServiceAvailable } = require('./voice-processor');
const { initializeCSV, loadExistingCustomers, logLead, confirmLead, getLeadsSummary, printLeads } = require('./leads');
const { detectSegment, getSegmentRecommendation, checkFAQ, detectLanguage, buildSegmentContext, detectConversationStage } = require('./segmentDetector');
const { getProductDetails, productsDatabase } = require('./productsDatabase');
const { TEMPLATES, fillTemplate } = require('./templates');

// Memory management and cleanup
const cleanup = require('./memory-cleanup');
const { AIServiceManager } = require('./ai-manager');
const { BatchLeadLogger } = require('./batch-logger');
const { perfMonitor } = require('./performance-monitor');

// Create AI manager with injected functions
const aiManager = new AIServiceManager(generateResponse, generateOllamaResponse, isOllamaAvailable);

// Create global batch logger instance
const batchLogger = new BatchLeadLogger(logLead);

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth_new' // Use a different session directory
    }),
    puppeteer: {
        headless: true,
        args: process.env.NODE_ENV === 'production' 
            ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: process.env.NODE_ENV === 'production' 
            ? require('@sparticuz/chromium').executablePath 
            : undefined,
        ignoreDefaultArgs: process.env.NODE_ENV === 'production' ? ['--disable-extensions'] : false
    }
});

// Store conversation history per customer (in-memory)
const conversationHistories = {};
const customerStatus = {}; // Track if customer was offered WhatsApp link

// Utility function to add messages with timestamps
function addMessage(phoneNumber, role, content) {
    if (!conversationHistories[phoneNumber]) {
        conversationHistories[phoneNumber] = [];
    }
    conversationHistories[phoneNumber].push({
        role: role,
        content: content,
        timestamp: Date.now()
    });

    // Keep only last 10 messages to prevent memory bloat
    if (conversationHistories[phoneNumber].length > 10) {
        conversationHistories[phoneNumber] = conversationHistories[phoneNumber].slice(-10);
    }
}

// Function to detect if customer is selecting a product (vs asking about products)
function isProductSelection(message, phoneNumber) {
    const messageLower = message.toLowerCase().trim();

    // Ultra-flexible product detection - catch any variation
    const productKeywords = [
        'l1', 'pro8', 'pro16', 'pro 8', 'pro 16', 'l1pro8', 'l1pro16',
        'soundbar', 'ultra soundbar', 'smart soundbar', 'barre', 'barre de son',
        'acoustimass', 'acoustimass3', 'acousti', 'cube', 'cubes', 'haut parleur', 'enceinte', 'enceintes',
        'caisson', 'subwoofer', 'flush', '700',
        'iza2120', 'iza', 'iza', 'isa', 'isa2120', 'iz', 'za250', 'bose music amplifier', 'bose amplifier',
        'dm2c', 'dm3', 'dm5', 'dm8c', 'fs2c', 'fs2se', '251'
    ];

    const hasAnyProductKeyword = productKeywords.some(keyword => messageLower.includes(keyword));

    if (!hasAnyProductKeyword) {
        console.log(`🔍 No product keywords found in "${message}"`);
        return false;
    }

    // If message is very short and contains product keywords, likely a selection
    const isShortMessage = messageLower.split(/\s+/).length <= 3;
    const likelySelection = isShortMessage && hasAnyProductKeyword;

    // Check for explicit selection keywords
    const selectionKeywords = /\b(je veux|je veux que|je prends|j'achète|je choisis|la |le |les |ce |cette |cet |du |de la |des |ça |ca |celle |celui|celui-ci|celle-ci|celle-là|celui-là|ça|ca|c'est|je prend|prends|choisis|veut|achète)\b/i;
    const hasSelectionKeyword = selectionKeywords.test(messageLower);

    // Additional check: if customer recently got recommendations, ANY product mention is likely selection
    const now = Date.now();
    const lastRecTime = lastRecommendationSent[phoneNumber] || 0;
    const recentRecommendation = (now - lastRecTime) < 600000; // Within last 10 minutes (increased from 5)
    const contextSuggestsSelection = recentRecommendation && hasAnyProductKeyword;

    const result = hasSelectionKeyword || likelySelection || contextSuggestsSelection;

    console.log(`🔍 Selection analysis for "${message}": hasKeywords=${hasAnyProductKeyword}, shortMsg=${isShortMessage}, selectionKeyword=${hasSelectionKeyword}, recentRec=${recentRecommendation}, LIKELY_SELECTION=${result}`);

    return result;
}

// Function to extract the selected product from customer's message
function extractSelectedProduct(message) {
    const messageLower = message.toLowerCase().replace(/[^\w\s]/g, '').trim(); // Remove punctuation

    // Smart pattern matching - handles spacing variations
    const patterns = [
        // L1 Pro series - very flexible matching
        { name: 'l1 pro 16', regex: /\bl1.*(?:pro.*)?1[6]|\bl1.*1[6].*pro|\bl116|\bl1pro16/i },
        { name: 'l1 pro 8', regex: /\bl1.*(?:pro.*)?8|\bl1.*8.*pro|\bl108|\bl1pro8/i },

        // Amplifiers
        { name: 'iza2120', regex: /\b(iza|isa|iz)\s?2120\b|\b(iza|isa|iz)2120\b/i },
        { name: 'za250', regex: /\bza250\b|\bza\s?250\b/i },
        { name: 'bose music amplifier', regex: /\bbose.*(music )?amplifier\b|\bamplifier.*bose\b/i },

        // Soundbars
        { name: 'smart ultra soundbar', regex: /\bultra.*soundbar|\bsoundbar.*ultra/i },
        { name: 'smart soundbar', regex: /\bsmart.*soundbar|\bsoundbar.*smart|\bbarre.*son/i },

        // Acoustimass - prioritize specific patterns
        { name: 'acoustimass 3', regex: /\bacoustimass.*3.*caisson|\bacoustimass3.*caisson|\bcaisson.*acoustimass.*3/i },
        { name: 'acoustimass', regex: /\bacoustimass.*series.*3.*haut|\bacoustimass.*cube|\bcube.*acoustimass|\bhaut.*parleur|\benceinte.*cube/i },
        { name: 'acoustimass', regex: /\bacoustimass|\bacousti|\bcube/i }, // fallback

        // Caissons
        { name: 'smart ultra caisson 700', regex: /\bultra.*caisson|\bcaisson.*ultra|\bsmart.*ultra.*caisson/i },
        { name: 'caisson de bass flush', regex: /\bcaisson.*flush|\bflush.*caisson/i }
    ];

    // Check patterns
    for (const pattern of patterns) {
        if (pattern.regex.test(messageLower)) {
            console.log(`🎯 SMART extraction: "${pattern.name}" from "${message}"`);
            return pattern.name;
        }
    }

    // Fallback: simple keyword matching
    const simpleMatches = {
        'l1 pro 16': /\bl116|\bl1pro16|\bl1.*16/i,
        'l1 pro 8': /\bl108|\bl1pro8|\bl1.*8/i,
        'iza2120': /\biza2120|\bisa2120|\biza\s?2120|\bisa\s?2120/i,
        'za250': /\bza250|\bza\s?250/i,
        'bose music amplifier': /\bbose.*amplifier/i,
        'smart soundbar': /\bsoundbar/i,
        'smart ultra caisson 700': /\bultra.*caisson|\bsmart.*ultra.*caisson/i,
        'acoustimass 3': /\bacoustimass3|\bcaisson.*acoustimass/i,
        'acoustimass': /\bacoustimass.*series|\bcube.*acoustimass|\bhaut.*parleur/i,
        'acoustimass': /\bacoustimass|\bcube/i, // final fallback
        'caisson de bass flush': /\bflush/i
    };

    for (const [product, regex] of Object.entries(simpleMatches)) {
        if (regex.test(messageLower)) {
            console.log(`🎯 SIMPLE extraction: "${product}" from "${message}"`);
            return product;
        }
    }

    console.log(`❌ No product extracted from: "${message}" (normalized: "${messageLower}")`);
    return null;
}

// Simple in-memory cache for product details
const productCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Cached product lookup function
function getCachedProductDetails(productName) {
    const now = Date.now();
    const cached = productCache.get(productName);

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }

    // Cache miss - get from database and cache it
    const details = getProductDetails(productName);
    if (details) {
        productCache.set(productName, {
            data: details,
            timestamp: now
        });
    }

    return details;
}

// Cached price lookup function
function getCachedProductPrice(productName) {
    const details = getCachedProductDetails(productName);
    return details ? {
        priceFr: details.priceFr || 'Sur devis',
        price: details.price || 'Sur devis'
    } : {
        priceFr: 'Sur devis',
        price: 'Sur devis'
    };
}
const currentProduct = {}; // Track which product is being discussed for each customer
const knownCustomers = {}; // Track which customers have been seen before
const openingQuestionAsked = {}; // Track if we've already asked the opening discovery question
const customerSegment = {}; // Track detected customer segment (residential/professional/portable)
const customerLanguage = {}; // Track detected customer language
const conversationStage = {}; // Track conversation stage for each customer
const messageCount = {}; // Track message count per customer to delay segment detection
const awaitingProductChoice = {}; // Track if we've asked "quel est votre besoin exact?" and waiting for answer
const lastRecommendationSent = {}; // Track timestamp of last recommendation to prevent repetition

// Initialize memory cleanup with global references
cleanup.initCleanup(
  conversationHistories,
  customerStatus,
  currentProduct,
  customerSegment,
  customerLanguage,
  conversationStage,
  messageCount,
  awaitingProductChoice,
  lastRecommendationSent
);

// Initialize CSV file for leads tracking
initializeCSV();

// Load existing customers from CSV into memory
const existingPhones = loadExistingCustomers();
existingPhones.forEach(phone => {
    knownCustomers[phone] = true;
});
if (existingPhones.length > 0) {
    console.log(`📊 Loaded ${existingPhones.length} existing customers from leads.csv`);
}

// Purchase intent keywords - More strict detection to avoid false positives
// Only match explicit buying signals, NOT questions like "et si je veux pour DJ?"
// STRONG intent only: confirmed selections, explicit commands
const PURCHASE_INTENT_KEYWORDS = /\b(je prends|je commande|j'achète|confirmer|valider|passer commande|commander|vamoooos|vamo|allons-y|allez|oui je veux|je veux acheter|je veux commander)\b/i;

// Purchase question keywords - what the bot asks before expecting "oui" or "c'est bon"
const PURCHASE_QUESTION_KEYWORDS = /\b(voulez-vous|vous voulez|veux-tu|commander|acheter|prêt|intéressé|ça vous intéresse|vous intéresse|passer commande|confirmer|confirme|confirmation|validation|on y va|y va|d'accord|valider|correct|c'est correct|ça vous va|ok|d'accord|vous reconnaître|reconnaissez-vous|vous plaît)\b/i;

// Goodbye keywords detection - ONLY explicit farewells, not declines
const GOODBYE_KEYWORDS = /\b(bye|à bientôt|au revoir|bonne soirée|bonne nuit|bonne journée|goodbye|à plus tard|à plus|tciao|tchao|c'est tout|adieu|salut final)\b/i;

// Rejection keywords - customer doesn't want the product anymore
const REJECTION_KEYWORDS = /\b(je ne la veux|je ne le veux|je veux plus|je ne veux plus|non je la veux|non je le veux|non merci|je refuse|annuler|annule|cancel|pas besoin|j'en veux pas|j'en veux plus|je n'ai pas besoin|trop cher|trop chère|pas interesse|pas intéressé|décidé|pas prendre)\b/i;

// Extract actual segment keyword from customer message (e.g., "dj", "restaurant", "maison")
function getSegmentKeywordFromMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Portable/DJ keywords
    const portableKeywords = ['dj', 'concert', 'fête', 'festival', 'mariage', 'soirée', 'live', 'musicien', 'événement', 'event', 'performance'];
    for (const kw of portableKeywords) {
        if (lowerMessage.includes(kw)) return 'DJ';
    }
    
    // Professional keywords
    const professionalKeywords = ['restaurant', 'hôtel', 'hotel', 'boutique', 'café', 'bureau', 'commercial', 'magasin', 'professionnel', 'entreprise', 'bar', 'disco'];
    for (const kw of professionalKeywords) {
        if (lowerMessage.includes(kw)) return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
    
    // Residential keywords
    const residentialKeywords = ['maison', 'home', 'salon', 'tv', 'cinéma', 'cinema', 'villa', 'appartement', 'domicile'];
    for (const kw of residentialKeywords) {
        if (lowerMessage.includes(kw)) return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
    
    return null; // No specific keyword found
}

/**
 * Check if message contains EXPLICIT purchase intent with context awareness
 * Only triggers on clear buying signals, not questions about products or location
 * @param {string} message - Customer's message
 * @param {array} history - Conversation history (bot messages with role and content)
 */
function hasPurchaseIntent(message, history = []) {
    // Strong purchase keywords always trigger (only explicit buying, not "je veux" alone)
    if (PURCHASE_INTENT_KEYWORDS.test(message)) {
        return true;
    }
    
    // "Oui" and "C'est bon" only trigger if bot's last message was SPECIFICALLY about purchasing
    // NOT about location, segmentation, or other context questions
    if (/\b(oui|c'est bon|c\'est bon)\b/i.test(message)) {
        // Check if this is a contextual answer (e.g., "Oui pour hotel" = answering location question)
        // If message contains context keywords like "pour hotel", "pour bureau", "pour dj", etc., 
        // then it's answering a location/use-case question, NOT confirming purchase
        const contextKeywords = /\b(pour|at|à|pour dj|pour hotel|pour office|pour bureau|pour résidentiel|pour professionnel|pour commercial)\b/i;
        if (contextKeywords.test(message)) {
            console.log('ℹ️ "Oui" detected but with context clarification (e.g., "Oui pour hotel") - NOT purchase intent');
            return false; // This is answering a context question, not confirming purchase
        }
        
        // Check if bot's last message was SPECIFICALLY asking for purchase confirmation
        if (history && history.length > 0) {
            // Find the last assistant message (go backwards from end)
            for (let i = history.length - 1; i >= 0; i--) {
                const msg = history[i];
                if (msg && msg.role === 'assistant' && msg.content) {
                    const botLastMsg = msg.content.toLowerCase();
                    
                    // Check if bot's message was about PURCHASING (not just mentioning purchase keywords)
                    // Must have keywords like "confirmer", "valider", "passer commande", "commander"
                    const purchaseConfirmKeywords = /\b(confirmer|valider|passer commande|commander|acheter|on y va|allons-y|procéder|confirme|confirmation)\b/i;
                    
                    // But NOT if it also has location/context keywords
                    const hasLocationKeywords = /\b(où|adresse|hotel|office|bureau|localisation|location|lieu|endroit|segment|professionnel|résidentiel|commercial|dj)\b/i.test(botLastMsg);
                    
                    if (purchaseConfirmKeywords.test(botLastMsg) && !hasLocationKeywords) {
                        console.log('✅ Purchase confirmed: "Oui" detected after purchase confirmation question');
                        return true;
                    }
                    break; // Only check the most recent assistant message
                }
            }
        }
    }
    
    return false;
}

/**
 * Check if customer is saying goodbye
 */
function isGoodbye(message) {
    return GOODBYE_KEYWORDS.test(message);
}

/**
 * Check if customer is rejecting/declining a product
 */
function isRejection(message) {
    return REJECTION_KEYWORDS.test(message);
}

/**
 * Check if customer is requesting photos
 * @param {string} message - Customer message
 * @returns {boolean} - True if requesting photos
 */
function isPhotoRequest(message) {
    const photoKeywords = ['photo', 'image', 'show', 'pictures', 'pic', 'visual', 'visuel', 'screenshot', 'capture', 'image du', 'photos du'];
    const lowerMessage = message.toLowerCase();
    return photoKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Extract product names mentioned in message
 * @param {string} message - Customer message
 * @returns {array} - Array of product names found
 */
function extractProductNamesFromMessage(message) {
    const productNames = Object.keys(productsDatabase);
    const lowerMessage = message.toLowerCase();
    const foundProducts = [];
    
    for (const productName of productNames) {
        // Check for product name in message (case-insensitive)
        if (lowerMessage.includes(productName.toLowerCase())) {
            if (!foundProducts.includes(productName)) {
                foundProducts.push(productName);
            }
        }
    }
    
    // Also check for generic terms like "ensemble", "set", "package"
    if (foundProducts.length === 0) {
        if (lowerMessage.includes('ensemble') || lowerMessage.includes('set') || lowerMessage.includes('package') || lowerMessage.includes('complet') || lowerMessage.includes('tout')) {
            // Map to default products based on segment (we can use a heuristic)
            if (customerSegment[phoneNumber] === 'professional') {
                foundProducts.push('DM2C'); // Default for professional
            } else if (customerSegment[phoneNumber] === 'portable') {
                foundProducts.push('L1 PRO 8');
            } else {
                foundProducts.push('Smart Soundbar'); // Default for residential
            }
        }
    }
    
    return foundProducts;
}

/**
 * Calculate total price for multiple products with proper quantity handling
 * @param {array} products - Array of product names OR array of {name: string, quantity: number}
 * @returns {object} - { total, breakdown, hasAllPrices }
 */
/**
 * Get price for a single product
 * @param {string} productName - Product name
 * @returns {object} {price, priceFr, hasPrice}
 */
function getProductPrice(productName) {
    const productDetails = getProductDetails(productName);
    
    if (!productDetails || !productDetails.priceFr) {
        console.log(`⚠️ No price found for ${productName}, will ask sales team`);
        return { price: null, priceFr: 'Sur devis', hasPrice: false, productName };
    }
    
    // Extract numeric price from string like "900 DH TTC" or "25800 DH TTC"
    const priceMatch = productDetails.priceFr.match(/(\d+[\s,]*\d*)/);
    if (priceMatch) {
        const priceStr = priceMatch[1].replace(/[\s,]/g, '');
        const price = parseInt(priceStr, 10);
        if (!isNaN(price)) {
            console.log(`✅ Price for ${productName}: ${price} DH TTC`);
            return { price, priceFr: `${price} DH TTC`, hasPrice: true, productName };
        }
    }
    
    console.log(`⚠️ Could not parse price for ${productName}: ${productDetails.priceFr}`);
    return { price: null, priceFr: 'Sur devis', hasPrice: false, productName };
}

/**
 * Extract product names with quantities from conversation history
 * Returns array of {name: string, quantity: number} objects
 */
function extractAllProductsFromHistory(history) {
    if (!history || history.length === 0) return [];
    
    // List of all Bose products we know about (with common variations)
    const allProducts = [
        'L1 PRO 8', 'L1 PRO 16',
        'Smart Soundbar', 'Smart Ultra Soundbar',
        'Acoustimass', 'Acoustimass 3', 'Smart Ultra Caisson 700', 'Caisson de Bass Flush',
        'Bose Music Amplifier', 'IZA2120', 'ZA250',
        'DM2C', 'DM3 Flush', 'DM5 Flush', 'DM8C',
        'FS2C', 'FS2SE', '251', '360P EC', 'Satellite Flush', 'Satellites'
    ];
    
    // Product name variations/abbreviations for better matching
    const productVariations = {
        'dmc': 'DM2C',
        'dm2c': 'DM2C',
        'dm3': 'DM3 Flush',
        'dm5': 'DM5 Flush',
        'dm8': 'DM8C',
        'fs2c': 'FS2C',
        'fs2se': 'FS2SE',
        'l1 pro 8': 'L1 PRO 8',
        'l1 pro8': 'L1 PRO 8',
        'l1pro8': 'L1 PRO 8',
        'l1 pro 16': 'L1 PRO 16',
        'l1 pro16': 'L1 PRO 16',
        'l1pro16': 'L1 PRO 16',
        '360p': '360P EC',
        '360': '360P EC',
        'satellite': 'Satellite Flush',
        'acoustimass': 'Acoustimass',
        'caisson': 'Smart Ultra Caisson 700',
        'soundbar': 'Smart Sound Bar',
        'amplifier': 'Bose Music Amplifier'
    };
    
    // Search through conversation history for product mentions (case-insensitive)
    const conversationText = history.map(msg => msg.content).join(' ').toLowerCase();
    const foundProducts = [];
    const productQuantities = {};
    
    // First check for product variations/abbreviations with quantities
    for (const [variation, productName] of Object.entries(productVariations)) {
        const regex = new RegExp(`(\\d+)\\s*(?:x|×|pieces?|pièces?|units?|unités?|pcs?)?\\s*${variation.toLowerCase()}|${variation.toLowerCase()}\\s*(?:x|×|pieces?|pièces?|units?|unités?|pcs?)?\\s*(\\d+)`, 'gi');
        const matches = conversationText.match(regex);
        
        if (matches) {
            for (const match of matches) {
                const quantityMatch = match.match(/(\d+)/);
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                
                if (!productQuantities[productName]) {
                    productQuantities[productName] = 0;
                    foundProducts.push(productName);
                }
                productQuantities[productName] += quantity;
            }
        } else if (conversationText.includes(variation.toLowerCase()) && !foundProducts.includes(productName)) {
            foundProducts.push(productName);
            productQuantities[productName] = 1;
        }
    }
    
    // Then check for exact product names with quantities
    for (const product of allProducts) {
        const regex = new RegExp(`(\\d+)\\s*(?:x|×|pieces?|pièces?|units?|unités?|pcs?)?\\s*${product.toLowerCase()}|${product.toLowerCase()}\\s*(?:x|×|pieces?|pièces?|units?|unités?|pcs?)?\\s*(\\d+)`, 'gi');
        const matches = conversationText.match(regex);
        
        if (matches) {
            for (const match of matches) {
                const quantityMatch = match.match(/(\d+)/);
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                
                if (!productQuantities[product]) {
                    productQuantities[product] = 0;
                    foundProducts.push(product);
                }
                productQuantities[product] += quantity;
            }
        } else if (conversationText.includes(product.toLowerCase()) && !foundProducts.includes(product)) {
            foundProducts.push(product);
            productQuantities[product] = 1;
        }
    }
    
    // Return products with their quantities
    return foundProducts.map(name => ({
        name,
        quantity: productQuantities[name] || 1
    }));
}

/**
 * Extract products from ONLY the current/last customer message
 * This prevents old quantities from previous messages interfering with current intent
 * @param {string} message - The current customer message
 * @returns {array} Products with quantities from this message only [{name, quantity}]
 */
function extractProductsFromCurrentMessage(message) {
    if (!message) return [];
    
    const allProducts = [
        'L1 PRO 8', 'L1 PRO 16',
        'Smart Soundbar', 'Smart Ultra Soundbar',
        'Acoustimass', 'Acoustimass 3', 'Smart Ultra Caisson 700', 'Caisson de Bass Flush',
        'Bose Music Amplifier', 'IZA2120', 'ZA250',
        'DM2C', 'DM3 Flush', 'DM5 Flush', 'DM8C',
        'FS2C', 'FS2SE', '251', '360P EC', 'Satellite Flush', 'Satellites'
    ];
    
    const productVariations = {
        'pro8': 'L1 PRO 8',
        'l1 pro 8': 'L1 PRO 8',
        'l1pro8': 'L1 PRO 8',
        'l1 pro 16': 'L1 PRO 16',
        'soundbar': 'Smart Soundbar',
        'iza2120': 'IZA2120',
        'iza': 'IZA2120',
        'dmc': 'DM2C',
        'dm2c': 'DM2C'
    };
    
    const messageLower = message.toLowerCase();
    const foundProducts = [];
    const productQuantities = {};
    
    // Check for variations (e.g., "pro8" -> "L1 PRO 8")
    for (const [variation, productName] of Object.entries(productVariations)) {
        if (messageLower.includes(variation)) {
            // Look for quantity in current message (e.g., "3 pro8" or "pro8 x2")
            const regex = new RegExp(`(\\d+)\\s*(?:x|×|pieces?|pièces?|units?|unités?)?\\s*${variation}|${variation}\\s*(?:x|×|pieces?|pièces?|units?|unités?)?\\s*(\\d+)`, 'gi');
            const matches = messageLower.match(regex);
            
            let quantity = 1;
            if (matches && matches.length > 0) {
                const quantityMatch = matches[0].match(/(\d+)/);
                quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
            }
            
            if (!productQuantities[productName]) {
                foundProducts.push(productName);
                productQuantities[productName] = quantity;
            }
        }
    }
    
    // Return products found in THIS message only
    return foundProducts.map(name => ({
        name,
        quantity: productQuantities[name] || 1
    }));
}

/**
 * Extract product name from conversation history (as fallback)
 * Searches for known Bose product names in the conversation
 * Returns {name: string, quantity: number} or null
 */
function extractProductFromHistory(history) {
    const allProducts = extractAllProductsFromHistory(history);
    return allProducts.length > 0 ? allProducts[0] : null;
}

// Generate QR code for authentication
client.on('qr', (qr) => {
    console.log('\n📱 WHATSAPP BOT');
    console.log('🔗 QR Code:');

    try {
        // Generate minimal QR code for small windows
        qrcode.generate(qr, {
            small: true,
            quietZone: 0,
            errorCorrectionLevel: 'M'
        });

        // Also save as PNG file for easy viewing
        const fs = require('fs');
        const path = require('path');
        const qrPath = path.join(__dirname, 'qr-code.png');

        // Use qrcode library to generate PNG
        const QRCode = require('qrcode');
        QRCode.toFile(qrPath, qr, {
            width: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, (err) => {
            if (!err) {
                console.log(`💾 QR saved as: ${qrPath}`);
                console.log('🖼️  Open qr-code.png to scan');
            }
        });

    } catch (error) {
        console.log('❌ Use WhatsApp Web:');
        console.log('🌐 web.whatsapp.com');
    }

    console.log('✅ Scan to start bot!');
});

// Client ready
client.on('ready', async () => {
    console.log('✅ Media Prestige WhatsApp Bot is ready!');
    console.log('📱 Bot is now listening for messages...');
    console.log('📊 All leads are being tracked in leads.csv');
    
    // Print leads summary every 5 minutes
    setInterval(() => {
        printLeads();
    }, 5 * 60 * 1000);
    
    // Check API health every 30 minutes
    setInterval(async () => {
        try {
            const { getAPIHealth } = require('./apiManager');
            const health = await getAPIHealth();
            console.log('\n🔍 API HEALTH CHECK:');
            console.log(JSON.stringify(health, null, 2));
        } catch (error) {
            console.error('Health check error:', error.message);
        }
    }, 30 * 60 * 1000);
});

// Handle incoming messages
client.on('message', async (message) => {
    // Start performance monitoring
    const perfTracker = perfMonitor.startMessage(message.from);

    try {
        // Ignore messages from status updates and groups
        if (message.from === 'status@broadcast' || message.isGroupMsg) {
            return;
        }

        // Get customer message
        let customerMessage = message.body.trim();
        
        // CHECK FOR VOICE MESSAGE (ptt - push to talk) - Check before empty message check
        const hasVoice = message.type === 'ptt' || message.type === 'audio' || (message.hasMedia && message.mimetype && message.mimetype.includes('audio'));
        
        // Skip empty text messages BUT NOT voice messages
        if (!customerMessage && !hasVoice) {
            return;
        }

        // Get actual phone number from contact
        let phoneNumber = message.from;
        let displayPhone = message.from;
        
        try {
            const contact = await message.getContact();
            if (contact && contact.number) {
                // Get formatted phone number from contact (ensure consistent format)
                phoneNumber = '+' + contact.number.replace(/\D/g, '');
                displayPhone = phoneNumber;
            }
        } catch (contactError) {
            // Normalize fallback phone number to consistent format
            phoneNumber = message.from.startsWith('+') ? message.from : '+' + message.from.replace(/\D/g, '');
            displayPhone = phoneNumber;
        }

        console.log(`📩 New message from ${displayPhone}: ${customerMessage || '(voice)'}`);
        console.log(`   Message type: ${message.type}, hasMedia: ${message.hasMedia}, mimetype: ${message.mimetype}`);

        if (hasVoice) {
            console.log('🎤 VOICE MESSAGE DETECTED!');
            
            // Initialize customer if new
            if (!knownCustomers[phoneNumber]) {
                console.log('🆕 NEW CUSTOMER via voice! Initializing...');
                knownCustomers[phoneNumber] = true;
                conversationHistories[phoneNumber] = [];
                customerStatus[phoneNumber] = 'new';
                currentProduct[phoneNumber] = null;
                openingQuestionAsked[phoneNumber] = false;
                awaitingProductChoice[phoneNumber] = false;
                customerSegment[phoneNumber] = null;
                customerLanguage[phoneNumber] = detectLanguage('');
                conversationStage[phoneNumber] = 'initial';
                lastRecommendationSent[phoneNumber] = null;
            }
            
            try {
                // Download the audio
                const media = await message.downloadMedia();
                
                if (!media || !media.data) {
                    console.log('⚠️ Could not download voice message');
                    // Send text fallback
                    await message.reply('Désolé, je n\'arrive pas à traiter les messages vocaux. Pouvez-vous me écrire votre message? 😊');
                    return;
                }
                
                // Convert base64 to buffer
                const audioBuffer = Buffer.from(media.data, 'base64');
                console.log(`📎 Audio size: ${audioBuffer.length} bytes`);
                
                // Detect language based on customer history or default to French
                const detectedLang = customerLanguage[phoneNumber] || 'french';
                
                // Map detected language to TTS language (Arabic uses Arabic TTS, French uses English)
                let ttsLang = 'english';
                if (detectedLang === 'arabic' || detectedLang === 'darija') {
                    ttsLang = 'arabic';
                }
                
                // Process: STT -> AI -> TTS
                const { isGroqAvailable } = require('./groq');
                
                // Step 1: Speech to Text
                console.log('🔄 Step 1: Converting speech to text...');
                const transcribedText = await speechToText(audioBuffer);
                
                if (!transcribedText) {
                    await message.reply('Désolé, je n\'arrive pas à comprendre ce message vocal. Pouvez-vous me l\'écrire? 🙏');
                    return;
                }
                
                console.log(`📝 Transcribed: "${transcribedText}"`);
                
                // Update language detection from transcribed text
                customerLanguage[phoneNumber] = detectLanguage(transcribedText);
                console.log(`📊 Language detected from voice: ${customerLanguage[phoneNumber]}`);
                
                // Convert voice to text and let normal bot flow handle it
                // This ensures voice messages go through same logic as text (welcome, products, FAQ, etc.)
                customerMessage = transcribedText;
                
                // Continue to normal message processing (don't return early)
            } catch (voiceError) {
                console.error('❌ Voice processing error:', voiceError.message);
                await message.reply('Désolé, une erreur s\'est produite. Pouvez-vous écrire votre message? 🙏');
                return;
            }
        }

        // CHECK IF CUSTOMER IS SAYING GOODBYE FIRST (before anything else)
        if (isGoodbye(customerMessage)) {
            console.log('👋 GOODBYE DETECTED! Customer ending conversation.');
            
            const goodbyeMessage = TEMPLATES.GOODBYE;
            
            await message.reply(goodbyeMessage);
            console.log(`📤 Goodbye message sent`);
            
            // Clear conversation history for fresh start next time if they return
            if (knownCustomers[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
                openingQuestionAsked[phoneNumber] = false;
                awaitingProductChoice[phoneNumber] = false;
            }
            
            return; // Exit early - no further processing for goodbye
        }

        // CHECK IF CUSTOMER IS REJECTING/DECLINING A PRODUCT
        if (isRejection(customerMessage)) {
            console.log('❌ REJECTION DETECTED! Customer declining product.');
            
            // Clear the current product since they don't want it anymore
            currentProduct[phoneNumber] = null;
            customerStatus[phoneNumber] = 'interested';
            
            // Send helpful response
            const rejectionResponse = `Aucun problème ! 😊
            
Si vous avez besoin d'autre chose ou si vous voulez voir d'autres produits, je suis là !

Avez-vous besoin d'aide avec autre chose?`;
            
            await message.reply(rejectionResponse);
            console.log(`📤 Rejection handled - offered alternatives`);
            
            // Add to conversation history (ensure it exists first)
            if (!conversationHistories[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
            }
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: rejectionResponse
            });
            
            // Log the rejection
            batchLogger.add(phoneNumber, 'interested', customerMessage, 'Product rejected - offered alternatives');
            
            return; // Exit early - no further processing for rejection
        }

        // CHECK FOR ADDRESS/LOCATION QUESTIONS FIRST - before photo request
        const addressKeywordsEarly = /\b(adresse|address|office|bureau|localisation|location|where|où|quelle est votre|où est|localité|lieu|endroit|visite|showroom)\b/i;
        if (addressKeywordsEarly.test(customerMessage)) {
            console.log('📍 ADDRESS/LOCATION QUESTION DETECTED!');
            
            // FRENCH ONLY - provide office info
            const contactMessage = TEMPLATES.CONTACT;
            
            await message.reply(contactMessage);
            console.log(`📤 Contact information sent`);
            
            // Add to conversation history
            if (!conversationHistories[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
            }
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: contactMessage
            });
            
            return; // Exit after providing contact info
        }

        // CHECK IF CUSTOMER IS REQUESTING PHOTOS
        if (isPhotoRequest(customerMessage)) {
            console.log('📸 PHOTO REQUEST DETECTED!');
            
            try {
                // Extract product names mentioned in the message
                const mentionedProducts = extractProductNamesFromMessage(customerMessage);
                
                if (mentionedProducts.length > 0) {
                    console.log(`📸 Sending photos for products: ${mentionedProducts.join(', ')}`);
                    
                    // Send image for each product
                    for (const productName of mentionedProducts) {
                        try {
                            const product = getProductDetails(productName);
                            if (product && product.image) {
                                const fs = require('fs');
                                if (fs.existsSync(product.image)) {
                                    const media = MessageMedia.fromFilePath(product.image);
                                    await message.reply(media);
                                    console.log(`✅ Sent image for ${productName}`);
                                    // Delay between multiple image sends
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                } else {
                                    console.warn(`⚠️ Image file not found: ${product.image}`);
                                }
                            }
                        } catch (imgError) {
                            console.warn(`⚠️ Error sending image for ${productName}: ${imgError.message}`);
                        }
                    }
                    
                    // Send follow-up message
                    const followUp = detectLanguage(customerMessage) === 'fr'
                        ? `Voici les photos des produits! 📸\n\nPour plus d'informations ou passer commande, contactez notre équipe ventes!`
                        : `Here are the product photos! 📸\n\nFor more information or to place an order, contact our sales team!`;
                    
                    await message.reply(followUp);
                    console.log(`💬 Sent photo response`);
                } else {
                    // No specific products mentioned - send generic response
                    const response = detectLanguage(customerMessage) === 'fr'
                        ? `Quel produit aimeriez-vous voir? (Smart Soundbar, Acoustimass, DM3, etc.)`
                        : `Which product would you like to see? (Smart Soundbar, Acoustimass, DM3, etc.)`;
                    
                    await message.reply(response);
                    console.log(`💬 Asked for product clarification`);
                }
                
                // Log interaction
                batchLogger.add(phoneNumber, 'viewed_photos', customerMessage);
                
                // Short delay before continuing to normal processing (optional)
                console.log(`ℹ️ Photo request processed, continuing normal message flow...`);
                
            } catch (photoError) {
                console.error('❌ Error handling photo request:', photoError);
                const errorMsg = detectLanguage(customerMessage) === 'fr'
                    ? `Désolé, une erreur s'est produite lors de l'envoi des photos.`
                    : `Sorry, an error occurred while sending the photos.`;
                await message.reply(errorMsg);
            }
            
            // Don't return - continue with normal processing to provide additional info
        }

        // CHECK IF NEW CUSTOMER - Start fresh conversation
        if (!knownCustomers[phoneNumber]) {
            console.log('🆕 NEW CUSTOMER DETECTED! Starting fresh conversation...');
            knownCustomers[phoneNumber] = true;
            // Clear any old conversation history for this phone
            conversationHistories[phoneNumber] = [];
            customerStatus[phoneNumber] = 'new';
            currentProduct[phoneNumber] = null;
            openingQuestionAsked[phoneNumber] = false;
                awaitingProductChoice[phoneNumber] = false;
            
            // DON'T detect segment yet - need more context from customer
            customerSegment[phoneNumber] = null;
            customerLanguage[phoneNumber] = detectLanguage(customerMessage);
            conversationStage[phoneNumber] = 'initial';
            lastRecommendationSent[phoneNumber] = null; // Clear any old recommendation timestamps

            console.log(`📊 Language: ${customerLanguage[phoneNumber]} | Waiting for customer context...`);;
            
            // CHECK FOR ADDRESS/LOCATION QUESTIONS FIRST - before greeting
            const addressKeywords = /\b(adresse|address|office|bureau|localisation|location|where|où|quelle est votre|où est|localité|lieu|endroit|visite|showroom)\b/i;
            if (addressKeywords.test(customerMessage)) {
                console.log('📍 ADDRESS/LOCATION QUESTION DETECTED! (New customer)');
                
                // FRENCH ONLY - provide office info
                const contactMessage = TEMPLATES.CONTACT;
                
                await message.reply(contactMessage);
                console.log(`📤 Contact information sent`);
                
                // Add to conversation history
                conversationHistories[phoneNumber].push({
                    role: 'customer',
                    content: customerMessage
                });
                conversationHistories[phoneNumber].push({
                    role: 'assistant',
                    content: contactMessage
                });
                
                // Mark that opening question has been asked for this new customer
                openingQuestionAsked[phoneNumber] = true;
                
                // Log the interaction
                batchLogger.add(phoneNumber, 'interested', customerMessage, 'Asking for office/email contact');
                return; // Exit - wait for customer's preference
            }
            
            // SEND INITIAL GREETING WITH QUALIFICATION QUESTION (NO RECOMMENDATION YET)
            // FRENCH ONLY - ALL MESSAGES IN FRENCH
            const greetingMessage = TEMPLATES.GREETING;
            
                    // Send logo with welcome message in single message
                    const logoPath = path.join(__dirname, 'public', 'logo.webp');
                    if (fs.existsSync(logoPath)) {
                        const logoMedia = MessageMedia.fromFilePath(logoPath);
                        const logoCaption = greetingMessage;
                        await client.sendMessage(message.from, logoMedia, { caption: logoCaption });
                        console.log('📸 Logo + welcome message sent to new customer');
            } else {
                await message.reply(greetingMessage);
                console.log(`📤 Greeting with qualification question sent`);
            }
            
            // Add to conversation history
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: greetingMessage
            });
            
            // Mark that opening question has been asked for this new customer
            openingQuestionAsked[phoneNumber] = true;
            
            return; // Exit - waiting for customer to provide context
        } else {
            // KNOWN CUSTOMER - Set status if not already set
            if (!customerStatus[phoneNumber]) {
                customerStatus[phoneNumber] = 'interested';
                console.log(`🔄 RETURNING CUSTOMER - Status set to: interested`);
            }
            
            // ========== CHECK FAQ FIRST FOR RETURNING CUSTOMERS ==========
            // FAQ questions should be answered immediately, not with welcome message
            const language = customerLanguage[phoneNumber] || detectLanguage(customerMessage);
            const faqAnswer = checkFAQ(customerMessage, language);
            
            if (faqAnswer) {
                console.log('ℹ️ FAQ QUESTION DETECTED (Returning customer) - Responding with knowledge base answer');
                await message.reply(faqAnswer);
                console.log(`📤 FAQ Reply sent`);
                
                // Add to conversation history
                if (!conversationHistories[phoneNumber]) {
                    conversationHistories[phoneNumber] = [];
                }
                conversationHistories[phoneNumber].push({
                    role: 'customer',
                    content: customerMessage
                });
                conversationHistories[phoneNumber].push({
                    role: 'assistant',
                    content: faqAnswer
                });
                
                // Log the interaction
                batchLogger.add(phoneNumber, 'interested', customerMessage, 'FAQ answered');
                return; // Exit - FAQ answered
            }
            
            // SEND WELCOME MESSAGE TO RETURNING CUSTOMERS (but NOT confirmed ones)
            // Confirmed customers asking questions should get direct answers, not welcome messages
            if (!openingQuestionAsked[phoneNumber] && customerStatus[phoneNumber] !== 'confirmed') {
                console.log('🔄 RETURNING CUSTOMER - Sending welcome message...');
                
                // Initialize conversation history if not already done
                if (!conversationHistories[phoneNumber]) {
                    conversationHistories[phoneNumber] = [];
                }
                
                // CHECK FOR ADDRESS/LOCATION QUESTIONS FIRST - before welcome message
                const addressKeywords = /\b(adresse|address|office|bureau|localisation|location|where|où|quelle est votre|où est|localité|lieu|endroit|visite|showroom)\b/i;
                if (addressKeywords.test(customerMessage)) {
                    console.log('📍 ADDRESS/LOCATION QUESTION DETECTED! (Returning customer)');
                    
                    // FRENCH ONLY - provide office info
                    const contactMessage = TEMPLATES.CONTACT;
                    
                    await message.reply(contactMessage);
                    console.log(`📤 Contact information sent`);
                    
                    // Add to conversation history
                    conversationHistories[phoneNumber].push({
                        role: 'customer',
                        content: customerMessage
                    });
                    conversationHistories[phoneNumber].push({
                        role: 'assistant',
                        content: contactMessage
                    });
                    
                    // Log the interaction
                    batchLogger.add(phoneNumber, 'interested', customerMessage, 'Asking for office/email contact');
                    return; // Exit - wait for customer's preference
                }
                
                // CHECK IF CUSTOMER IS ASKING FOR A SPECIFIC PRODUCT - show it immediately
                const productKeywords = /\b(subwoofer|caisson|bass|soundbar|barre|l1|l2|l3|dm|fs|251|360|satellite|amplifier|ampli|enceinte|speaker|haut.?parleur|cube|cubes)\b/i;
                // CHECK IF CUSTOMER IS ASKING FOR A SEGMENT (e.g., restaurant, hotel, dj, etc.)
                const segmentKeywords = /\b(restaurant|hôtel|hotel|boutique|café|bureau|commercial|magasin|professionnel|entreprise|bar|disco|maison|home|salon|tv|cinema|villa|événement|dj|concert|fête|festival|mariage|soirée|live)\b/i;
                if (productKeywords.test(customerMessage) || segmentKeywords.test(customerMessage)) {
                    console.log('🎵 PRODUCT REQUEST DETECTED! (Returning customer)');
                    
                    // Detect segment from the message
                    const detectedSegment = detectSegment(customerMessage);
                    if (detectedSegment) {
                        customerSegment[phoneNumber] = detectedSegment;
                        console.log(`📊 SEGMENT DETECTED: ${detectedSegment}`);
                    }
                    
                    // Get product recommendation based on segment
                    const segmentRec = getSegmentRecommendation(customerSegment[phoneNumber] || 'residential');
                    
                    // Send welcome message first
                    const greetingMessage = TEMPLATES.GREETING;
                    
                    // Send logo with welcome message in single message
                    const logoPath = path.join(__dirname, 'public', 'logo.webp');
                    if (fs.existsSync(logoPath)) {
                        const logoMedia = MessageMedia.fromFilePath(logoPath);
                        const logoCaption = greetingMessage;
                        await client.sendMessage(message.from, logoMedia, { caption: logoCaption });
                        console.log('📸 Logo + welcome message sent to returning customer');
                    } else {
                        await message.reply(greetingMessage);
                        console.log(`📤 Welcome message sent to returning customer`);
                    }
                    
                    // Then send product recommendation - FILTER to show ONLY the requested product type
let segmentName = getSegmentKeywordFromMessage(customerMessage) || (customerSegment[phoneNumber] === 'residential' ? 'résidentielle' : customerSegment[phoneNumber] === 'professional' ? 'professionnelle' : customerSegment[phoneNumber] === 'portable' ? 'DJ' : (segmentRec.segment === 'residential' ? 'résidentielle' : segmentRec.segment === 'professional' ? 'professionnelle' : 'DJ'));
                    const productDescription = `• ${segmentRec.features}\n• Idéal pour: ${segmentRec.useCase}`;

                    // Filter products to show ONLY the requested type (e.g., only subwoofers if "subwoofer" is mentioned)
                    let filteredProducts = segmentRec.allProducts;
                    const messageLower = customerMessage.toLowerCase();
                    
                    if (messageLower.includes('subwoofer') || messageLower.includes('caisson') || messageLower.includes('bass')) {
                        // Show subwoofer products (for "caisson", "bass", "subwoofer" queries)
                        filteredProducts = segmentRec.allProducts.filter(p => 
                            p.name.toLowerCase().includes('caisson') || 
                            p.name.toLowerCase().includes('bass') || 
                            p.name.toLowerCase().includes('subwoofer') ||
                            p.name === 'Acoustimass 3'
                        );
                        console.log(`🔊 Filtered to subwoofer products only: ${filteredProducts.map(p => p.name).join(', ')}`);
                    } else if (messageLower.includes('cube') || messageLower.includes('cubes')) {
                        // Show ONLY Acoustimass 3 when specifically asking for cubes
                        filteredProducts = segmentRec.allProducts.filter(p => p.name === 'Acoustimass 3');
                        console.log(`🔊 Filtered to cubes only: ${filteredProducts.map(p => p.name).join(', ')}`);
                    } else if (messageLower.includes('soundbar') || messageLower.includes('barre')) {
                        // Show ONLY soundbar products
                        filteredProducts = segmentRec.allProducts.filter(p => 
                            p.name.toLowerCase().includes('soundbar') || 
                            p.name.toLowerCase().includes('barre')
                        );
                        console.log(`🔊 Filtered to soundbar products only: ${filteredProducts.map(p => p.name).join(', ')}`);
                    } else if (messageLower.includes('l1') || messageLower.includes('l2') || messageLower.includes('l3')) {
                        // Show ONLY L1/L2/L3 products
                        filteredProducts = segmentRec.allProducts.filter(p => 
                            p.name.toLowerCase().includes('l1') || 
                            p.name.toLowerCase().includes('l2') || 
                            p.name.toLowerCase().includes('l3')
                        );
                        console.log(`🔊 Filtered to L1/L2/L3 products only: ${filteredProducts.map(p => p.name).join(', ')}`);
                    }
                    
                    // Use filtered products for display
                    const availableProducts = filteredProducts.map(p => p.name).join(' ou ');
                    const recommendationMessage = `Parfait! Pour ${segmentName}, voici nos solutions:\n\n🎵 ${availableProducts}\n\n${productDescription}\n\nQuel est votre besoin exact? 😊`;
                    
                    await message.reply(recommendationMessage);
                    console.log(`📤 Segment options sent: ${filteredProducts.map(p => p.name).join(', ')}`);
                    
                    // Mark that we're waiting for product choice - don't re-trigger segment detection on next message
                    awaitingProductChoice[phoneNumber] = true;
                    
                    // Send images for FILTERED products only
                    try {
                        const { MessageMedia } = require('whatsapp-web.js');
                        const fs = require('fs');
                        
                        for (const product of filteredProducts) {
                            if (product.image && fs.existsSync(product.image)) {
                                console.log(`📸 Sending image for: ${product.name}`);
                                const media = MessageMedia.fromFilePath(product.image);
                                const captionFr = `🎵 ${product.name}\n\n${product.details ? product.details.descriptionFr : ''}`;
                                await client.sendMessage(message.from, media, { caption: captionFr });
                                console.log(`✅ Image sent: ${product.name}`);
                            }
                        }
                    } catch (imageError) {
                        console.warn(`⚠️ Error sending product images: ${imageError.message}`);
                    }
                    
                    // Mark that we've asked the opening question
                    openingQuestionAsked[phoneNumber] = true;
                    
                    // Add to conversation history
                    conversationHistories[phoneNumber].push({
                        role: 'customer',
                        content: customerMessage
                    });
                    conversationHistories[phoneNumber].push({
                        role: 'assistant',
                        content: greetingMessage + '\n\n' + recommendationMessage
                    });
                    
                    // Log lead with detected segment
                    batchLogger.add(phoneNumber, 'interested', customerMessage, `Segment: ${customerSegment[phoneNumber]} | Options: ${filteredProducts.map(p => p.name).join(', ')}`);
                    
                    return; // Exit - product shown
                }
                
                const greetingMessage = TEMPLATES.GREETING;
                
                // Send logo with welcome message in single message
                const logoPath = path.join(__dirname, 'public', 'logo.webp');
                if (fs.existsSync(logoPath)) {
                    const logoMedia = MessageMedia.fromFilePath(logoPath);
                    const logoCaption = greetingMessage;
                    await client.sendMessage(message.from, logoMedia, { caption: logoCaption });
                    console.log('📸 Logo + welcome message sent to returning customer');
                } else {
                    await message.reply(greetingMessage);
                    console.log(`📤 Welcome message sent to returning customer`);
                }
                
                // Mark that we've asked the opening question
                openingQuestionAsked[phoneNumber] = true;
                
                // Add to conversation history
                conversationHistories[phoneNumber].push({
                    role: 'customer',
                    content: customerMessage
                });
                conversationHistories[phoneNumber].push({
                    role: 'assistant',
                    content: greetingMessage
                });
                
                return; // Exit - waiting for customer to provide context
            }
            
            // If we reach here, it's a returning customer who has already seen the welcome message
            // but is sending a new message - check if they're asking for address/location first
            const addressKeywords2 = /\b(adresse|address|office|bureau|localisation|location|where|où|quelle est votre|où est|localité|lieu|endroit|visite|showroom)\b/i;
            if (addressKeywords2.test(customerMessage)) {
                console.log('📍 ADDRESS/LOCATION QUESTION DETECTED! (Returning customer - welcome already shown)');
                
                const contactMessage = TEMPLATES.CONTACT;
                
                await message.reply(contactMessage);
                console.log(`📤 Contact information sent`);
                
                // Add to conversation history
                conversationHistories[phoneNumber].push({
                    role: 'customer',
                    content: customerMessage
                });
                conversationHistories[phoneNumber].push({
                    role: 'assistant',
                    content: contactMessage
                });
                
                // Log the interaction
                batchLogger.add(phoneNumber, 'interested', customerMessage, 'Asking for office/email contact');
                return; // Exit - wait for customer's preference
            }
            
            // Check if they're asking for a product or segment
            const productKeywords2 = /\b(subwoofer|caisson|bass|soundbar|barre|l1|l2|l3|dm|fs|251|360|satellite|amplifier|ampli|enceinte|speaker|haut.?parleur|cube|cubes|ensemble|complet|set|package|dm|demo|démonstration|test|essai)\b/i;
            const segmentKeywords2 = /\b(restaurant|hôtel|hotel|boutique|café|bureau|commercial|magasin|professionnel|entreprise|bar|disco|maison|home|salon|tv|cinema|villa|événement|dj|concert|fête|festival|mariage|soirée|live)\b/i;

            // If we're waiting for product choice, don't re-trigger segment detection - treat as product selection instead
            if (awaitingProductChoice[phoneNumber]) {
                console.log('📝 Customer responding to "quel est votre besoin exact?" - processing as product choice');
                awaitingProductChoice[phoneNumber] = false; // Clear the flag

                // Extract products from customer's message
                const productNames = extractProductNamesFromMessage(customerMessage);
                if (productNames.length > 0) {
                    currentProduct[phoneNumber] = productNames[0];
                    console.log(`🎯 Product selected: ${productNames[0]}`);

                    // Send confirmation with product details and next steps
                    const productDetails = getProductDetails(productNames[0]);
                    const confirmMsg = `✅ Parfait! ${productNames[0]}\n\n${productDetails ? productDetails.descriptionFr : ''}\n\n💰 Prix: ${productDetails ? productDetails.priceFr : 'Sur devis'}\n\nVoulez-vous:\n• Passer commande maintenant?\n• Demander un devis?\n• Voir plus de photos? 😊`;

                    await message.reply(confirmMsg);
                    console.log(`📤 Product confirmation sent`);

                    // Log and exit
                    batchLogger.add(phoneNumber, 'interested', customerMessage, `Selected product: ${productNames[0]}`);
                    return;
                }

                // If no product found in message, ask for clarification but don't repeat segment question
                await message.reply(`Je n'ai pas bien compris. Voulez-vous un des produits mentionnés ci-dessus? Précisez lequel (DM2C, DM3, etc.) ou dites "autre chose" si vous avez besoin de quelque chose de différent. 😊`);
                return;
            }
            
            // PRIORITY 1: Check if customer is SELECTING a product (handle before inquiries)
            if (isProductSelection(customerMessage, phoneNumber)) {
                console.log('🎯 PRODUCT SELECTION DETECTED! Customer is choosing a product');

                // Extract selected product
                const selectedProduct = extractSelectedProduct(customerMessage);
                if (selectedProduct) {
                    currentProduct[phoneNumber] = selectedProduct;
                    console.log(`✅ Product selected: ${selectedProduct}`);

                    // Get product details
                    const productDetails = getCachedProductDetails(selectedProduct);
                    const price = getCachedProductPrice(selectedProduct);

                    // Send product image if available
                    if (productDetails && productDetails.image) {
                        try {
                            const fs = require('fs');
                            if (fs.existsSync(productDetails.image)) {
                                console.log(`📸 Sending product image: ${selectedProduct}`);
                                const media = MessageMedia.fromFilePath(productDetails.image);
                                const captionFr = `🎵 **${productDetails ? productDetails.nameFr : selectedProduct}**\n\n${productDetails ? productDetails.descriptionFr : 'Produit audio premium'}\n\n💰 Prix: ${price.priceFr}`;
                                await client.sendMessage(message.from, media, { caption: captionFr });
                                console.log(`✅ Product image sent: ${selectedProduct}`);
                            }
                        } catch (imageError) {
                            console.warn(`⚠️ Error sending product image: ${imageError.message}`);
                        }
                    }

                    // Send informative response about the selected product
                    const infoMsg = `🎵 **${productDetails ? productDetails.nameFr : selectedProduct}**\n\n${productDetails ? productDetails.descriptionFr : 'Produit audio premium'}\n\n💰 Prix: ${price.priceFr}\n\nIntéressé ? Je peux vous donner plus de détails, vous montrer des photos, ou vous aider à commander ! 😊`;

                    await message.reply(infoMsg);
                    console.log(`📤 Product information sent: ${selectedProduct}`);

                    // Mark as confirmed and send checkout link
                    confirmLead(phoneNumber, selectedProduct);
                    customerStatus[phoneNumber] = 'confirmed';

                    batchLogger.add(phoneNumber, 'confirmed', customerMessage, `Selected product: ${selectedProduct}`);
                    return;
                }
            }

            // PRIORITY 2: Handle general product inquiries (not selections)
            if (productKeywords2.test(customerMessage) || segmentKeywords2.test(customerMessage)) {
                console.log('🎵 PRODUCT/SEGMENT INQUIRY DETECTED! (Returning customer - asking about products)');

                // Check if we recently sent a recommendation (within last 30 seconds) to prevent repetition
                const now = Date.now();
                const lastRecTime = lastRecommendationSent[phoneNumber] || 0;
                const timeSinceLastRec = now - lastRecTime;

                if (timeSinceLastRec < 30000) { // 30 seconds
                    console.log('⏳ Recent recommendation sent, avoiding repetition');
                    // Send a brief response acknowledging the request without repeating the full recommendation
                    const briefResponse = `Je t'ai déjà envoyé les options ci-dessus. Quel produit t'intéresse le plus ? Ou veux-tu voir d'autres options ? 😊`;
                    await message.reply(briefResponse);
                    batchLogger.add(phoneNumber, 'interested', customerMessage, 'Avoided recommendation repetition');
                    return;
                }

                // Clear awaiting flag if customer is asking for new segment
                awaitingProductChoice[phoneNumber] = false;

                // Detect segment from the message
                const detectedSegment = detectSegment(customerMessage);
                if (detectedSegment) {
                    customerSegment[phoneNumber] = detectedSegment;
                    console.log(`📊 SEGMENT DETECTED: ${detectedSegment}`);
                }
                
                // Get product recommendation based on segment
                const segmentRec = getSegmentRecommendation(customerSegment[phoneNumber] || 'residential');
                
                // Send segment recommendation
                let segmentName = getSegmentKeywordFromMessage(customerMessage) || (customerSegment[phoneNumber] === 'residential' ? 'résidentielle' : customerSegment[phoneNumber] === 'professional' ? 'professionnelle' : customerSegment[phoneNumber] === 'portable' ? 'DJ' : (segmentRec.segment === 'residential' ? 'résidentielle' : segmentRec.segment === 'professional' ? 'professionnelle' : 'DJ'));
                const productDescription = `• ${segmentRec.features}\n• Idéal pour: ${segmentRec.useCase}`;
                
                // Filter products to show ONLY the requested type
                let filteredProducts = segmentRec.allProducts;
                const messageLower = customerMessage.toLowerCase();
                
                if (messageLower.includes('subwoofer') || messageLower.includes('caisson') || messageLower.includes('bass')) {
                    filteredProducts = segmentRec.allProducts.filter(p => 
                        p.name.toLowerCase().includes('caisson') || 
                        p.name.toLowerCase().includes('bass') || 
                        p.name.toLowerCase().includes('subwoofer') ||
                        p.name === 'Acoustimass 3'
                    );
                    console.log(`🔊 Filtered to subwoofer products only: ${filteredProducts.map(p => p.name).join(', ')}`);
                } else if (messageLower.includes('cube') || messageLower.includes('cubes')) {
                    filteredProducts = segmentRec.allProducts.filter(p => p.name === 'Acoustimass 3');
                    console.log(`🔊 Filtered to cubes only: ${filteredProducts.map(p => p.name).join(', ')}`);
                } else if (messageLower.includes('soundbar') || messageLower.includes('barre')) {
                    filteredProducts = segmentRec.allProducts.filter(p => 
                        p.name.toLowerCase().includes('soundbar') || 
                        p.name.toLowerCase().includes('barre')
                    );
                    console.log(`🔊 Filtered to soundbar products only: ${filteredProducts.map(p => p.name).join(', ')}`);
                } else if (messageLower.includes('l1') || messageLower.includes('l2') || messageLower.includes('l3')) {
                    filteredProducts = segmentRec.allProducts.filter(p => 
                        p.name.toLowerCase().includes('l1') || 
                        p.name.toLowerCase().includes('l2') || 
                        p.name.toLowerCase().includes('l3')
                    );
                    console.log(`🔊 Filtered to L1/L2/L3 products only: ${filteredProducts.map(p => p.name).join(', ')}`);
                }
                
                const availableProducts = filteredProducts.map(p => p.name).join(' ou ');
                const recommendationMessage = `Parfait! Pour ${segmentName}, voici nos solutions:\n\n🎵 ${availableProducts}\n\n${productDescription}\n\nQuel est votre besoin exact? 😊`;

                await message.reply(recommendationMessage);
                console.log(`📤 Segment options sent: ${filteredProducts.map(p => p.name).join(', ')}`);

                // Record timestamp to prevent repetition
                lastRecommendationSent[phoneNumber] = Date.now();

                // Send images for FILTERED products only
                try {
                    const { MessageMedia } = require('whatsapp-web.js');
                    const fs = require('fs');

                    for (const product of filteredProducts) {
                        if (product.image && fs.existsSync(product.image)) {
                            console.log(`📸 Sending image for: ${product.name}`);
                            const media = MessageMedia.fromFilePath(product.image);
                            const captionFr = `🎵 ${product.name}\n\n${product.details ? product.details.descriptionFr : ''}`;
                            await client.sendMessage(message.from, media, { caption: captionFr });
                            console.log(`✅ Image sent: ${product.name}`);
                        }
                    }
                } catch (imageError) {
                    console.warn(`⚠️ Error sending product images: ${imageError.message}`);
                }

                // Add to conversation history
                conversationHistories[phoneNumber].push({
                    role: 'customer',
                    content: customerMessage
                });
                conversationHistories[phoneNumber].push({
                    role: 'assistant',
                    content: recommendationMessage
                });

                // Log lead with detected segment
                batchLogger.add(phoneNumber, 'interested', customerMessage, `Segment: ${customerSegment[phoneNumber]} | Options: ${filteredProducts.map(p => p.name).join(', ')}`);

                return; // Exit - product/segment shown
            }
            
            // No product/segment match - let Gemini AI handle the message
            console.log('🔄 Returning customer - no keyword match, letting AI handle');
            
            // Add customer message to history
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
        }

        // CHECK FOR ADDRESS/LOCATION QUESTIONS - Provide office contact info
        const addressKeywords = /\b(adresse|address|office|bureau|localisation|location|where|où|quelle est votre|où est|localité|lieu|endroit|visite|showroom)\b/i;
        if (addressKeywords.test(customerMessage)) {
            console.log('📍 ADDRESS/LOCATION QUESTION DETECTED!');
            
            // FRENCH ONLY - provide office info
            const contactMessage = TEMPLATES.CONTACT;
            
            await message.reply(contactMessage);
            console.log(`📤 Contact information sent`);
            
            // Add to conversation history
            if (!conversationHistories[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
            }
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: contactMessage
            });
            
            // Log the interaction
            logLead(phoneNumber, 'interested', customerMessage, 'Asking for office/email contact');
            return; // Exit - wait for customer's preference
        }

        // CHECK FOR IMAGE/PHOTO REQUESTS - Send product images if available
        const photoKeywords = /\b(photo|image|picture|pic|voir|show|plus|image de|photo de|visualiser|voir à quoi|c'est comment|comment ça|à quoi ça ressemble|photos|pkus)\b/i;
        if (photoKeywords.test(customerMessage)) {
            console.log('📸 IMAGE/PHOTO REQUEST DETECTED!');
            
            // Get ALL products mentioned in conversation (might be multiple: "Soundbar + Subwoofer")
            let productsToShow = [];

            // First, try to get current product (highest priority)
            if (currentProduct[phoneNumber]) {
                productsToShow.push(currentProduct[phoneNumber]);
                console.log(`📸 Using current product: ${currentProduct[phoneNumber]}`);
            }
            
            // Then extract ALL products from history
            if (conversationHistories[phoneNumber]) {
                const allProducts = extractAllProductsFromHistory(conversationHistories[phoneNumber]);
                for (const p of allProducts) {
                    if (!productsToShow.includes(p)) {
                        productsToShow.push(p);
                    }
                }
            }
            
            // If still no products found, try extracting from last assistant message
            if (productsToShow.length === 0 && conversationHistories[phoneNumber]) {
                for (let i = conversationHistories[phoneNumber].length - 1; i >= 0; i--) {
                    const msg = conversationHistories[phoneNumber][i];
                    if (msg && msg.role === 'assistant') {
                        // Try to findproduct keywords in bot's message
                        const allDbProducts = Object.keys(productsDatabase);
                        const msgContentLower = msg.content.toLowerCase();
                        for (const dbProduct of allDbProducts) {
                            if (msgContentLower.includes(dbProduct.toLowerCase())) {
                                productsToShow.push(dbProduct);
                            }
                        }
                        break; // Only check last assistant message
                    }
                }
            }
            
            // Convert products to string names for display (handling both strings and objects)
            const productNames = productsToShow.map(p => typeof p === 'string' ? p : p.name);
            console.log(`📸 Products to show: ${productNames.join(', ')}`);
            
            // Send images for all products found
            let imagesSent = false;
            try {
                const { MessageMedia } = require('whatsapp-web.js');
                const fs = require('fs');
                
                for (const product of productsToShow) {
                    // Handle both string product names and objects with name property
                    const productName = typeof product === 'string' ? product : product.name;
                    
                    try {
                        const productDetails = getProductDetails(productName);
                        if (productDetails && productDetails.image && fs.existsSync(productDetails.image)) {
                            const media = MessageMedia.fromFilePath(productDetails.image);
                            const captionFr = `🎵 **${productName}**\n\n${productDetails.descriptionFr}`;
                            
                            await client.sendMessage(message.from, media, { caption: captionFr });
                            console.log(`📸 Image sent: ${productName}`);
                            imagesSent = true;
                        } else {
                            console.warn(`⚠️ No image found for product: ${productName}`);
                        }
                    } catch (imgErr) {
                        console.warn(`⚠️ Error sending image for ${productName}: ${imgErr.message}`);
                    }
                }
            } catch (imageError) {
                console.warn(`⚠️ Error in image sending: ${imageError.message}`);
            }
            
            // If images were sent, add to history and exit
            if (imagesSent) {
                if (!conversationHistories[phoneNumber]) {
                    conversationHistories[phoneNumber] = [];
                }
                conversationHistories[phoneNumber].push({
                    role: 'customer',
                    content: customerMessage
                });
                conversationHistories[phoneNumber].push({
                    role: 'assistant',
                    content: `Voici les photos des produits! 📸`
                });
                batchLogger.add(phoneNumber, 'interested', customerMessage, `Viewed images: ${productsToShow.join(', ')}`);
                return; // Exit - images sent
            }
            
            // Fallback if no images found but request made
            let photoReply;
            if (currentProduct[phoneNumber]) {
                // Customer has a current product but no image found
                photoReply = `Je n'ai pas pu trouver d'image pour ${currentProduct[phoneNumber]} actuellement. Voulez-vous que je vous mette en contact avec notre équipe pour voir les photos directement ?`;
            } else {
                // No current product context
                photoReply = `Quel produit aimeriez-vous voir en photo ? (ex: Smart Soundbar, Acoustimass, L1 PRO 8, etc.)`;
            }

            await message.reply(photoReply);
            console.log(`📤 Photo availability message sent`);
            
            if (!conversationHistories[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
            }
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: photoReplyFr
            });
            
            batchLogger.add(phoneNumber, 'interested', customerMessage, 'Requested product image - no image available');
            return; // Exit - response sent
        }

        // Check for purchase intent - only send link if customer clearly wants to buy
        // Pass conversation history for context-aware detection
        const hasIntent = hasPurchaseIntent(customerMessage, conversationHistories[phoneNumber]);
        
        if (hasIntent) {
            console.log('🎯 PURCHASE INTENT DETECTED! Message:', customerMessage);
        } else {
            console.log('ℹ️ No purchase intent detected in:', customerMessage);
        }

        // CHECK FOR FAQ BEFORE SEGMENT - Answer common questions directly
        // This prevents questions like "what's your number" from being segmented as residential
        // Declare language here if not already declared in returning customer section
        let language = customerLanguage[phoneNumber] || detectLanguage(customerMessage);
        const faqAnswer = checkFAQ(customerMessage, language);
        
        if (faqAnswer) {
            console.log('ℹ️ FAQ QUESTION DETECTED - Responding with knowledge base answer');
            await message.reply(faqAnswer);
            console.log(`📤 FAQ Reply sent`);
            
            // Add to conversation history
            if (!conversationHistories[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
            }
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: faqAnswer
            });
            
            // Log the interaction
            logLead(phoneNumber, 'interested', customerMessage, 'FAQ answered');
            return; // Exit - no further processing needed
        }
        
        // DETECT SEGMENT IF NOT YET DETECTED (2nd or 3rd message from customer with context)
        // Count messages to delay segmentation for better context
        messageCount[phoneNumber] = (messageCount[phoneNumber] || 0) + 1;
        
        // Only do segment detection for NEW leads, NOT for already-confirmed customers
        if (!customerSegment[phoneNumber] && messageCount[phoneNumber] >= 2 && customerStatus[phoneNumber] !== 'confirmed') {
            customerSegment[phoneNumber] = detectSegment(customerMessage);
            console.log(`📊 SEGMENT DETECTED: ${customerSegment[phoneNumber]}`);
            
            // GET ALL PRODUCTS for this segment - let AI choose the best one
            const segmentRec = getSegmentRecommendation(customerSegment[phoneNumber]);
            
            // Don't set currentProduct yet - let AI choose based on conversation
            // We'll track it after AI recommends
            
            // FRENCH ONLY - ALL MESSAGES IN FRENCH
            let segmentName = getSegmentKeywordFromMessage(customerMessage) || (customerSegment[phoneNumber] === 'residential' ? 'résidentielle' : customerSegment[phoneNumber] === 'professional' ? 'professionnelle' : customerSegment[phoneNumber] === 'portable' ? 'DJ' : (segmentRec.segment === 'residential' ? 'résidentielle' : segmentRec.segment === 'professional' ? 'professionnelle' : 'DJ'));
            const productDescription = `• ${segmentRec.features}\n• Idéal pour: ${segmentRec.useCase}`;
            
            // Build message showing available options (AI will choose specific product)
            const availableProducts = segmentRec.productNames.join(' ou ');
            const recommendationMessage = `Parfait! Pour ${segmentName}, voici nos solutions:\n\n🎵 ${availableProducts}\n\n${productDescription}\n\nQuel est votre besoin exact? 😊`;
            
            // Add customer message and recommendation to history
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: recommendationMessage
            });
            
            // Send recommendation message
            await message.reply(recommendationMessage);
            console.log(`📤 Segment options sent: ${segmentRec.productNames.join(', ')}`);
            
            // Send images for ALL products in this segment
            try {
                const { MessageMedia } = require('whatsapp-web.js');
                const fs = require('fs');
                
                for (const product of segmentRec.allProducts) {
                    if (product.image && fs.existsSync(product.image)) {
                        console.log(`📸 Sending image for: ${product.name}`);
                        const media = MessageMedia.fromFilePath(product.image);
                        const captionFr = `🎵 ${product.name}\n\n${product.details ? product.details.descriptionFr : ''}`;
                        await client.sendMessage(message.from, media, { caption: captionFr });
                        console.log(`✅ Image sent: ${product.name}`);
                    }
                }
            } catch (imageError) {
                console.warn(`⚠️ Error sending product images: ${imageError.message}`);
            }
            
            // Log lead with detected segment
            batchLogger.add(phoneNumber, 'interested', customerMessage, `Segment: ${customerSegment[phoneNumber]} | Options: ${segmentRec.productNames.join(', ')}`);
            
            return; // Exit after recommendation, wait for feedback
        }
        
        // CONFIRMATION FLOW: If purchase intent detected, send checkout + contact info
        // Allow multiple checkouts for customers adding additional products
        // THIS MUST CHECK BEFORE "WAIT FOR CONTEXT" TO REPLY ON FIRST MESSAGE
        if (hasIntent) {
            console.log('🎯 PURCHASE INTENT DETECTED! Sending checkout link with contact info...');
            
            // Don't confirm lead yet - wait until redirect link is actually sent
            customerStatus[phoneNumber] = 'pending_confirmation';
            
            // Initialize conversation history if not already done
            if (!conversationHistories[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
            }
            
            // Get ALL products the customer is interested in
            // FIRST: Try extracting from CURRENT message only (accurate intent)
            let productsOfInterest = extractProductsFromCurrentMessage(customerMessage);
            
            // SECOND: If current message has no product but we're tracking one, use it
            if (productsOfInterest.length === 0 && currentProduct[phoneNumber]) {
                productsOfInterest.push({ name: currentProduct[phoneNumber], quantity: 1 });
            }
            
            // THIRD: If still no products AND message is just "je veux une solution" without specifying what
            // Ask them what product they want instead of sending generic checkout
            if (productsOfInterest.length === 0 && customerMessage.toLowerCase().includes('solution')) {
                console.log(`⚠️ Customer wants a solution but didn't mention a product - asking for clarification`);
                
                // Detect segment from the message to suggest appropriate category
                const detectedSegment = detectSegment(customerMessage);
                if (detectedSegment) {
                    customerSegment[phoneNumber] = detectedSegment;
                }
                
                // Send product recommendation instead of checkout
                const segmentRec = getSegmentRecommendation(customerSegment[phoneNumber] || 'residential');
                const responseMsg = `Parfait! Pour une utilisation ${customerMessage.toLowerCase().includes('hotel') ? 'hôtel' : 'de ce type'}, je vous recommande:\n\n${segmentRec.features}\n\n✅ Intéressé? Dites-moi "Oui" ou précisez la quantité`;
                
                await message.reply(responseMsg);
                console.log(`📤 Product recommendation sent (not checkout)`);
                
                batchLogger.add(phoneNumber, 'interested', customerMessage, `Asking for product specification: ${customerMessage}`);
                return; // Exit - wait for product confirmation
            }
            
            // FOURTH: If STILL no products, only then use history fallback
            if (productsOfInterest.length === 0 && conversationHistories[phoneNumber]) {
                const allExtracted = extractAllProductsFromHistory(conversationHistories[phoneNumber]);
                for (const p of allExtracted) {
                    const existingIndex = productsOfInterest.findIndex(item => item.name === p.name);
                    if (existingIndex === -1) {
                        productsOfInterest.push(p);
                    } else {
                        productsOfInterest[existingIndex].quantity += p.quantity;
                    }
                }
            }
            
            // If no specific products found, ask for clarification instead of assuming
            if (productsOfInterest.length === 0) {
                console.log(`⚠️ Purchase intent detected but no specific product identified - asking for clarification`);

                // Reset status since we don't have a confirmed product
                customerStatus[phoneNumber] = 'interested';

                // Detect segment to provide relevant suggestions
                const detectedSegment = detectSegment(customerMessage);
                if (detectedSegment) {
                    customerSegment[phoneNumber] = detectedSegment;
                }

                let clarificationMessage;
                if (customerSegment[phoneNumber]) {
                    const segmentRec = getSegmentRecommendation(customerSegment[phoneNumber]);
                    clarificationMessage = `Je vois que vous êtes intéressé par une solution ${customerSegment[phoneNumber] === 'residential' ? 'pour domicile' : customerSegment[phoneNumber] === 'professional' ? 'professionnelle' : 'portable'}.\n\nVoici nos options recommandées:\n\n🎵 ${segmentRec.productNames.join(' ou ')}\n\nLequel vous intéresse le plus ? Ou préférez-vous un produit spécifique ?`;
                } else {
                    clarificationMessage = `Je vois que vous souhaitez acheter une solution audio ! 🎵\n\nPouvez-vous me préciser quel type de produit vous intéresse ?\n• Pour domicile (TV, cinéma, musique)\n• Pour événements (DJ, concert, mariage)\n• Pour professionnels (restaurant, hôtel)\n\nOu mentionnez directement le produit souhaité !`;
                }

                await message.reply(clarificationMessage);
                console.log(`📤 Asking for product clarification instead of generic checkout`);

                batchLogger.add(phoneNumber, 'interested', customerMessage, 'Purchase intent detected - asking for product clarification');
                return; // Exit - wait for specific product choice
            }
            
            console.log(`📦 Products of interest: ${productsOfInterest.map(p => `${p.name}${p.quantity > 1 ? ` x${p.quantity}` : ''}`).join(', ')}`);
            
            // Send product images for each product
            try {
                const { MessageMedia } = require('whatsapp-web.js');
                const fs = require('fs');
                
                for (const product of productsOfInterest) {
                    if (product.name === 'Media Prestige Product') continue; // Skip generic name
                    
                    try {
                        console.log(`📸 Sending image for: ${product.name}`);
                        const productDetails = getProductDetails(product.name);
                        
                        if (productDetails && productDetails.image && fs.existsSync(productDetails.image)) {
                            const media = MessageMedia.fromFilePath(productDetails.image);
                            const caption = product.quantity > 1
                                ? `🎵 ${product.name} x${product.quantity}`
                                : `🎵 ${product.name}`;
                            await client.sendMessage(message.from, media, { caption });
                            console.log(`✅ Image sent: ${product.name}`);
                        }
                    } catch (imgErr) {
                        console.warn(`⚠️ Image error for ${product.name}: ${imgErr.message}`);
                    }
                }
            } catch (imageError) {
                console.warn(`⚠️ Error in image sending: ${imageError.message}`);
            }
            
            // Build product list with individual prices
            const productList = productsOfInterest
                .filter(p => p.name !== 'Media Prestige Product')
                .map(p => p.name)
                .join(', ') || 'nos produits Premium Media Prestige';
            
            // Build price info for each product
            let priceText = '';
            for (const product of productsOfInterest.filter(p => p.name !== 'Media Prestige Product')) {
                const priceInfo = getProductPrice(product.name);
                priceText += `💰 ${product.name}: ${priceInfo.priceFr}\n`;
            }
            
            const prefillMessage = `Bonjour, je suis intéressé par ${productList}. Je souhaite finaliser ma commande.`;
            const encodedMessage = encodeURIComponent(prefillMessage);
            
            // Always show prices (whether available or "Sur devis")
            let priceDisplay = priceText ? `\n${priceText}` : '';
            
            // Send checkout message with full contact information - FRENCH ONLY
            const salesNumber = process.env.SALES_WHATSAPP_NUMBER || '212600051612';
            const mapsUrl = process.env.GOOGLE_MAPS_URL || 'https://maps.app.goo.gl/KPfEza6pFAwdg89X9';
            
            // Pre-fill message with product info
            const prefillMsg = encodeURIComponent(`Bonjour, je suis intéressé par ${productList || 'vos produits'}. Je souhaite finaliser ma commande.`);
            
            const checkoutMessage = fillTemplate(TEMPLATES.CHECKOUT, { 
                productList, 
                salesNumber, 
                encodedMessage: prefillMsg,
                mapsUrl
            }) + priceDisplay;
            
            await message.reply(checkoutMessage);
            console.log(`✅ Checkout link sent with products: ${productList}`);
            
            // Confirm lead when redirect link is sent
            confirmLead(phoneNumber, productList);
            customerStatus[phoneNumber] = 'confirmed';
            
            // Add to conversation history
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            conversationHistories[phoneNumber].push({
                role: 'assistant',
                content: checkoutMessage
            });
            
            return; // EXIT immediately - no further processing
        }
        
        // If first customer message and segment not yet detected, wait for more context
        // BUT: Don't wait for RETURNING/KNOWN customers (they're already qualified)
        if (!customerSegment[phoneNumber] && messageCount[phoneNumber] === 1 && !knownCustomers[phoneNumber]) {
            console.log('⏳ Waiting for more customer context before segmentation...');
            
            // Initialize conversation history if not already done
            if (!conversationHistories[phoneNumber]) {
                conversationHistories[phoneNumber] = [];
            }
            
            // Add customer message to history
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage
            });
            
            // Log the message but don't segment yet - already sent greeting above
            batchLogger.add(phoneNumber, 'interested', customerMessage, 'Awaiting more context for segmentation');
            return; // Exit - wait for next message (only for NEW customers, not known ones)
        }
        
        // Log lead interaction (initial contact)
        // Use current status to determine log status (allows downgrade from confirmed to interested)
        const currentStatus = customerStatus[phoneNumber] || 'new';
        const logStatus = currentStatus === 'confirmed' ? 'interested' : currentStatus;
        
        // Clear previous product if customer was confirmed and now downgrading to interested
        // This prevents old products from appearing in new checkout messages
        if (currentStatus === 'confirmed' && logStatus === 'interested') {
            console.log('🔄 Customer downgraded from confirmed to interested - clearing previous product');
            currentProduct[phoneNumber] = null;
        }
        
        if (!conversationHistories[phoneNumber]) {
            batchLogger.add(phoneNumber, 'new', customerMessage, 'Initial contact');
        } else {
            batchLogger.add(phoneNumber, logStatus, customerMessage);
        }

        // Get or initialize conversation history for this customer
        if (!conversationHistories[phoneNumber]) {
            conversationHistories[phoneNumber] = [];
        }

            // Add customer message to history with timestamp
            conversationHistories[phoneNumber].push({
                role: 'customer',
                content: customerMessage,
                timestamp: Date.now()
            });

        // Keep only last 10 messages to avoid token overflow
        if (conversationHistories[phoneNumber].length > 10) {
            conversationHistories[phoneNumber] = conversationHistories[phoneNumber].slice(-10);
        }

        // Build conversation history string
        // Update language and segment with latest detection
        customerLanguage[phoneNumber] = detectLanguage(customerMessage);
        
        // For confirmed customers, maintain their segment and product context
        if (customerStatus[phoneNumber] === 'confirmed') {
            // Keep existing segment and product context for confirmed customers
            customerSegment[phoneNumber] = customerSegment[phoneNumber] || detectSegment(customerMessage) || 'residential';
            console.log(`🔄 Confirmed customer - Maintaining context: segment=${customerSegment[phoneNumber]}, product=${currentProduct[phoneNumber] || 'none'}`);
        } else {
            customerSegment[phoneNumber] = customerSegment[phoneNumber] || detectSegment(customerMessage);
        }
        
        conversationStage[phoneNumber] = detectConversationStage(customerMessage);
        
        console.log(`📊 Segment: ${customerSegment[phoneNumber]} | Stage: ${conversationStage[phoneNumber]}`);

        const historyString = conversationHistories[phoneNumber]
            .map(msg => `${msg.role === 'customer' ? 'Customer' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        // Build enhanced context with segment information
        const segmentContext = buildSegmentContext(customerSegment[phoneNumber], customerMessage);
        
        // LEAD CONFIRMATION PROMPT - Context-aware responses
        // Handles both prospecting and confirmed customer support
        let leadConfirmationPrompt;
        if (customerStatus[phoneNumber] === 'confirmed') {
            leadConfirmationPrompt = `You are a friendly sales assistant for Media Prestige audio solutions.
The customer has shown interest in products before. Be conversational and helpful.
If they mention a specific product, provide information and guide them naturally toward purchase.
If they ask questions, answer clearly and offer to help with ordering or more details.
Don't ask them to "recall" previous choices - focus on their current request.
Always respond in French. Be natural, not robotic.`;
        } else {
            leadConfirmationPrompt = `You are a brief, professional sales assistant for Media Prestige audio solutions.
ONLY discuss our listed products with EXACT PRICES from the product database.
CRITICAL: Acoustimass = 900 DH TTC (cubes only), Acoustimass 3 = 3900 DH TTC (subwoofer only).
YOUR GOAL: Confirm if customer wants to buy. Keep replies SHORT (2-3 sentences max).
IMPORTANT: Only mention ONE or TWO products max per message. Never send full product lists.
If customer asks about something, relate it back to our products or offer contact with our team to finalize.
Always respond in the customer's language (French/Arabic/English detected).
Be human-like but BRIEF - we want quick sales, not endless discussions.
NEVER confuse product names or prices - always use exact database values.`;
        }
        
        let contextHint = '';
        if (!openingQuestionAsked[phoneNumber]) {
            contextHint = `[CONTEXT: This is the customer's first message. Use brief introduction with ONE question to understand their needs. Keep it short (2-3 sentences).]`;
            openingQuestionAsked[phoneNumber] = true;
        } else {
            contextHint = `[CONTEXT: Customer already greeted. NOW: Answer briefly (2-3 sentences). Only mention 1-2 products max. Try to confirm if they want to buy. Be human-like but EFFICIENT.]`;
        }

        const enhancedHistory = leadConfirmationPrompt + '\n' + contextHint + '\n' + historyString;

        // Generate AI response using improved manager with retry logic
        let response;
        try {
            response = await aiManager.generateWithRetry(customerMessage, enhancedHistory, 'auto');
            console.log('🤖 AI response generated successfully');
        } catch (aiError) {
            console.error('❌ All AI services failed:', aiError.message);
            response = null;
        }

        // Send response
        if (response) {
            // Strip any URLs from AI response (safety measure - only checkout links should be sent separately)
            let cleanResponse = response.replace(/https?:\/\/[^\s]+/g, '').trim();
            
            // EXTRACT which product the AI recommended from its response
            // This helps us track the current product for checkout
            const allProductNames = [
                'L1 PRO 8', 'L1 PRO 16', 'Smart Soundbar', 'Smart Ultra Soundbar',
                'Acoustimass', 'Acoustimass 3', 'Smart Ultra Caisson 700', 'Caisson de Bass Flush',
                'Bose Music Amplifier', 'IZA2120', 'ZA250',
                'DM2C', 'DM3 Flush', 'DM5 Flush', 'DM8C',
                'FS2C', 'FS2SE', '251', '360P EC', 'Satellite Flush', 'Satellites'
            ];
            
            for (const productName of allProductNames) {
                if (cleanResponse.includes(productName)) {
                    currentProduct[phoneNumber] = productName;
                    console.log(`🎯 AI recommended product: ${productName}`);
                    break;
                }
            }
            
            // If response mentions connecting to team, add the WhatsApp link
            if (cleanResponse.toLowerCase().includes('je te connecte') || 
                cleanResponse.toLowerCase().includes('je vous connecte') ||
                cleanResponse.toLowerCase().includes('l\'équipe pour') ||
                cleanResponse.toLowerCase().includes('finaliser') ||
                cleanResponse.toLowerCase().includes('réserver') ||
                cleanResponse.toLowerCase().includes('commander') ||
                cleanResponse.toLowerCase().includes('whatsapp') ||
                cleanResponse.toLowerCase().includes('clique ici')) {
                
                const salesNumber = process.env.SALES_WHATSAPP_NUMBER || '212600051612';
                const mapsUrl = process.env.GOOGLE_MAPS_URL || 'https://maps.app.goo.gl/KPfEza6pFAwdg89X9';
                
                // Get product list for pre-fill message
                // FIRST: Try to get products mentioned in CURRENT message (for accurate quantities)
                let productsForLink = extractProductsFromCurrentMessage(customerMessage);
                
                // If current message doesn't mention products, fall back to currentProduct ONLY (not history)
                // This prevents old products from appearing in new checkout
                if (productsForLink.length === 0) {
                    if (currentProduct[phoneNumber]) {
                        productsForLink.push({ name: currentProduct[phoneNumber], quantity: 1 });
                    }
                }
                
                // If no products found, try to infer from segment
                if (productsForLink.length === 0) {
                    if (customerSegment[phoneNumber]) {
                        const segment = customerSegment[phoneNumber].toLowerCase();
                        if (segment === 'residential') {
                            productsForLink.push({ name: 'Smart Soundbar', quantity: 1 });
                        } else if (segment === 'professional') {
                            productsForLink.push({ name: 'L1 PRO 8', quantity: 1 });
                        } else if (segment === 'commercial') {
                            productsForLink.push({ name: 'DM2C', quantity: 1 });
                        }
                    }
                }
                
                const productListForLink = productsForLink.map(p => p.name).join(', ') || 'vos produits';
                
                // Pre-fill message with product info
                const prefillMsg = encodeURIComponent(`Bonjour, je suis intéressé par ${productListForLink}. Je souhaite finaliser ma commande.`);
                
                // Build price info for products
                let productPriceInfo = '';
                for (const product of productsForLink) {
                    const priceInfo = getProductPrice(product.name);
                    productPriceInfo += `💰 ${product.name}: ${priceInfo.priceFr}\n`;
                }
                
                cleanResponse += `\n\n✅ Informations produits:\n${productPriceInfo}\n🔗 Pour finaliser:\nhttps://wa.me/${salesNumber}?text=${prefillMsg}\n\n📍 Showroom:\n${mapsUrl}`;
                
                // Mark as confirmed ONLY when redirect link is actually sent
                confirmLead(phoneNumber, productListForLink);
                customerStatus[phoneNumber] = 'confirmed';
                console.log(`✅ WhatsApp link sent - Lead confirmed`);
            }
            
            // CHECK FOR PRODUCT MENTIONS IN AI RESPONSE - Send image WITH text as caption (avoid duplicate messages)
            let imageSentWithCaption = false;
            try {
                const { MessageMedia } = require('whatsapp-web.js');
                const fs = require('fs');
                
                // List of all products to check for in response
                const allProducts = [
                    'L1 PRO 8', 'L1 PRO 16', 'Smart Soundbar', 'Smart Ultra Soundbar',
                    'Acoustimass', 'Acoustimass 3', 'Smart Ultra Caisson 700', 'Caisson de Bass Flush',
                    'Bose Music Amplifier', 'IZA2120', 'ZA250',
                    'DM2C', 'DM3 Flush', 'DM5 Flush', 'DM8C',
                    'FS2C', 'FS2SE', '251', '360P EC', 'Satellite Flush', 'Satellites'
                ];
                
                // Extract mentioned products from response
                const mentionedProducts = [];
                for (const product of allProducts) {
                    if (cleanResponse.includes(product)) {
                        mentionedProducts.push(product);
                    }
                }
                
                // If product mentioned, send image WITH text as caption (not separately)
                if (mentionedProducts.length > 0) {
                    const productName = mentionedProducts[0]; // Use first mentioned product
                    console.log(`🔍 Looking up image for mentioned product: "${productName}"`);
                    const productDetails = getProductDetails(productName);
                    
                    if (productDetails && productDetails.image && fs.existsSync(productDetails.image)) {
                        console.log(`📸 Sending image WITH text for: ${productName}`);
                        const media = MessageMedia.fromFilePath(productDetails.image);
                        // Combine AI response text with product info as caption
                        const combinedCaption = `${cleanResponse}\n\n🎵 ${productName}`;
                        
                        await client.sendMessage(message.from, media, { caption: combinedCaption });
                        console.log(`✅ Product image with text sent: ${productName}`);
                        
                        // Mark that we sent image with caption
                        imageSentWithCaption = true;
                        
                        // Add to history
                        conversationHistories[phoneNumber].push({
                            role: 'assistant',
                            content: combinedCaption
                        });
                    } else {
                        console.warn(`⚠️ Image not found for ${productName}, sending text only`);
                        // Send text only if no image available
                        await message.reply(cleanResponse);
                        console.log(`📤 Replied (text only): ${cleanResponse}`);
                        
                        // Add to history
                        conversationHistories[phoneNumber].push({
                            role: 'assistant',
                            content: cleanResponse
                        });
                    }
                } else {
                    // No product mentioned, send text only
                    await message.reply(cleanResponse);
                    console.log(`📤 Replied (text only): ${cleanResponse}`);
                    
                    // Add to history
                    conversationHistories[phoneNumber].push({
                        role: 'assistant',
                        content: cleanResponse
                    });
                }
            } catch (imageCheckError) {
                console.warn(`⚠️ Error checking for product images: ${imageCheckError.message}`);
                // Fallback: send text only
                await message.reply(cleanResponse);
                console.log(`📤 Replied (text only): ${cleanResponse}`);
                
                // Add to history
                conversationHistories[phoneNumber].push({
                    role: 'assistant',
                    content: cleanResponse
                });
            }
        } else {
            // Fallback message when all AI services fail
            const fallbackMessage = TEMPLATES.FALLBACK;
            
            await message.reply(fallbackMessage);
            console.log(`📤 Fallback message sent (all AI services failed)`);
        }

    } catch (error) {
        console.error('❌ Error handling message:', error);
        // Track failed message processing
        perfTracker.end(false, error);
        return;
    }

    // Track successful message processing
    perfTracker.end(true);
});

// Handle authentication failures
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.log('❌ Client was disconnected:', reason);
});

// Add simple metrics endpoint (optional - for monitoring)
const http = require('http');
const metricsServer = http.createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(perfMonitor.getMetrics(), null, 2));
  } else if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start metrics server on port 3002 (optional)
try {
  metricsServer.listen(3002, 'localhost', () => {
    console.log('📊 Metrics server running on http://localhost:3002');
  });
} catch (error) {
  console.warn('⚠️ Could not start metrics server:', error.message);
}

// Initialize the client
console.log('🚀 Starting Media Prestige WhatsApp Bot...');
console.log('✨ Performance optimizations active:');
console.log('  • Memory cleanup every 4 hours');
console.log('  • Batch lead logging (30s intervals)');
console.log('  • AI retry logic with fallback');
console.log('  • Product caching (30min TTL)');
console.log('  • Performance monitoring');
client.initialize();

