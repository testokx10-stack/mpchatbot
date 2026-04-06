/**
 * Media Prestige WhatsApp Bot - Gemini AI Integration
 * Uses Google Gemini for intelligent, context-aware responses
 */

require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');
const { generateGroqResponse, isGroqAvailable } = require('./groq');
const { generateOllamaResponse, isOllamaAvailable } = require('./ollama');

// Initialize Gemini AI - gets API key from environment variable GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

// Initialize Gemini AI Fallback - gets secondary API key from environment variable GEMINI_API_KEY_2
const apiKey2 = process.env.GEMINI_API_KEY_2;
const ai2 = apiKey2 ? new GoogleGenAI({ apiKey: apiKey2 }) : null;

// Initialize Gemini AI Fallback 3 - gets tertiary API key from environment variable GEMINI_API_KEY_3
const apiKey3 = process.env.GEMINI_API_KEY_3;
const ai3 = apiKey3 ? new GoogleGenAI({ apiKey: apiKey3 }) : null;

// Import unified system prompt from single source of truth
const { SYSTEM_PROMPT } = require('./systemPrompt');

/**
 * Generate AI response using Gemini ONLY (no fallbacks)
 * Caller should handle fallbacks
 */
async function generateGeminiResponse(customerMessage, conversationHistory = '') {
    try {
        // Build the prompt with context
        let prompt = SYSTEM_PROMPT + '\n\n';
        
        if (conversationHistory) {
            prompt += 'Previous conversation:\n' + conversationHistory + '\n\n';
        }
        
        prompt += 'Customer message: ' + customerMessage + '\n\nYour response:';

        // Generate response with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        
        const resultPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const text = result.text;

        // Clean up the response
        let cleanResponse = text.trim();
        
        // Remove any quotes if present
        if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
            cleanResponse = cleanResponse.slice(1, -1);
        }

        return cleanResponse;

    } catch (error) {
        if (error.message && error.message.includes('quota')) {
            console.error('❌ Gemini quota exceeded');
        } else {
            console.error('❌ Gemini error:', error.message);
        }
        throw error; // Re-throw for caller to handle
    }
}

/**
 * Check if Gemini API is available
 */
async function isGeminiAvailable() {
    if (!process.env.GEMINI_API_KEY) {
        console.log('  ⚠️ Gemini: API key missing');
        return false;
    }
    try {
        // Simple test call
        await generateGeminiResponse('Hi', '');
        return true;
    } catch (error) {
        if (error.message && error.message.includes('quota')) {
            console.log('  ⚠️ Gemini: Quota exhausted today');
        } else {
            console.log(`  ⚠️ Gemini unavailable: ${error.message}`);
        }
        return false;
    }
}

/**
 * Detect language of the message
 * @param {string} message - Customer message
 * @returns {string} - Detected language code
 */
function detectLanguage(message) {
    // Darija (Moroccan Arabic) - specific words and patterns
    const darijaPattern = /واش|كاين|بزاف|شوية|غادي|دابا|هاد|ديال|فين|علاش|كيفاش|واخا|ماشي|نقصك|بغيتي|فراسك|حنا|دارنا/i;
    
    // Modern Standard Arabic (MSA) - broader Arabic patterns
    const arabicPattern = /[\u0600-\u06FF]/;
    
    // French patterns
    const frenchPattern = /bonjour|salut|merci|oui|non|prix|livraison|commander|disponible|combien|comment|pourquoi|quand|où|je|tu|il|nous|vous|ils|s'il vous plaît|au revoir|à bientôt/i;
    
    if (darijaPattern.test(message)) {
        return 'darija';
    } else if (arabicPattern.test(message)) {
        return 'arabic';
    } else if (frenchPattern.test(message.toLowerCase())) {
        return 'french';
    } else {
        return 'english';
    }
}

/**
 * Generate response - Now uses API Manager for intelligent routing
 */
async function generateResponse(customerMessage, conversationHistory = '') {
    const { generateAIResponse } = require('./apiManager');
    return generateAIResponse(customerMessage, conversationHistory);
}

