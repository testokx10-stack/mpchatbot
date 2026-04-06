// templates.js - Static message templates to reduce token usage
// These are fixed messages that repeat across conversations

const TEMPLATES = {
    // GREETING MESSAGE - Sent to new customers
    GREETING: `Bonjour et bienvenue! 🎵 Media Prestige - Distributeur spécialisé en solutions audio premium au Maroc.

Êtes-vous intéressé par une solution audio pour:
• Un événement (DJ, concert, mariage)?
• Votre domicile (TV, cinéma, musique)?
• Une application professionnelle (restaurant, hôtel, boutique)?

Dites-moi ce qui vous intéresse! 😊`,

    // GOODBYE MESSAGE - Sent when customer says goodbye
    GOODBYE: `Merci de votre intérêt pour Media Prestige! 🎵

🌐 Consultez notre site web:
https://media-prestige.com/

📍 Visitez notre Showroom:
https://maps.app.goo.gl/KPfEza6pFAwdg89X9

⭐ Aidez-nous à nous améliorer! Laissez un avis Google:
https://search.google.com/local/writereview?placeid=ChIJWQtlj-jSpw0RuWGjvgW8qCg

À bientôt! N'hésitez pas à nous contacter si vous avez besoin d'informations! 👋`,

    // CONTACT/ADDRESS MESSAGE - Sent when customer asks for office info
    CONTACT: `Bien sûr! Voici nos coordonnées Media Prestige:

📧 **EMAIL:**
Mediaprestige.official@gmail.com

📍 **ADRESSE:**
30 Rue Abou Al Mahassine Royani, El Maarif 20100, Casablanca, Maroc

🗺️ **VENEZ VISITER NOTRE SHOWROOM:**
https://maps.app.goo.gl/KPfEza6pFAwdg89X9

Vous préférez nous contacter par email ou visiter notre showroom? 😊`,

    // PHOTO REPLY - When customer asks for photos but file not found
    PHOTO_REPLY: `Cliquez sur le lien WhatsApp pour voir toutes les spécifications et photos directement avec notre équipe! 📸`,

    // FALLBACK MESSAGE - When all AI services fail
    FALLBACK: `Désolé, nos serveurs rencontrent un problème technique. 
Veuillez réessayer dans quelques secondes ou contactez-nous directement au +212600051612.

Merci de votre compréhension! 😊`,

    // CHECKOUT MESSAGE TEMPLATE - Sent after purchase intent detected
    // Uses placeholders: {productList}, {salesNumber}, {encodedMessage}, {mapsUrl}
    CHECKOUT: `✅ Parfait! Vous avez choisi: {productList}! 🎵

Cliquez ici pour finaliser votre commande avec notre équipe:
https://wa.me/{salesNumber}?text={encodedMessage}

📍 Visitez notre Showroom: {mapsUrl}`,

    // RECOMMENDATION MESSAGE TEMPLATE - Sent after segment detection
    // Uses placeholders: {segment}, {productName}, {productDescription}
    RECOMMENDATION: `Parfait! Je recommande notre solution {segmentName}:

🎵 **{productName}**
{productDescription}

Voulez-vous voir plus de détails ou une photo du produit? 📸`,

    // PHOTO CAPTION TEMPLATE - Caption for product images
    // Uses placeholder: {productName}
    PHOTO_CAPTION: `Voici la photo du {productName}! 📸`,

    // PREFILL MESSAGE TEMPLATE - For WhatsApp checkout link
    // Uses placeholder: {productList}
    PREFILL_MESSAGE: `Bonjour! Je suis intéressé par: {productList}`,

    // GENERIC PRODUCT INTEREST MESSAGE
    GENERIC_PRODUCT_INTEREST: `Bonjour! Je suis intéressé par vos produits Media Prestige.`,

    // MESSAGE WHEN CUSTOMER REQUESTS PRODUCT IMAGE
    IMAGE_REQUEST_CAPTION: `Voici la photo du {product}! 📸`,
};

// Helper function to replace placeholders in templates
function fillTemplate(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{${key}}`, 'g');
        result = result.replace(placeholder, value);
    }
    return result;
}

module.exports = {
    TEMPLATES,
    fillTemplate
};
