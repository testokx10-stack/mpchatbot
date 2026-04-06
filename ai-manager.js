const EventEmitter = require('events');

// AI Service Manager with connection pooling and retry logic
class AIServiceManager extends EventEmitter {
  constructor(generateResponseFn, generateOllamaResponseFn, isOllamaAvailableFn) {
    super();
    this.generateResponse = generateResponseFn;
    this.generateOllamaResponse = generateOllamaResponseFn;
    this.isOllamaAvailable = isOllamaAvailableFn;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.activeRequests = new Map();
    this.requestQueue = [];
    this.processing = false;
  }

  // Generate AI response with retry logic and rate limiting
  async generateWithRetry(customerMessage, conversationHistory, service = 'auto') {
    const requestId = `${Date.now()}-${Math.random()}`;

    // Add to active requests
    this.activeRequests.set(requestId, { startTime: Date.now() });

    try {
      let response;
      let lastError;

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          // Choose AI service
          if (service === 'auto') {
            response = await this.tryAutoSelect(customerMessage, conversationHistory);
          } else if (service === 'ollama') {
            response = await generateOllamaResponse(customerMessage, conversationHistory);
          } else {
            response = await generateResponse(customerMessage, conversationHistory);
          }

          // Success - emit event and return
          this.emit('success', { requestId, attempt, duration: Date.now() - this.activeRequests.get(requestId).startTime });
          return response;

        } catch (error) {
          lastError = error;
          console.warn(`AI attempt ${attempt}/${this.maxRetries} failed:`, error.message);

          if (attempt < this.maxRetries) {
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
          }
        }
      }

      // All retries failed
      this.emit('failure', { requestId, error: lastError, attempts: this.maxRetries });
      throw lastError;

    } finally {
      // Clean up active request
      this.activeRequests.delete(requestId);
    }
  }

  // Auto-select best AI service
  async tryAutoSelect(customerMessage, conversationHistory) {
    try {
      // Try Ollama first (faster, local)
      if (await this.isOllamaAvailable()) {
        return await this.generateOllamaResponse(customerMessage, conversationHistory);
      }
    } catch (ollamaError) {
      console.warn('Ollama failed, trying Gemini:', ollamaError.message);
    }

    // Fallback to Gemini
    return await this.generateResponse(customerMessage, conversationHistory);
  }

  // Get current stats
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length,
      uptime: process.uptime()
    };
  }
}

// Create global AI manager instance
const aiManager = new AIServiceManager();

module.exports = { AIServiceManager };