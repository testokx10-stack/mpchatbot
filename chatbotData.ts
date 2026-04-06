/**
 * Chatbot Product Database
 * Used for WhatsApp lead generation
 * Structured by segment with detailed descriptions for conversational AI
 */

export interface ProductSegmentData {
  id: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  targetCustomersFr: string[];
  targetCustomersEn: string[];
  productTypeFr: string[];
  productTypeEn: string[];
  keyFeaturesFr: string[];
  keyFeaturesEn: string[];
  priceRangeFr: string;
  priceRangeEn: string;
  useCasesFr: string[];
  useCasesEn: string[];
  ctaMessageFr: string;
  ctaMessageEn: string;
}

export const chatbotProductData: ProductSegmentData[] = [
  {
    id: 'residential',
    nameFr: 'RÉSIDENTIEL',
    nameEn: 'RESIDENTIAL',
    descriptionFr: 'Solutions audio premium pour votre domicile. Transformez votre salon en expérience cinéma avec nos systèmes de sonorisation haute fidélité.',
    descriptionEn: 'Premium audio solutions for your home. Transform your living room into a cinema experience with our high-fidelity sound systems.',
    targetCustomersFr: [
      'Particuliers',
      'Propriétaires de villas',
      'Appartements haut standing',
      'Amateurs d\'audiophilie',
      'Cinéphiles'
    ],
    targetCustomersEn: [
      'Individuals',
      'Villa owners',
      'Upscale apartments',
      'Audiophile enthusiasts',
      'Movie lovers'
    ],
    productTypeFr: [
      'Soundbars',
      'Systèmes home cinéma',
      'Caissons de basses',
      'Enceintes sans fil',
      'Systèmes multiroom'
    ],
    productTypeEn: [
      'Soundbars',
      'Home theater systems',
      'Subwoofers',
      'Wireless speakers',
      'Multiroom systems'
    ],
    keyFeaturesFr: [
      'Dolby Atmos 3D immersive',
      'Connectivité WiFi/Bluetooth multi-appareil',
      'Design élégant intégrable',
      'Technologie basse profonde',
      'Qualité audio studio'
    ],
    keyFeaturesEn: [
      '3D immersive Dolby Atmos',
      'Multi-device WiFi/Bluetooth connectivity',
      'Elegant integrated design',
      'Deep bass technology',
      'Studio-quality audio'
    ],
    priceRangeFr: 'Sur devis',
    priceRangeEn: 'On request',
    useCasesFr: [
      'Regarder des films en immersion',
      'Écouter de la musique en streaming',
      'Jeux vidéo haute performance',
      'Soirées entre amis',
      'Télévision 4K',
      'Musique multiroom'
    ],
    useCasesEn: [
      'Watch movies in immersion',
      'Stream music',
      'High-performance gaming',
      'Entertaining guests',
      '4K television',
      'Multiroom music'
    ],
    ctaMessageFr: 'Vous cherchez à améliorer votre expérience audio maison ? Je peux vous recommander le système parfait !',
    ctaMessageEn: 'Looking to upgrade your home audio experience? I can recommend the perfect system for you!'
  },
  {
    id: 'professional',
    nameFr: 'PROFESSIONNEL',
    nameEn: 'PROFESSIONAL',
    descriptionFr: 'Solutions audio professionnelles pour établissements commerciaux. Enceintes encastrables, amplificateurs puissants, systèmes de zone pour restaurants, hôtels, bureaux et commerces.',
    descriptionEn: 'Professional audio solutions for commercial establishments. In-wall speakers, powerful amplifiers, zone systems for restaurants, hotels, offices and retail.',
    targetCustomersFr: [
      'Restaurateurs',
      'Hôteliers',
      'Directeurs de boutique',
      'Espaces de travail',
      'Événementiel',
      'Architectes d\'intérieur',
      'Intégrateurs audiovisuels'
    ],
    targetCustomersEn: [
      'Restaurant owners',
      'Hotel managers',
      'Retail managers',
      'Workspace managers',
      'Event organizers',
      'Interior designers',
      'AV integrators'
    ],
    productTypeFr: [
      'Enceintes encastrables',
      'Haut-parleurs zonés',
      'Amplificateurs professionnels',
      'Systèmes de conférence',
      'Contrôleurs audio',
      'Haut-parleurs muraux'
    ],
    productTypeEn: [
      'In-wall speakers',
      'Zoned speakers',
      'Professional amplifiers',
      'Conference systems',
      'Audio controllers',
      'Wall-mounted speakers'
    ],
    keyFeaturesFr: [
      'Installation discrète intégrée',
      'Contrôle multizone indépendant',
      'Durabilité professionnelle',
      'Distribution audio flexible',
      'Intégration système intelligente',
      'Gestion sonore ambiance'
    ],
    keyFeaturesEn: [
      'Discreet integrated installation',
      'Independent multizone control',
      'Professional durability',
      'Flexible audio distribution',
      'Smart system integration',
      'Ambient sound management'
    ],
    priceRangeFr: 'Sur devis',
    priceRangeEn: 'On request',
    useCasesFr: [
      'Ambiance musicale restaurant/bar',
      'Fond sonore hôtel/lobby',
      'Classe/formation musique',
      'Réunions/conférences',
      'Retail: musique d\'ambiance',
      'Branding sonore établissement'
    ],
    useCasesEn: [
      'Restaurant/bar background music',
      'Hotel/lobby ambient sound',
      'Classroom/training music',
      'Meetings/conferences',
      'Retail ambient music',
      'Venue sound branding'
    ],
    ctaMessageFr: 'Vous avez un restaurant, hôtel ou boutique ? Découvrez comment améliorer l\'expérience client avec l\'audio professionnel !',
    ctaMessageEn: 'Do you own a restaurant, hotel or retail space? Discover how to enhance customer experience with professional audio!'
  },
  {
    id: 'portable',
    nameFr: 'PORTABLE & DJ',
    nameEn: 'PORTABLE & DJ',
    descriptionFr: 'Systèmes audio portables haute performance pour musiciens, DJ et événementiel. Puissance professionnelle, portabilité maximale, qualité sonore exceptionnelle.',
    descriptionEn: 'High-performance portable audio systems for musicians, DJs and event professionals. Professional power, maximum portability, exceptional sound quality.',
    targetCustomersFr: [
      'Musiciens professionnels',
      'DJ',
      'Organisateurs d\'événements',
      'Producteurs de spectacles',
      'Formateurs',
      'Animateurs d\'événements',
      'Artistes en tournée'
    ],
    targetCustomersEn: [
      'Professional musicians',
      'DJs',
      'Event organizers',
      'Show producers',
      'Trainers',
      'Event hosts',
      'Touring artists'
    ],
    productTypeFr: [
      'Systèmes portables L1 Pro',
      'Enceintes actives',
      'Contrôleurs DJ',
      'Microphones sans fil',
      'Tables de mixage',
      'Équipement DJ'
    ],
    productTypeEn: [
      'L1 Pro portable systems',
      'Active speakers',
      'DJ controllers',
      'Wireless microphones',
      'Mixing consoles',
      'DJ equipment'
    ],
    keyFeaturesFr: [
      'Puissance 1000W+',
      'Qualité studio portable',
      'Montage rapide 15 min',
      'Couverture 360°',
      'Robustesse extrême',
      'Batterie longue autonomie'
    ],
    keyFeaturesEn: [
      '1000W+ power',
      'Portable studio quality',
      'Quick 15min setup',
      '360° coverage',
      'Extreme durability',
      'Long battery life'
    ],
    priceRangeFr: 'Sur devis',
    priceRangeEn: 'On request',
    useCasesFr: [
      'Concerts/performances live',
      'Festivales musicaux',
      'Soirées/événements privés',
      'Formations/présentations',
      'Rue/busking',
      'Mariage/célébration'
    ],
    useCasesEn: [
      'Live concerts/performances',
      'Music festivals',
      'Private parties/events',
      'Training/presentations',
      'Street/busking',
      'Weddings/celebrations'
    ],
    ctaMessageFr: 'Vous êtes musicien, DJ ou organisateur ? Besoin d\'une sonorisation puissante et mobile ? Je peux vous proposer LA solution !',
    ctaMessageEn: 'Are you a musician, DJ or event organizer? Need powerful portable sound? I can suggest THE perfect solution for you!'
  }
];

