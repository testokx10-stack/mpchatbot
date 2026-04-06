/**
 * Media Prestige WhatsApp Bot - Groq AI Integration
 * Uses Groq for fast, free AI responses with generous quota
 * Auto-handles model deprecation with fallback models
 */

const Groq = require('groq-sdk').default;
const { SYSTEM_PROMPT } = require('./systemPrompt');

// Initialize Groq clients (primary and fallback)
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const groq2 = new Groq({
    apiKey: process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY
});

// Model priority order (optimized for sales/marketing)
// Retrieved from live Groq API (March 2026)
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',                         // BEST - multilingual, fast, quality
    'meta-llama/llama-4-scout-17b-16e-instruct',     // Great instruction following
    'llama-3.1-8b-instant',                           // Fast, reliable fallback
    'groq/compound'                                    // General purpose backup
];

// Model rotation index to spread load and avoid hitting single model rate limits
let currentModelIndex = 0;

/**
 * Generate AI response using Groq (with auto-fallback for deprecated models)
 * @param {string} customerMessage - The customer's message
 * @param {string} conversationHistory - Previous conversation context (optional)
 * @returns {Promise<string>} - AI-generated response
 */
async function generateGroqResponse(customerMessage, conversationHistory = '') {
    // Build the messages array
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        }
    ];

    // Add conversation history if available
    if (conversationHistory) {
        messages.push({
            role: 'user',
            content: 'Previous conversation:\n' + conversationHistory
        });
    }

    // Add current customer message
    messages.push({
        role: 'user',
        content: customerMessage
    });

    // Rotate through models to spread load and avoid rate limiting on single model
    // Start from next model in rotation to balance usage across all models
    const startIndex = currentModelIndex;
    let modelsToTry = [];
    for (let i = 0; i < GROQ_MODELS.length; i++) {
        modelsToTry.push(GROQ_MODELS[(startIndex + i) % GROQ_MODELS.length]);
    }
    currentModelIndex = (startIndex + 1) % GROQ_MODELS.length; // Rotate for next request

    // Try models in rotated order with PRIMARY Groq API
    for (const model of modelsToTry) {
        try {
            console.log(`  🔄 Groq (Primary) trying model: ${model}`);
            
            const completion = await groq.chat.completions.create({
                messages: messages,
                model: model,
                max_tokens: 200,
                temperature: 0.3,  // Lower for consistent, professional sales responses (matches Gemini behavior)
                top_p: 0.9
            });

            const response = completion.choices[0]?.message?.content;
            if (response) {
                console.log(`  ✅ Groq (Primary) success with ${model}`);
                return response;
            }
        } catch (error) {
            // Check if model is decommissioned
            if (error.message && error.message.includes('decommissioned')) {
                console.log(`  ⚠️ Model ${model} decommissioned, trying next...`);
                continue; // Try next model
            }
            // For rate limits and other errors, try next model
            console.log(`  ⚠️ ${model} failed: ${error.message}, trying next...`);
            continue;
        }
    }

    // If primary API failed, try SECONDARY Groq API
    console.log('  🔄 Primary Groq API failed, trying secondary Groq API...');
    for (const model of modelsToTry) {
        try {
            console.log(`  🔄 Groq (Secondary) trying model: ${model}`);
            
            const completion = await groq2.chat.completions.create({
                messages: messages,
                model: model,
                max_tokens: 200,
                temperature: 0.3,
                top_p: 0.9
            });

            const response = completion.choices[0]?.message?.content;
            if (response) {
                console.log(`  ✅ Groq (Secondary) success with ${model}`);
                return response;
            }
        } catch (error) {
            if (error.message && error.message.includes('decommissioned')) {
                console.log(`  ⚠️ Model ${model} decommissioned, trying next...`);
                continue;
            }
            console.log(`  ⚠️ ${model} failed: ${error.message}, trying next...`);
            continue;
        }
    }

    console.error('❌ Groq: All models failed on both primary and secondary APIs');
    return null;
}

/**
 * Check if Groq API is available
 */
async function isGroqAvailable() {
    if (!process.env.GROQ_API_KEY) {
        console.log('  ⚠️ Groq: API key missing');
        return false;
    }
    return true; // Groq is available if API key is set
}

/**
 * Generate AI response using Secondary Groq API only
 * @param {string} customerMessage - The customer's message
 * @param {string} conversationHistory - Previous conversation context (optional)
 * @returns {Promise<string>} - AI-generated response
 */
async function generateGroqResponse2(customerMessage, conversationHistory = '') {
    // Build the messages array
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        }
    ];

    // Add conversation history if available
    if (conversationHistory) {
        messages.push({
            role: 'user',
            content: 'Previous conversation:\n' + conversationHistory
        });
    }

    // Add current customer message
    messages.push({
        role: 'user',
        content: customerMessage
    });

    // Rotate through models to spread load and avoid rate limiting on single model
    const startIndex = currentModelIndex;
    let modelsToTry = [];
    for (let i = 0; i < GROQ_MODELS.length; i++) {
        modelsToTry.push(GROQ_MODELS[(startIndex + i) % GROQ_MODELS.length]);
    }
    currentModelIndex = (startIndex + 1) % GROQ_MODELS.length; // Rotate for next request

    // Try models with SECONDARY Groq API only
    for (const model of modelsToTry) {
        try {
            console.log(`  🔄 Groq (Secondary) trying model: ${model}`);
            
            const completion = await groq2.chat.completions.create({
                messages: messages,
                model: model,
                max_tokens: 200,
                temperature: 0.3,
                top_p: 0.9
            });

            const response = completion.choices[0]?.message?.content;
            if (response) {
                console.log(`  ✅ Groq (Secondary) success with ${model}`);
                return response;
            }
        } catch (error) {
            if (error.message && error.message.includes('decommissioned')) {
                console.log(`  ⚠️ Model ${model} decommissioned, trying next...`);
                continue;
            }
            console.log(`  ⚠️ ${model} failed: ${error.message}, trying next...`);
            continue;
        }
    }

    console.error('❌ Groq (Secondary): All models failed');
    return null;
}

/**
 * Check if Secondary Groq API is available
 */
async function isGroqAvailable2() {
    if (!process.env.GROQ_API_KEY_2 && !process.env.GROQ_API_KEY) {
        console.log('  ⚠️ Groq (Secondary): API key missing');
        return false;
    }
    return true; // Secondary Groq is available if API key is set
}

module.exports = { generateGroqResponse, isGroqAvailable, generateGroqResponse2, isGroqAvailable2 };
