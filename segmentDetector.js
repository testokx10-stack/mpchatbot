/**
 * Segment Detector - Analyzes customer messages to determine product segment
 * Uses chatbotData to make smart recommendations
 */

const { getProductDetails } = require('./productsDatabase');

const chatbotData = {
  residential: {
    keywords: ['maison', 'home', 'salon', 'tv', 'cinema', 'film', 'musique', 'appartement', 'villa', 'domicile', 'séjour', 'lounge', 'maison', 'résidentiel', 'cubes', 'cube', 'caissons', 'subwoofer', 'caisson de basse', 'enceinte', 'enceintes', 'haut parleur', 'enceinte satellite'],
    features: 'son immersif, design elegant, contrôle par app',
    useCase: 'regarder des films, écouter de la musique',
    products: ['Acoustimass', 'Acoustimass 3', 'Caisson de Bass Flush', 'Smart Ultra Caisson 700', 'Smart Soundbar', 'Smart Ultra Soundbar'],
  },
  professional: {
    keywords: ['restaurant', 'hôtel', 'boutique', 'café', 'bureau', 'commercial', 'magasin', 'professionnel', 'entreprise', 'établissement', 'bar', 'disco', 'pro', 'professionnel', 'professionelle', 'professionel'],
    features: 'installation discrète, contrôle multizone, durabilité',
    useCase: 'ambiance musicale, fond sonore',
    products: ['DM2C Encastrable', 'DM3 Flush', 'Amplificateur Professionnel'],
  },
  portable: {
    keywords: ['événement', 'dj', 'concert', 'fête', 'festival', 'musicien', 'spectacle', 'mariage', 'soirée', 'performance', 'live', 'batterie', 'event', 'événement'],
    features: 'portable, batterie 8h, son professionnel, puissance 1000W+',
    useCase: 'concerts, événements, performances live',
    products: ['L1 PRO 16', 'L1 PRO 8'],
  },
};

const faqDatabase = [
  {
    keywords: ['garantie', 'warranty'],
    answerFr: 'Tous nos produits Bose bénéficient d\'une garantie constructeur de 2 ans + protection étendue disponible.',
    answerEn: 'All our Bose products include a 2-year manufacturer\'s warranty + extended protection available.',
  },
  {
    keywords: ['installation', 'install'],
    answerFr: 'Oui, notre équipe d\'installateurs certifiés peut gérer l\'installation complète. Devis gratuit sur demande.',
    answerEn: 'Yes, our certified installation team can handle complete setup. Free quote on request.',
  },
  {
    keywords: ['financement', 'paiement', 'crédit', 'financing', 'payment'],
    answerFr: 'Oui, nous offrons des plans de financement flexibles. Détails disponibles après consultation.',
    answerEn: 'Yes, we offer flexible financing plans. Details available after consultation.',
  },
  {
    keywords: ['délai', 'livraison', 'delivery', 'shipping'],
    answerFr: 'Livraison en 48h à Casablanca et partout au Maroc! 🚚',
    answerEn: 'Delivery in 48h in Casablanca and all over Morocco! 🚚',
  },
  {
    keywords: ['support', 'aide', 'help', 'assistance'],
    answerFr: 'Support technique 24/7 WhatsApp, email et téléphone. Assistance installation incluse.',
    answerEn: '24/7 technical support via WhatsApp, email and phone. Installation assistance included.',
  },
  {
    keywords: ['numéro', 'num', 'contact', 'téléphone', 'phone', 'whatsapp', 'number', 'numero'],
    answerFr: '📱 Équipe ventes: +212 6 00 051 612 - Contactez-nous directement via WhatsApp pour une réponse immédiate!',
    answerEn: '📱 Sales team: +212 6 00 051 612 - Contact us directly via WhatsApp for an immediate response!'
  },
  {
    keywords: ['site', 'site web', 'website', 'web', 'internet', 'site internet'],
    answerFr: '🌐 Notre site web: https://media-prestige.com/\n\nVous y trouverez tous nos produits et services!',
    answerEn: '🌐 Our website: https://media-prestige.com/\n\nYou will find all our products and services there!',
  },
];

/**
 * Detect customer segment based on message content
 * @param {string} message - Customer message
 * @returns {string} - Segment: 'residential', 'professional', or 'portable'
 */
function detectSegment(message) {
  const lowerMessage = message.toLowerCase();
  
  // Count keyword matches for each segment
  const scores = {
    residential: 0,
    professional: 0,
    portable: 0,
  };

  // Score each segment based on keyword matches
  Object.entries(chatbotData).forEach(([segment, data]) => {
    data.keywords.forEach(keyword => {
      // Use word boundary for short keywords (<=4 chars) to avoid false matches
      if (keyword.length <= 4) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(message)) {
          scores[segment]++;
        }
      } else {
        // For longer keywords, use simple includes (more flexible)
        if (lowerMessage.includes(keyword)) {
          scores[segment]++;
        }
      }
    });
  });

  // Return segment with highest score, default to residential
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'residential'; // Default segment
  
  for (const [segment, score] of Object.entries(scores)) {
    if (score === maxScore) return segment;
  }
}

