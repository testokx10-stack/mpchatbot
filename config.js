/**
 * Media Prestige WhatsApp Bot - Configuration
 */

module.exports = {
    // Bot Information
    bot: {
        name: 'Media Prestige Sales Agent',
        version: '1.0.0'
    },

    // Store Information
    store: {
        name: 'Media Prestige',
        website: 'https://media-prestige.com/',
        deliveryTime: '2-4 days',
        deliveryArea: 'All over Morocco 🇲🇦'
    },

    // Business Hours (optional - for future use)
    businessHours: {
        enabled: false,
        timezone: 'Africa/Casablanca',
        open: '09:00',
        close: '21:00'
    },

    // Auto-reply settings
    autoReply: {
        enabled: true,
        delay: 1000 // milliseconds before sending reply
    },

    // Logging
    logging: {
        enabled: true,
        logMessages: true,
        logResponses: true
    }
};