/**
 * Generate AI response using Gemini FALLBACK API (second key)
 * Uses GEMINI_API_KEY_2 as a backup
 */
async function generateGeminiResponse2(customerMessage, conversationHistory = '') {
    try {
        // Check if second key is available
        if (!ai2) {
            throw new Error('Gemini fallback API key not configured');
        }

        // Build the prompt with context
        let prompt = SYSTEM_PROMPT + '\n\n';
        
        if (conversationHistory) {
            prompt += 'Previous conversation:\n' + conversationHistory + '\n\n';
        }
        
        prompt += 'Customer message: ' + customerMessage + '\n\nYour response:';

        // Generate response with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        
        const resultPromise = ai2.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const text = result.text;

        // Clean up the response
        let cleanResponse = text.trim();
        
        // Remove any quotes if present
        if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
            cleanResponse = cleanResponse.slice(1, -1);
        }

        return cleanResponse;

    } catch (error) {
        if (error.message && error.message.includes('quota')) {
            console.error('❌ Gemini Fallback quota exceeded');
        } else {
            console.error('❌ Gemini Fallback error:', error.message);
        }
        throw error; // Re-throw for caller to handle
    }
}

/**
 * Check if Gemini Fallback is available
 */
async function isGeminiAvailable2() {
    if (!ai2) {
        console.log('  ⚠️ Gemini Fallback: API key 2 not configured');
        return false;
    }
    try {
        // Simple test call
        await generateGeminiResponse2('Hi', '');
        return true;
    } catch (error) {
        if (error.message && error.message.includes('quota')) {
            console.log('  ⚠️ Gemini Fallback: Quota exhausted today');
        } else {
            console.log(`  ⚠️ Gemini Fallback unavailable: ${error.message}`);
        }
        return false;
    }
}

/**
 * Generate AI response using Gemini FALLBACK API 3 (third key)
 * Uses GEMINI_API_KEY_3 as a tertiary backup
 */
async function generateGeminiResponse3(customerMessage, conversationHistory = '') {
    try {
        // Check if third key is available
        if (!ai3) {
            throw new Error('Gemini fallback API key 3 not configured');
        }

        // Build the prompt with context
        let prompt = SYSTEM_PROMPT + '\n\n';
        
        if (conversationHistory) {
            prompt += 'Previous conversation:\n' + conversationHistory + '\n\n';
        }
        
        prompt += 'Customer message: ' + customerMessage + '\n\nYour response:';

        // Generate response with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        
        const resultPromise = ai3.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const text = result.text;

        // Clean up the response
        let cleanResponse = text.trim();
        
        // Remove any quotes if present
        if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
            cleanResponse = cleanResponse.slice(1, -1);
        }

        return cleanResponse;

    } catch (error) {
        if (error.message && error.message.includes('quota')) {
            console.error('❌ Gemini Fallback 3 quota exceeded');
        } else {
            console.error('❌ Gemini Fallback 3 error:', error.message);
        }
        throw error; // Re-throw for caller to handle
    }
}

/**
 * Check if Gemini Fallback 3 is available
 */
async function isGeminiAvailable3() {
    if (!ai3) {
        console.log('  ⚠️ Gemini Fallback 3: API key 3 not configured');
        return false;
    }
    try {
        // Simple test call
        await generateGeminiResponse3('Hi', '');
        return true;
    } catch (error) {
        if (error.message && error.message.includes('quota')) {
            console.log('  ⚠️ Gemini Fallback 3: Quota exhausted today');
        } else {
            console.log(`  ⚠️ Gemini Fallback 3 unavailable: ${error.message}`);
        }
        return false;
    }
}

module.exports = { 
    generateResponse,
    generateGeminiResponse,
    isGeminiAvailable,
    generateGeminiResponse2,
    isGeminiAvailable2,
    generateGeminiResponse3,
    isGeminiAvailable3,
    detectLanguage
};
