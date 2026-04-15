/**
 * Products Database with Images
 * Maps product names to their details and image files
 */

const path = require('path');

const productsDatabase = {
  // Residential Products
  'Smart Soundbar': {
    nameFr: 'Smart Soundbar',
    nameEn: 'Smart Soundbar',
    image: path.join(__dirname, 'public', 'Smart Sound Bar.webp'),
    segment: 'residential',
    descriptionFr: 'Soundbar intelligente avec son immersif et connectivité WiFi',
    descriptionEn: 'Smart soundbar with immersive sound and WiFi connectivity',
    priceFr: 'Sur devis',
    priceEn: 'On request',
  },
  'Smart Ultra Soundbar': {
    nameFr: 'Smart Ultra Soundbar',
    nameEn: 'Smart Ultra Soundbar',
    image: path.join(__dirname, 'public', 'Smart Ultra Soundbar.webp'),
    segment: 'residential',
    descriptionFr: 'Soundbar premium avec Dolby Atmos 3D',
    descriptionEn: 'Premium soundbar with 3D Dolby Atmos',
    priceFr: 'Sur devis',
    priceEn: 'On request',
  },
  'Acoustimass': {
    nameFr: 'Acoustimass Series 3 Haut-parleur',
    nameEn: 'Acoustimass Series 3 Speaker',
    image: path.join(__dirname, 'public', 'cube.webp'),
    segment: 'residential',
    descriptionFr: 'Enceintes satellites cubes Acoustimass Series 3 pour système surround',
    descriptionEn: 'Acoustimass Series 3 cube satellite speakers for surround system',
    priceFr: '900 DH TTC',
    priceEn: '900 DH TTC',
  },
  'Acoustimass 3': {
    nameFr: 'Acoustimass 3',
    nameEn: 'Acoustimass 3',
    image: path.join(__dirname, 'public', 'Acoustimass3.webp'),
    segment: 'residential',
    descriptionFr: 'Caisson de basses Acoustimass 3 pour son surround',
    descriptionEn: 'Acoustimass 3 subwoofer for surround sound',
    priceFr: '3900 DH TTC',
    priceEn: '3900 DH TTC',
  },
  'Smart Ultra Caisson 700': {
    nameFr: 'Smart Ultra Caisson 700',
    nameEn: 'Smart Ultra 700 Subwoofer',
    image: path.join(__dirname, 'public', 'Smart Ultra Caisson 700.webp'),
    segment: 'residential',
    descriptionFr: 'Caisson de basses premium avec technologie sans fil',
    descriptionEn: 'Premium subwoofer with wireless technology',
    priceFr: '25800 DH TTC',
    priceEn: '25800 DH TTC',
  },
  'Caisson de Bass Flush': {
    nameFr: 'Caisson de Bass Flush',
    nameEn: 'Flush Subwoofer',
    image: path.join(__dirname, 'public', 'Caisson de bass flush.webp'),
    segment: 'residential',
    descriptionFr: 'Caisson de basses encastrable avec design flush',
    descriptionEn: 'Flush mountable subwoofer with flush design',
    priceFr: '4500 DH TTC',
    priceEn: '4500 DH TTC',
  },

  // Professional Products
  'DM2C': {
    nameFr: 'DM2C Encastrable',
    nameEn: 'DM2C In-Ceiling Speaker',
    image: path.join(__dirname, 'public', 'DM2C.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte encastrée pour installations professionnelles',
    descriptionEn: 'In-ceiling speaker for professional installations',
    priceFr: '1800 DH TTC',
    priceEn: '1800 DH TTC',
  },
  'DM3 Flush': {
    nameFr: 'DM3 Flush',
    nameEn: 'DM3 Flush Speaker',
    image: path.join(__dirname, 'public', 'DM3_Flush.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte flush avec design discret',
    descriptionEn: 'Flush speaker with discreet design',
    priceFr: '2450 DH TTC',
    priceEn: '2450 DH TTC',
  },
  'DM5 Flush': {
    nameFr: 'DM5 Flush',
    nameEn: 'DM5 Flush Speaker',
    image: path.join(__dirname, 'public', 'DM5_Flush.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte flush premium avec son supérieur',
    descriptionEn: 'Premium flush speaker with superior sound',
    priceFr: '3450 DH TTC',
    priceEn: '3450 DH TTC',
  },
  'DM8C': {
    nameFr: 'DM8C Flush',
    nameEn: 'DM8C Flush Speaker',
    image: path.join(__dirname, 'public', 'DM8C_Flush.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte flush haut de gamme avec acoustique exceptionnelle',
    descriptionEn: 'Premium flush speaker with exceptional acoustics',
    priceFr: '6900 DH TTC',
    priceEn: '6900 DH TTC',
  },
  'FS2C': {
    nameFr: 'FS2C',
    nameEn: 'FS2C Speaker',
    image: path.join(__dirname, 'public', 'FS2C.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte professionnelle FS2C pour installations',
    descriptionEn: 'FS2C professional speaker for installations',
    priceFr: '1450 DH TTC',
    priceEn: '1450 DH TTC',
  },
  'FS2SE': {
    nameFr: 'FS2SE',
    nameEn: 'FS2SE Speaker',
    image: path.join(__dirname, 'public', 'FS2SE.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte professionnelle FS2SE pour installations',
    descriptionEn: 'FS2SE professional speaker for installations',
    priceFr: '1950 DH TTC',
    priceEn: '1950 DH TTC',
  },
  '251': {
    nameFr: '251 Enceinte Extérieure',
    nameEn: '251 Outdoor Speaker',
    image: path.join(__dirname, 'public', '251.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte extérieure Articulated Array® avec zone d\'écoute vaste ethomogène. Résistante aux conditions extrêmes: soleil, pluie, chaleur, gel, sel et eau.',
    descriptionEn: 'Articulated Array® outdoor speaker with wide, homogeneous listening zone. Weather-resistant: sun, rain, heat, frost, salt and water.',
    priceFr: '3250 DH TTC',
    priceEn: '3250 DH TTC',
    details: {
      driverConfiguration: 'Woofer 13,34 cm + 2 wide-band 6,35 cm + 2 Twiddler® 6,35 cm',
      enclosures: 'Boîtier multichambre breveté pour graves profondes avec minimum de distorsion',
      housingMaterial: 'Polypropylène chargé de fibres de verre et de fibres minérales',
      weatherResistance: 'Testée pour: soleil, pluie, chaleur, gel, sel, eau',
      mounting: 'Supports et équipements résistants aux intempéries pour installation permanente',
      tweeter: 'Twiddler® avec cône composite en fibre de verre et enveloppe soyeuse'
    }
  },
  'Satellite Flush': {
    nameFr: 'Satellite Flush',
    nameEn: 'Satellite Flush Speaker',
    image: path.join(__dirname, 'public', 'Satellite_flush.webp'),
    segment: 'professional',
    descriptionFr: 'Enceinte satellite flush pour installations discrètes',
    descriptionEn: 'Flush satellite speaker for discreet installations',
    priceFr: '1200 DH TTC',
    priceEn: '1200 DH TTC',
  },
  'Satellites': {
    nameFr: 'Satellites',
    nameEn: 'Satellites',
    image: path.join(__dirname, 'public', 'Satellite_flush.webp'),
    segment: 'professional',
    descriptionFr: 'Enceintes satellites pour son surround',
    descriptionEn: 'Satellite speakers for surround sound',
    priceFr: '2400 DH TTC',
    priceEn: '2400 DH TTC',
  },
  'IZA2120': {
    nameFr: 'IZA2120',
    nameEn: 'IZA2120',
    image: path.join(__dirname, 'public', 'IZA2120.webp'),
    segment: 'professional',
    descriptionFr: 'Amplificateur professionnel IZA2120',
    descriptionEn: 'IZA2120 professional amplifier',
    priceFr: '11800 DH TTC',
    priceEn: '11800 DH TTC',
  },
  'Bose Music Amplifier': {
    nameFr: 'Bose Music Amplifier',
    nameEn: 'Bose Music Amplifier',
    image: path.join(__dirname, 'public', 'Bose Music Amplifier.webp'),
    segment: 'professional',
    descriptionFr: 'Amplificateur multicanal pour applications professionnelles',
    descriptionEn: 'Multi-zone amplifier for professional applications',
    priceFr: '8500 DH TTC',
    priceEn: '8500 DH TTC',
  },

  // Portable Products
  'L1 PRO 16': {
    nameFr: 'L1 PRO 16',
    nameEn: 'L1 PRO 16',
    image: path.join(__dirname, 'public', 'L1_Pro16.webp'),
    segment: 'portable',
    descriptionFr: 'Système de sonorisation portable professionnel 16 canaux',
    descriptionEn: 'Professional portable PA system 16 channels',
    priceFr: '25800 DH TTC',
    priceEn: '25800 DH TTC',
  },
  'L1 PRO 8': {
    nameFr: 'L1 PRO 8',
    nameEn: 'L1 PRO 8',
    image: path.join(__dirname, 'public', 'L1pro8.webp'),
    segment: 'portable',
    descriptionFr: 'Système de sonorisation portable professionnel 8 canaux',
    descriptionEn: 'Professional portable PA system 8 channels',
    priceFr: '16800 DH TTC',
    priceEn: '16800 DH TTC',
  },
  '360P EC': {
    nameFr: '360P EC',
    nameEn: '360P EC',
    image: path.join(__dirname, 'public', '360P_EC.webp'),
    segment: 'portable',
    descriptionFr: 'Enceinte portable résistante à l\'eau avec son 360°',
    descriptionEn: 'Waterproof portable speaker with 360° sound',
    priceFr: '4900 DH TTC',
    priceEn: '4900 DH TTC',
  },
  'ZA250': {
    nameFr: 'ZA250-LZ Zone Amplifier',
    nameEn: 'ZA250-LZ Zone Amplifier',
    image: path.join(__dirname, 'public', 'ZA250.webp'),
    segment: 'professional',
    descriptionFr: 'Amplificateur de zone pour extension de systèmes sonores. Classe-D, 2x50W @ 4Ω, 2x25W @ 8Ω, 1x90W @ 70/100V',
    descriptionEn: 'Zone amplifier for sound system expansion. Class-D, 2x50W @ 4Ω, 2x25W @ 8Ω, 1x90W @ 70/100V',
    priceFr: 'Sur devis',
    priceEn: 'On request',
    details: {
      frequencyResponse: '20 Hz - 20 kHz (+0/-3 dB, @ 1W reference 1 kHz)',
      amplifierPower: '2x50W @ 4Ω, 2x25W @ 8Ω, 1x90W @ 70/100V',
      thd: '< 0.3% (at full rated power)',
      dynamicRange: '88 dB',
      inputChannels: 'Analog: 1 unbalanced'
    }
  },
};

/**
 * Get product details by name
 * @param {string} productName - Product name
 * @returns {object|null} - Product object or null
 */
function getProductDetails(productName) {
  // Case-insensitive lookup
  const normalizedName = productName.toLowerCase().trim();

  // Direct match first
  if (productsDatabase[productName]) {
    return productsDatabase[productName];
  }

  // Case-insensitive search
  for (const [key, product] of Object.entries(productsDatabase)) {
    if (key.toLowerCase() === normalizedName) {
      return product;
    }
  }

  // Fuzzy matching for common variations
  const fuzzyMatches = {
    'acoustimass': 'Acoustimass',
    'acoustimass3': 'Acoustimass 3',
    'smart soundbar': 'Smart Soundbar',
    'smart ultra soundbar': 'Smart Ultra Soundbar',
    'l1 pro 8': 'L1 PRO 8',
    'l1 pro 16': 'L1 PRO 16'
  };

  if (fuzzyMatches[normalizedName]) {
    return productsDatabase[fuzzyMatches[normalizedName]];
  }

  return null;
}

/**
 * Get all products for a segment
 * @param {string} segment - 'residential', 'professional', or 'portable'
 * @returns {array} - Products for segment
 */
function getSegmentProducts(segment) {
  return Object.entries(productsDatabase)
    .filter(([_, product]) => product.segment === segment)
    .map(([name, _]) => name);
}

/**
 * Product comparison specifications
 */
const productComparisons = {
  'DM2C_DM3': {
    name1: 'DM2C',
    name2: 'DM3 Flush',
    comparisonData: {
      price: {
        DM2C: '1800 DH TTC',
        'DM3 Flush': '2450 DH TTC',
        verdict: '✅ **DM2C est plus économique** (+650 DH pour DM3)'
      },
      installation: {
        DM2C: 'Encastré classique',
        'DM3 Flush': 'Flush mount (design discret)',
        verdict: '🎯 **DM3 meilleur pour l\'esthétique** (design plus lisse)'
      },
      qualityAudio: {
        DM2C: 'Son professionnel de base',
        'DM3 Flush': 'Son de meilleure qualité 🌟',
        verdict: '⭐ **DM3 Flush supérieur** pour installations haut de gamme'
      },
      usage: {
        DM2C: 'Restaurant, café, petits espaces',
        'DM3 Flush': 'Hôtel, boutique, installations premium',
        verdict: '📍 **Choisir par use-case**: budget → DM2C, qualité → DM3'
      },
      installation_complexity: {
        DM2C: 'Facile',
        'DM3 Flush': 'Plus complexe (flush mounting)',
        verdict: '🔧 **DM2C plus simple** à installer'
      }
    },
    recommendationFr: `**Comparaison DM2C vs DM3 Flush** 🎤\n\n📊 **Caractéristiques:**\n\n| Critère | DM2C | DM3 Flush |\n|---------|------|----------|\n| 💰 Prix | 1800 DH | 2450 DH |\n| 🎨 Design | Classique | Flush (discret) |\n| 🔊 Qualité son | Bon | Excellent ⭐ |\n| 🔧 Installation | Simple | Complexe |\n| 📍 Utilisation | All-purpose | Premium |\n\n✅ **Choisir DM2C si:**\n- Budget serré\n- Installation rapide requise\n- Installation classique\n\n✅ **Choisir DM3 Flush si:**\n- Besoin de design discret\n- Installation haut de gamme\n- Excellente qualité audio prioritaire\n- Budget plus important\n\n🎯 **Quelle est votre priorité: budget ou qualité/design?**`,
    recommendationEn: `**DM2C vs DM3 Flush Comparison** 🎤\n\n📊 **Features:**\n\n| Item | DM2C | DM3 Flush |\n|------|------|----------|\n| 💰 Price | 1800 MAD | 2450 MAD |\n| 🎨 Design | Classic | Flush (discrete) |\n| 🔊 Sound Quality | Good | Excellent ⭐ |\n| 🔧 Installation | Simple | Complex |\n| 📍 Usage | All-purpose | Premium |\n\n✅ **Choose DM2C if:**\n- Budget constraints\n- Quick installation needed\n- Classic installation\n\n✅ **Choose DM3 Flush if:**\n- Discrete design needed\n- Premium installation\n- Audio quality priority\n- Higher budget\n\n🎯 **What's your priority: budget or quality/design?**`
  },
  'DM3_DM5': {
    name1: 'DM3 Flush',
    name2: 'DM5 Flush',
    comparisonData: {
      price: {
        'DM3 Flush': '2450 DH TTC',
        'DM5 Flush': '3450 DH TTC',
        verdict: '💰 **DM3 moins cher** (-1000 DH)'
      },
      qualityAudio: {
        'DM3 Flush': 'Très bon',
        'DM5 Flush': 'Premium ⭐⭐',
        verdict: '⭐ **DM5 supérieur** pour audio de luxe'
      },
      usage: {
        'DM3 Flush': 'Hôtel 3-4 étoiles, boutique',
        'DM5 Flush': 'Hôtel 5 étoiles, restaurant premium',
        verdict: '🏆 **DM5 pour clientèle premium**'
      },
      power: {
        'DM3 Flush': 'Bon',
        'DM5 Flush': 'Puissant',
        verdict: '🔊 **DM5 meilleure puissance**'
      }
    },
    recommendationFr: `**Comparaison DM3 vs DM5 Flush** 🎤\n\n📊 **Comparatif:**\n\n| Critère | DM3 Flush | DM5 Flush |\n|---------|-----------|----------|\n| 💰 Prix | 2450 DH | 3450 DH |\n| 🔊 Qualité | Très bon | Premium ⭐⭐ |\n| 🎵 Puissance | Bon | Excellent |\n| 📍 Usage | Hôtel/Boutique | Établissement Premium |\n\n💡 **Verdict:**\n- **DM3 Flush:** Meilleur rapport qualité/prix\n- **DM5 Flush:** Installation haut de gamme avec qualité supérieure`,
    recommendationEn: `**DM3 vs DM5 Flush Comparison** 🎤\n\n📊 **Comparison:**\n\n| Item | DM3 Flush | DM5 Flush |\n|------|-----------|----------|\n| 💰 Price | 2450 MAD | 3450 MAD |\n| 🔊 Quality | Very Good | Premium ⭐⭐ |\n| 🎵 Power | Good | Excellent |\n| 📍 Usage | Hotel/Boutique | Premium Venue |\n\n💡 **Verdict:**\n- **DM3 Flush:** Best value for money\n- **DM5 Flush:** Premium installation with superior quality`
  },
  'DM2C_DM3_DM5': {
    allProducts: ['DM2C', 'DM3 Flush', 'DM5 Flush'],
    summaryFr: `**Gamme Professionelle DM - Laquelle choisir?** 🎤\n\n📊 **Tableau comparatif:**\n\n| | DM2C | DM3 Flush | DM5 Flush |\n|---|------|-----------|----------|\n| 💰 Prix | 1800 | 2450 | 3450 |\n| 🎨 Design | Classique | Flush | Flush |\n| 🔊 Son | Bon | Très bon | Premium |\n| 📍 Lieu | Café/Petit resto | Hôtel/Boutique | Premium |\n\n✅ **Recommandations:**\n- **Budget limité** → DM2C\n- **Meilleur rapport** → DM3 Flush\n- **Premium** → DM5 Flush`,
    summaryEn: `**Professional DM Series - Which to choose?** 🎤\n\n📊 **Comparison table:**\n\n| | DM2C | DM3 Flush | DM5 Flush |\n|---|------|-----------|----------|\n| 💰 Price | 1800 | 2450 | 3450 |\n| 🎨 Design | Classic | Flush | Flush |\n| 🔊 Sound | Good | Very Good | Premium |\n| 📍 Venue | Café/Small rest | Hotel/Boutique | Premium |\n\n✅ **Recommendations:**\n- **Budget** → DM2C\n- **Best value** → DM3 Flush\n- **Premium** → DM5 Flush`
  }
};

/**
 * Get comparison between two products
 * @param {string} product1 - First product name
 * @param {string} product2 - Second product name
 * @returns {object|null} - Comparison data or null if not found
 */
function getProductComparison(product1, product2) {
  const key = `${product1.replace(' Flush', '')}_${product2.replace(' Flush', '')}`;
  
  // Try both orders
  if (productComparisons[key]) {
    return productComparisons[key];
  }
  
  // Try reversed order
  const reverseKey = `${product2.replace(' Flush', '')}_${product1.replace(' Flush', '')}`;
  if (productComparisons[reverseKey]) {
    return productComparisons[reverseKey];
  }
  
  return null;
}

module.exports = {
  productsDatabase,
  getProductDetails,
  getSegmentProducts,
  getProductComparison,
  productComparisons,
};
