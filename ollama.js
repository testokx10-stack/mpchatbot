/**
 * Media Prestige WhatsApp Bot - Ollama Integration
 * Uses local Ollama (Llama 3) as primary AI for sales responses
 */

const { Ollama } = require('ollama');
const { SYSTEM_PROMPT } = require('./systemPrompt');

// Initialize Ollama client
const ollama = new Ollama({ host: 'http://localhost:11434' });

/**
 * Generate AI response using Ollama (Llama 3)
 * @param {string} customerMessage - The customer's message
 * @param {string} conversationHistory - Previous conversation context (optional)
 * @returns {Promise<string>} - AI-generated response
 */
async function generateOllamaResponse(customerMessage, conversationHistory = '') {
    try {
        // Build the messages array with conversation history
        const messages = [
            {
                role: 'system',
                content: SYSTEM_PROMPT
            }
        ];

        // Add previous conversation if available
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

        // Generate response using Ollama
        const response = await ollama.chat({
            model: 'llama2',
            messages: messages,
            stream: false,
        });

        // Extract text from response
        const responseText = response.message.content;
        
        // Clean up response
        let cleanResponse = responseText.trim();
        
        // Remove any leading/trailing quotes
        if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
            cleanResponse = cleanResponse.slice(1, -1);
        }

        return cleanResponse;

    } catch (error) {
        console.error('❌ Ollama error:', error.message);
        throw error;
    }
}

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
    try {
        // Try simple request to check availability
        const response = await ollama.list();
        if (response && response.models && response.models.length > 0) {
            console.log('  ✅ Ollama: Available with', response.models.length, 'models');
            return true;
        }
    } catch (error) {
        console.log('  ⚠️ Ollama: Not available -', error.message);
        return false;
    }
}

module.exports = { 
    generateOllamaResponse,
    isOllamaAvailable
};
