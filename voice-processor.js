/**
 * Media Prestige WhatsApp Bot - Voice Processing (STT + TTS)
 * Uses Groq Whisper for speech-to-text and Orpheus for text-to-speech
 */

const Groq = require('groq-sdk').default;
const fs = require('fs');
const path = require('path');

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const groq2 = new Groq({
    apiKey: process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY
});

// Orpheus TTS models
const TTS_MODELS = {
    english: 'canopylabs/orpheus-v1-english',
    arabic: 'canopylabs/orpheus-arabic-saudi'
};

// Available voices
const TTS_VOICES = {
    english: ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'],
    arabic: ['abdullah', 'fahad', 'sultan', 'lulwa', 'noura', 'aisha']
};

/**
 * Convert speech to text using Groq Whisper
 * @param {Buffer|string} audioBuffer - Audio file buffer or path
 * @returns {Promise<string>} - Transcribed text
 */
async function speechToText(audioBuffer) {
    try {
        console.log('🎤 Converting speech to text (Groq Whisper)...');
        
        let audioData;
        
        // Handle both buffer and file path
        if (Buffer.isBuffer(audioBuffer)) {
            audioData = audioBuffer; // Pass buffer directly
        } else if (typeof audioBuffer === 'string') {
            // It's a file path
            if (fs.existsSync(audioBuffer)) {
                audioData = fs.readFileSync(audioBuffer);
            } else {
                throw new Error(`Audio file not found: ${audioBuffer}`);
            }
        } else {
            throw new Error('Invalid audio data');
        }
        
        // Try primary Groq API first
        let result = await transcribeWithClient(groq, audioData);
        
        if (!result) {
            // Try secondary API
            console.log('🔄 Primary Groq failed, trying secondary...');
            result = await transcribeWithClient(groq2, audioData);
        }
        
        if (result) {
            console.log(`✅ STT Success: "${result}"`);
            return result;
        }
        
        throw new Error('All transcription attempts failed');
        
    } catch (error) {
        console.error('❌ STT Error:', error.message);
        return null;
    }
}

async function transcribeWithClient(client, audioBuffer) {
    try {
        // Create a temporary file for the audio (required by Groq SDK for transcriptions)
        const tempFile = path.join(__dirname, `temp_audio_${Date.now()}.ogg`);
        
        // Write the buffer to a temp file
        fs.writeFileSync(tempFile, audioBuffer);
        
        const response = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempFile),
            model: 'whisper-large-v3',
            response_format: 'json',
            language: 'fr' // Default to French for Moroccan market, or 'ar' for Arabic
        });
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        return response.text || null;
    } catch (error) {
        console.log(`⚠️ Transcription failed: ${error.message}`);
        return null;
    }
}

/**
 * Convert text to speech using Groq Orpheus
 * @param {string} text - Text to convert to speech
 * @param {string} language - 'english' or 'arabic'
 * @param {string} voice - Voice ID (optional, will use default)
 * @returns {Promise<Buffer>} - Audio buffer (WAV format)
 */
async function textToSpeech(text, language = 'english', voice = null) {
    try {
        console.log(`🔊 Converting text to speech (Groq Orpheus, ${language})...`);
        
        // Truncate text to 200 characters (Orpheus limit)
        const truncatedText = text.length > 200 ? text.substring(0, 197) + '...' : text;
        
        const model = TTS_MODELS[language] || TTS_MODELS.english;
        const voices = TTS_VOICES[language] || TTS_VOICES.english;
        
        // Use provided voice or default
        const selectedVoice = voice && voices.includes(voice) ? voice : voices[0];
        
        // Try primary Groq API first
        let audioBuffer = await synthesizeWithClient(groq, model, truncatedText, selectedVoice);
        
        if (!audioBuffer) {
            // Try secondary API
            console.log('🔄 Primary Groq TTS failed, trying secondary...');
            audioBuffer = await synthesizeWithClient(groq2, model, truncatedText, selectedVoice);
        }
        
        if (audioBuffer) {
            console.log(`✅ TTS Success: ${audioBuffer.length} bytes`);
            return audioBuffer;
        }
        
        throw new Error('All TTS attempts failed');
        
    } catch (error) {
        console.error('❌ TTS Error:', error.message);
        return null;
    }
}

async function synthesizeWithClient(client, model, text, voice) {
    try {
        // Use direct API call instead of SDK method for better control
        const apiKey = client.apiKey;
        
        const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                input: text,
                voice: voice,
                response_format: 'wav'
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`TTS API error: ${error}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer;
    } catch (error) {
        console.log(`⚠️ TTS synthesis failed: ${error.message}`);
        return null;
    }
}

/**
 * Process voice message: STT -> AI response -> TTS
 * @param {Buffer} audioBuffer - Incoming audio
 * @param {function} generateResponse - Function to generate AI response
 * @param {string} language - Language for TTS
 * @returns {Promise<{transcribedText: string, audioResponse: Buffer}>}
 */
async function processVoiceMessage(audioBuffer, generateResponse, language = 'english') {
    try {
        // Step 1: Speech to Text
        const transcribedText = await speechToText(audioBuffer);
        if (!transcribedText) {
            throw new Error('Speech to text failed');
        }
        
        console.log(`📝 Transcribed: "${transcribedText}"`);
        
        // Step 2: Generate AI response
        const aiResponse = await generateResponse(transcribedText);
        if (!aiResponse) {
            throw new Error('AI response generation failed');
        }
        
        console.log(`🤖 AI Response: "${aiResponse}"`);
        
        // Step 3: Text to Speech
        const audioResponse = await textToSpeech(aiResponse, language);
        if (!audioResponse) {
            throw new Error('Text to speech failed');
        }
        
        return {
            transcribedText,
            audioResponse
        };
        
    } catch (error) {
        console.error('❌ Voice processing error:', error.message);
        return null;
    }
}

/**
 * Check if Groq voice services are available
 */
async function isVoiceServiceAvailable() {
    if (!process.env.GROQ_API_KEY) {
        console.log('  ⚠️ Groq: API key missing');
        return false;
    }
    return true;
}

/**
 * Get available TTS voices for a language
 */
function getAvailableVoices(language = 'english') {
    return TTS_VOICES[language] || TTS_VOICES.english;
}

module.exports = {
    speechToText,
    textToSpeech,
    processVoiceMessage,
    isVoiceServiceAvailable,
    getAvailableVoices,
    TTS_MODELS,
    TTS_VOICES
};