/**
 * Lead Generation Templates
 * Conversation starters and responses for chatbot
 */
export const chatbotTemplates = {
  greetingFr: 'Bienvenue chez MediaPrestige 🎵 Comment puis-je vous aider aujourd\'hui ? Cherchez-vous une solution audio pour votre maison, établissement ou événement ?',
  greetingEn: 'Welcome to MediaPrestige 🎵 How can I help you today? Are you looking for an audio solution for your home, business or event?',
  
  qualificationFr: [
    'C\'est pour un usage personnel/maison ou professionnel ?',
    'Quel est votre budget approximate ?',
    'Quelle est la taille de votre espace ?',
    'Avez-vous un délai pour l\'installation ?',
  ],
  qualificationEn: [
    'Is this for personal/home use or professional use?',
    'What is your approximate budget?',
    'What is the size of your space?',
    'Do you have a timeline for installation?',
  ],

  recommendationFr: 'Basé sur vos besoins, je recommande notre solution {segment}. Elle offre {features} parfait pour {useCase}',
  recommendationEn: 'Based on your needs, I recommend our {segment} solution. It offers {features} perfect for {useCase}',

  ctaFr: 'Souhaitez-vous une démonstration gratuite ou un devis personnalisé ? Je peux préparer une proposition en fonction de vos spécifications !',
  ctaEn: 'Would you like a free demo or personalized quote? I can prepare a proposal based on your specifications!',

  followUpFr: 'Des questions supplémentaires sur les produits, l\'installation ou le financement ?',
  followUpEn: 'Any other questions about products, installation or financing?',

  closingFr: 'Parfait ! Cliquez sur le lien WhatsApp ci-dessous pour finaliser votre commande directement avec notre équipe. 🔗',
  closingEn: 'Perfect! Click the WhatsApp link below to finalize your order directly with our team. 🔗',
};

