const cron = require('node-cron');

// Global variables (will be set when module is required)
let conversationHistories, customerStatus, currentProduct, customerSegment,
    customerLanguage, conversationStage, messageCount, awaitingProductChoice, lastRecommendationSent;

// Initialize function to set global references
function initCleanup(histories, status, product, segment, language, stage, count, awaiting, lastRec) {
  conversationHistories = histories;
  customerStatus = status;
  currentProduct = product;
  customerSegment = segment;
  customerLanguage = language;
  conversationStage = stage;
  messageCount = count;
  awaitingProductChoice = awaiting;
  lastRecommendationSent = lastRec;
}

// Memory cleanup scheduler - runs every 4 hours
cron.schedule('0 */4 * * *', () => {
  console.log('🧹 Running memory cleanup...');

  if (!conversationHistories) return;

  const now = Date.now();
  const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours
  let cleanedUsers = 0;

  // Clean up old conversation histories (inactive for 24+ hours)
  for (const [phone, history] of Object.entries(conversationHistories)) {
    if (history.length > 0) {
      const lastMessage = history[history.length - 1];
      if (lastMessage.timestamp && (now - lastMessage.timestamp) > cleanupThreshold) {
        // Clean up all user data
        delete conversationHistories[phone];
        delete customerStatus[phone];
        delete currentProduct[phone];
        delete customerSegment[phone];
        delete customerLanguage[phone];
        delete conversationStage[phone];
        delete messageCount[phone];
        delete awaitingProductChoice[phone];
        delete lastRecommendationSent[phone];
        cleanedUsers++;
      }
    }
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('🗑️ Forced garbage collection');
  }

  if (cleanedUsers > 0) {
    console.log(`🗑️ Cleaned up ${cleanedUsers} inactive users`);
  }
  console.log(`💾 Active users: ${Object.keys(conversationHistories).length}`);
});

// Emergency cleanup for very old data (run daily at 2 AM)
cron.schedule('0 2 * * *', () => {
  console.log('🚨 Emergency cleanup - removing 7+ day old data...');

  if (!conversationHistories) return;

  const now = Date.now();
  const emergencyThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
  let cleanedUsers = 0;

  for (const phone of Object.keys(conversationHistories)) {
    const history = conversationHistories[phone];
    if (history.length > 0) {
      const lastMessage = history[history.length - 1];
      if (lastMessage.timestamp && (now - lastMessage.timestamp) > emergencyThreshold) {
        // Clean up all data for this user
        delete conversationHistories[phone];
        delete customerStatus[phone];
        delete currentProduct[phone];
        delete customerSegment[phone];
        delete customerLanguage[phone];
        delete conversationStage[phone];
        delete messageCount[phone];
        delete awaitingProductChoice[phone];
        delete lastRecommendationSent[phone];
        cleanedUsers++;
      }
    }
  }

  if (cleanedUsers > 0) {
    console.log(`🚨 Emergency cleanup: ${cleanedUsers} users removed`);
  }
});

module.exports = { initCleanup };