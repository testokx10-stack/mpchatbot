/**
 * Media Prestige WhatsApp Bot - API Manager
 * Handles intelligent routing, rate limiting, and graceful fallbacks across all AI providers
 */

const { generateGroqResponse, isGroqAvailable, generateGroqResponse2, isGroqAvailable2 } = require('./groq');
const { generateOllamaResponse, isOllamaAvailable } = require('./ollama');
const { generateGeminiResponse, isGeminiAvailable, generateGeminiResponse2, isGeminiAvailable2, generateGeminiResponse3, isGeminiAvailable3 } = require('./gemini');

// API priority order and configuration
const API_CONFIG = {
    providers: [
        { name: 'gemini', fn: generateGeminiResponse, check: isGeminiAvailable, timeout: 30000 },
        { name: 'gemini-fallback', fn: generateGeminiResponse2, check: isGeminiAvailable2, timeout: 30000 },
        { name: 'gemini-fallback-3', fn: generateGeminiResponse3, check: isGeminiAvailable3, timeout: 30000 },
        { name: 'groq', fn: generateGroqResponse, check: isGroqAvailable, timeout: 30000 },
        { name: 'groq-fallback', fn: generateGroqResponse2, check: isGroqAvailable2, timeout: 30000 },
        { name: 'ollama', fn: generateOllamaResponse, check: isOllamaAvailable, timeout: 60000 }
    ],
    requestCountPerDay: {}, // Track daily request count per API
    geminiDailyLimit: 15, // Conservative limit (20 free tier - 5 buffer)
    lastResetTime: Date.now()
};

/**
 * Reset daily counters if a new day has started
 */
function resetDailyCountersIfNeeded() {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (now - API_CONFIG.lastResetTime > dayInMs) {
        API_CONFIG.requestCountPerDay = {};
        API_CONFIG.lastResetTime = now;
        console.log('📅 Daily API counters reset');
    }
}

/**
 * Check if Gemini quota is available
 */
function hasGeminiQuota() {
    resetDailyCountersIfNeeded();
    const currentCount = API_CONFIG.requestCountPerDay['gemini'] || 0;
    return currentCount < API_CONFIG.geminiDailyLimit;
}

/**
 * Increment API request counter
 */
function incrementApiCounter(apiName) {
    resetDailyCountersIfNeeded();
    if (!API_CONFIG.requestCountPerDay[apiName]) {
        API_CONFIG.requestCountPerDay[apiName] = 0;
    }
    API_CONFIG.requestCountPerDay[apiName]++;
    console.log(`📊 ${apiName} requests today: ${API_CONFIG.requestCountPerDay[apiName]}`);
}

/**
 * Get optimized provider order based on availability and quota
 */
async function getOptimizedProviderOrder() {
    const order = [];
    
    // Check Gemini Primary (preferred) - but respect quota
    if (hasGeminiQuota() && await API_CONFIG.providers[0].check()) {
        order.push(API_CONFIG.providers[0]);
    }
    
    // Check Gemini Fallback (secondary) - also respects quota
    if (hasGeminiQuota() && await API_CONFIG.providers[1].check()) {
        order.push(API_CONFIG.providers[1]);
    }
    
    // Check Gemini Fallback 3 (tertiary) - also respects quota
    if (hasGeminiQuota() && await API_CONFIG.providers[2].check()) {
        order.push(API_CONFIG.providers[2]);
    }
    
    // Check Groq (third priority, no quota issues)
    if (await API_CONFIG.providers[3].check()) {
        order.push(API_CONFIG.providers[3]);
    }
    
    // Check Groq fallback (fourth priority, secondary API key)
    if (await API_CONFIG.providers[4].check()) {
        order.push(API_CONFIG.providers[4]);
    }
    
    // Check Ollama (final fallback if others unavailable)
    if (await API_CONFIG.providers[5].check()) {
        order.push(API_CONFIG.providers[5]);
    }
    
    return order;
}

/**
 * Generate AI response with intelligent fallback system
 * @param {string} customerMessage - Customer's message
 * @param {string} conversationHistory - Conversation context
 * @returns {Promise<string>} - AI response or null if all fail
 */
async function generateAIResponse(customerMessage, conversationHistory = '') {
    const providers = await getOptimizedProviderOrder();
    
    if (providers.length === 0) {
        console.error('❌ NO PROVIDERS AVAILABLE - All APIs are down or quota exhausted');
        return null;
    }
    
    // Try each provider in priority order
    for (const provider of providers) {
        try {
            console.log(`🤖 Trying ${provider.name}...`);
            
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${provider.name} timeout`)), provider.timeout)
            );
            
            // Call API with timeout
            const responsePromise = provider.fn(customerMessage, conversationHistory);
            const response = await Promise.race([responsePromise, timeoutPromise]);
            
            if (response) {
                incrementApiCounter(provider.name);
                console.log(`✅ ${provider.name} response generated`);
                return response;
            }
        } catch (error) {
            console.error(`❌ ${provider.name} failed: ${error.message}`);
            continue; // Try next provider
        }
    }
    
    console.error('❌ ALL PROVIDERS FAILED - Unable to generate response');
    return null;
}

/**
 * Get API health status
 */
async function getAPIHealth() {
    resetDailyCountersIfNeeded();
    
    const health = {
        timestamp: new Date().toISOString(),
        providers: {}
    };
    
    for (const provider of API_CONFIG.providers) {
        try {
            const available = await provider.check();
            health.providers[provider.name] = {
                available,
                requests_today: API_CONFIG.requestCountPerDay[provider.name] || 0
            };
            
            if (provider.name === 'gemini') {
                health.providers.gemini.quota_remaining = API_CONFIG.geminiDailyLimit - (API_CONFIG.requestCountPerDay['gemini'] || 0);
            }
        } catch (error) {
            health.providers[provider.name] = {
                available: false,
                error: error.message
            };
        }
    }
    
    return health;
}

module.exports = {
    generateAIResponse,
    getAPIHealth,
    hasGeminiQuota,
    incrementApiCounter,
    getOptimizedProviderOrder
};