/**
 * Common Questions & Answers
 * Used for FAQ chatbot responses
 */
export const chatbotFAQ = [
  {
    questionFr: 'Quelle est la garantie ?',
    questionEn: 'What is the warranty?',
    answerFr: 'Tous nos produits Bose bénéficient d\'une garantie constructeur de 2 ans + protection étendue disponible.',
    answerEn: 'All our Bose products include a 2-year manufacturer\'s warranty + extended protection available.',
  },
  {
    questionFr: 'Faites-vous l\'installation ?',
    questionEn: 'Do you provide installation?',
    answerFr: 'Oui, notre équipe d\'installateurs certifiés peut gérer l\'installation complète. Devis gratuit sur demande.',
    answerEn: 'Yes, our certified installation team can handle complete setup. Free quote on request.',
  },
  {
    questionFr: 'Proposez-vous un financement ?',
    questionEn: 'Do you offer financing?',
    answerFr: 'Oui, nous offrons des plans de financement flexibles. Détails disponibles après consultation.',
    answerEn: 'Yes, we offer flexible financing plans. Details available after consultation.',
  },
  {
    questionFr: 'Quel est le délai de livraison ?',
    questionEn: 'What is the delivery time?',
    answerFr: 'Livraison en 48h à Casablanca et 48h partout au Maroc! 🚚',
    answerEn: 'Delivery in 48h in Casablanca and 48h all over Morocco! 🚚',
  },
  {
    questionFr: 'Comment fonctionne le support ?',
    questionEn: 'How does support work?',
    answerFr: 'Support technique 24/7 WhatsApp, email et téléphone. Assistance installation incluse.',
    answerEn: '24/7 technical support via WhatsApp, email and phone. Installation assistance included.',
  },
];

/**
 * Sales Funnel Stages
 * Track conversation progress for better lead management
 */
export enum ConversationStage {
  INITIAL = 'initial',           // First contact
  QUALIFICATION = 'qualification', // Understanding needs
  RECOMMENDATION = 'recommendation', // Product suggestion
  NEGOTIATION = 'negotiation',   // Price/terms discussion
  CLOSING = 'closing',           // Ready to buy
  POST_SALE = 'post_sale',       // After purchase
}

/**
 * Lead Object Structure
 * For tracking chatbot conversations
 */
export interface ChatbotLead {
  id?: string;
  phoneNumber: string;
  nameFr?: string;
  nameEn?: string;
  segment?: 'residential' | 'professional' | 'portable';
  stage: ConversationStage;
  budget?: string;
  spaceSize?: string;
  timeline?: string;
  interestedProducts?: string[];
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  language: 'fr' | 'en';
}
