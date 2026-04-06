/**
 * Media Prestige WhatsApp Sales Agent - Response Handler
 * Supports: Arabic (Darija), French, English
 */

// Language detection patterns
const languagePatterns = {
    darija: /[\u0600-\u06FF]|واش|كاين|بزاف|شوية|غادي|دابا|هاد|ديال|فين|علاش|كيفاش|واخا|ان شاء الله|بسلامة|الحمد لله|ما شاء الله/,
    french: /bonjour|salut|merci|oui|non|prix|livraison|commander|disponible|combien|comment|pourquoi|quand|où|je|tu|il|nous|vous|ils|s'il vous plaît|au revoir|à bientôt/i,
    english: /hello|hi|hey|thanks|thank you|yes|no|price|delivery|order|available|how much|why|when|where|i|you|he|she|we|they|please|goodbye|see you/i
};

// Detect language
function detectLanguage(message) {
    const lowerMessage = message.toLowerCase();
    
    if (languagePatterns.darija.test(message)) {
        return 'darija';
    } else if (languagePatterns.french.test(lowerMessage)) {
        return 'french';
    } else {
        return 'english';
    }
}

// Response templates by language
const responses = {
    // GREETINGS
    greeting: {
        darija: 'مرحبا بيك فـ Media Prestige! 😊 كيفاش نقدر نعاونك؟',
        french: 'Bonjour! Bienvenue chez Media Prestige! 😊 Comment puis-je vous aider?',
        english: 'Hello! Welcome to Media Prestige! 😊 How can I help you?'
    },

    // PRICE QUESTIONS
    price: {
        darija: 'السعر هو [PRICE] درهم 😊 واش تحب تطلب دابا؟',
        french: 'Le prix est [PRICE] MAD 😊 Vous voulez commander maintenant?',
        english: 'The price is [PRICE] MAD 😊 Would you like to order now?'
    },

    // DELIVERY QUESTIONS
    delivery: {
        darija: 'نعم كاين التوصيل لجميع المدن فالمغرب 🇲🇦 فـ 2 حتى 4 أيام، واش نبداو الطلب ديالك؟',
        french: 'Oui livraison partout au Maroc 🇲🇦 en 2 à 4 jours 😊 Vous voulez commander?',
        english: 'Yes, we deliver all over Morocco 🇲🇦 in 2-4 days 😊 Do you want to place your order?'
    },

    // AVAILABILITY QUESTIONS
    available: {
        darija: 'نعم المنتج متوفر! 🎉 واش تحب تطلبو دابا؟',
        french: 'Oui le produit est disponible! 🎉 Vous voulez le commander maintenant?',
        english: 'Yes, the product is available! 🎉 Do you want to order it now?'
    },

    // HOW TO ORDER
    howToOrder: {
        daringa: 'الطلب سهل! غير قول ليا: الاسم، رقم التيليفون، والمدينة 📝 و أنا نتكلف بالباقي!',
        french: 'Commander est facile! Dites-moi juste: votre nom, numéro de téléphone, et ville 📝 Je m\'occupe du reste!',
        english: 'Ordering is easy! Just tell me: your name, phone number, and city 📝 I\'ll take care of the rest!'
    },

    // ORDER CONFIRMATION
    orderConfirm: {
        darija: 'تم الطلب بنجاح! ✅ شكرا ليك على ثقتك فينا. تابع رسائلك على WhatsApp للتفاصيل التانية! 🙏',
        french: 'Commande confirmée! ✅ Merci de votre confiance. Suivez le lien WhatsApp pour tous les détails! 🙏',
        english: 'Order confirmed! ✅ Thank you for your trust. Follow the WhatsApp link for all details! 🙏'
    },

    // HESITATION - REASSURE
    hesitate: {
        darija: 'لا تتردد! 🌟 منتجاتنا عالية الجودة و التوصيل سريع. واش نقدر نعاونك فـ شي حاجة أخرى؟',
        french: 'N\'hésitez pas! 🌟 Nos produits sont de haute qualité et la livraison est rapide. Puis-je vous aider avec autre chose?',
        english: 'Don\'t hesitate! 🌟 Our products are high quality and delivery is fast. Can I help you with anything else?'
    },

    // THANK YOU
    thanks: {
        darija: 'الشكر ليك! 😊 إذا احتجت أي حاجة، أنا هنا. واش تحب تشوف منتجات أخرى؟',
        french: 'Merci à vous! 😊 Si vous avez besoin de quoi que ce soit, je suis là. Vous voulez voir d\'autres produits?',
        english: 'Thank you! 😊 If you need anything, I\'m here. Would you like to see other products?'
    },

    // GOODBYE
    goodbye: {
        darija: 'بالسلامة! 👋 ت鳤ا معاك، إذا احتجت أي حاجة رجع لعندنا!',
        french: 'Au revoir! 👋 Ça a été un plaisir, revenez quand vous voulez!',
        english: 'Goodbye! 👋 It was a pleasure, come back anytime!'
    },

    // PRODUCT INTEREST
    productInterest: {
        darija: 'هاد المنتج رائع! 🌟 كيجيب نتيجة ممتازة. واش تحب تطلبو دابا؟',
        french: 'Ce produit est excellent! 🌟 Il donne d\'excellents résultats. Vous voulez le commander maintenant?',
        english: 'This product is excellent! 🌟 It delivers great results. Do you want to order it now?'
    },

    // UNCLEAR MESSAGE
    unclear: {
        darija: 'عفاك شنو كتدور عليه؟ 😊 نقدر نعاونك تلقى اللي بغيتي!',
        french: 'Que cherchez-vous? 😊 Je peux vous aider à trouver ce que vous voulez!',
        english: 'What are you looking for? 😊 I can help you find what you need!'
    },

    // WEBSITE LINK
    website: {
        darija: 'زور موقعنا: https://media-prestige.com/ 🌐 تقدر تشوف جميع منتجاتنا!',
        french: 'Visitez notre site: https://media-prestige.com/ 🌐 Vous pouvez voir tous nos produits!',
        english: 'Visit our website: https://media-prestige.com/ 🌐 You can see all our products!'
    }
};