/**
 * Get product recommendation for a segment
 * @param {string} segment - 'residential', 'professional', or 'portable'
 * @returns {object} - Recommendation object with products, features, and images
 */
function getSegmentRecommendation(segment) {
  const data = chatbotData[segment] || chatbotData.residential;
  
  // Get ALL products in this segment (not just the first one)
  const allProducts = data.products.map(name => {
    const details = getProductDetails(name);
    return {
      name,
      details,
      image: details ? details.image : null
    };
  });
  
  // Return all products - let the AI choose based on conversation context
  return {
    segment,
    allProducts: allProducts,
    productNames: data.products,  // Simple array of product names
    features: data.features,
    useCase: data.useCase,
  };
}

/**
 * Check if message contains FAQ keywords and return answer
 * @param {string} message - Customer message
 * @param {string} language - 'fr' or 'en'
 * @returns {string|null} - FAQ answer if found, null otherwise
 */
function checkFAQ(message, language = 'fr') {
  const lowerMessage = message.toLowerCase();
  
  for (const faq of faqDatabase) {
    for (const keyword of faq.keywords) {
      if (lowerMessage.includes(keyword)) {
        return language === 'fr' ? faq.answerFr : faq.answerEn;
      }
    }
  }
  
  return null;
}

/**
 * Detect language from message content
 * @param {string} message - Customer message
 * @returns {string} - 'fr', 'en', 'ar', or 'darija'
 */
function detectLanguage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check for French indicators
  if (/\b(bonjour|salut|oui|non|merci|s'il vous plaît|chez|maison)\b/i.test(message)) {
    return 'fr';
  }
  
  // Check for Darija (Moroccan Arabic) - specific words
  if (/\b(واش|كاين|بزاف|تمام|هنا|ركشي|قالع)\b/.test(message)) {
    return 'darija';
  }
  
  // Check for Modern Standard Arabic script
  if (/[\u0600-\u06FF]/.test(message)) {
    return 'ar';
  }
  
  // Check for English indicators
  if (/\b(hello|hi|yes|no|thank|please|home|event|restaurant)\b/i.test(message)) {
    return 'en';
  }
  
  // Default to French
  return 'fr';
}

/**
 * Build smart context for Gemini based on segment
 * @param {string} segment - Customer segment
 * @param {string} message - Customer message
 * @returns {string} - Context hint for AI
 */
function buildSegmentContext(segment, message) {
  const recommendation = getSegmentRecommendation(segment);
  const language = detectLanguage(message);
  
  let context = `[SEGMENT: ${segment}]\n`;
  context += `[DETECTED LANGUAGE: ${language}]\n`;
  context += `[AVAILABLE PRODUCTS: ${recommendation.productNames.join(', ')}]\n`;
  context += `[KEY FEATURES: ${recommendation.features}]\n`;
  context += `[USE CASE: ${recommendation.useCase}]\n`;
  context += `[INSTRUCTION: Choose ONE or TWO products max from the available list based on customer's specific needs. For portable: L1 PRO 8 for small events (0-100 people), L1 PRO 16 for medium-large events (100+ people). For residential: Smart Soundbar for budget TV setup, Smart Ultra Soundbar for premium home cinema, Acoustimass (cubes/speakers 900 DH) for surround sound satellites, Acoustimass 3 (subwoofer 3900 DH) for bass/subwoofer needs. When customer mentions "cube", "enceinte", or "haut parleur" → recommend Acoustimass (cubes). When they mention "caisson", "subwoofer", or "basse" → recommend Acoustimass 3 (subwoofer). For professional: DM2C for small spaces, DM3 Flush for medium, Amplificateur for large installations.]`;
  
  return context;
}

/**
 * Track conversation stage based on keywords
 * @param {string} message - Customer message
 * @returns {string} - Stage: 'initial', 'qualification', 'recommendation', 'negotiation', 'closing'
 */
function detectConversationStage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Closing indicators
  if (/\b(oui|yes|confirme|d'accord|c'est bon|on y va|allons-y|parfait)\b/i.test(lowerMessage)) {
    return 'closing';
  }
  
  // Negotiation indicators (price, terms, options)
  if (/\b(prix|price|coût|cost|financement|payment|délai|timeline|options|modèles)\b/i.test(lowerMessage)) {
    return 'negotiation';
  }
  
  // Recommendation indicators (asking about specific products)
  if (/\b(quel|which|meilleur|best|recommande|suggest|pour|for)\b/i.test(lowerMessage)) {
    return 'recommendation';
  }
  
  // Qualification indicators (needs, use case)
  if (/\b(besoin|need|utiliser|use|cherche|looking|pour qui|who|où|where)\b/i.test(lowerMessage)) {
    return 'qualification';
  }
  
  // Default to initial
  return 'initial';
}

module.exports = {
  detectSegment,
  getSegmentRecommendation,
  checkFAQ,
  detectLanguage,
  buildSegmentContext,
  detectConversationStage,
  chatbotData,
  faqDatabase,
};
