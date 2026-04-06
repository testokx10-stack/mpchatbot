/**
 * Check available Groq models
 */
const Groq = require('groq-sdk').default;
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function checkModels() {
    try {
        console.log('🔍 Fetching available Groq models...\n');
        
        const models = await groq.models.list();
        
        console.log('✅ Available Groq Models:\n');
        models.data.forEach((model, index) => {
            console.log(`${index + 1}. ${model.id}`);
        });
        
        console.log('\n📋 Copy these IDs to update groq.js GROQ_MODELS array');
        
    } catch (error) {
        console.error('❌ Error fetching models:', error.message);
    }
}

checkModels();