// Keywords for matching
const keywords = {
    greeting: ['hello', 'hi', 'hey', 'bonjour', 'salut', 'مرحبا', 'السلام', 'سلام', 'هاي'],
    price: ['price', 'prix', 'سعر', 'ثمن', 'كم', 'how much', 'combien'],
    delivery: ['delivery', 'livraison', 'توصيل', '.delivery', 'livraison?', 'توصيل؟'],
    available: ['available', 'disponible', 'متوفر', 'كاين', 'available?'],
    howToOrder: ['how to order', 'comment commander', 'كيفاش نطلب', 'commander', 'طلب'],
    thanks: ['thank', 'merci', 'شكرا', 'شكور', 'thanks'],
    goodbye: ['bye', 'goodbye', 'au revoir', 'بسلامة', 'سلام', 'مع السلامة'],
    website: ['website', 'site', 'موقع', 'لينك', 'link']
};

// Main response function
function getResponse(message) {
    const lowerMessage = message.toLowerCase();
    const language = detectLanguage(message);

    // Check for greetings
    if (keywords.greeting.some(word => lowerMessage.includes(word))) {
        return responses.greeting[language];
    }

    // Check for price questions
    if (keywords.price.some(word => lowerMessage.includes(word))) {
        return responses.price[language];
    }

    // Check for delivery questions
    if (keywords.delivery.some(word => lowerMessage.includes(word))) {
        return responses.delivery[language];
    }

    // Check for availability questions
    if (keywords.available.some(word => lowerMessage.includes(word))) {
        return responses.available[language];
    }

    // Check for how to order
    if (keywords.howToOrder.some(word => lowerMessage.includes(word))) {
        return responses.howToOrder[language];
    }

    // Check for thanks
    if (keywords.thanks.some(word => lowerMessage.includes(word))) {
        return responses.thanks[language];
    }

    // Check for goodbye
    if (keywords.goodbye.some(word => lowerMessage.includes(word))) {
        return responses.goodbye[language];
    }

    // Check for website request
    if (keywords.website.some(word => lowerMessage.includes(word))) {
        return responses.website[language];
    }

    // Default response for unclear messages
    return responses.unclear[language];
}

module.exports = { getResponse, detectLanguage };
