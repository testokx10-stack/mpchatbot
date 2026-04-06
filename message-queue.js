const Redis = require('ioredis');

// Redis client for message queuing
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || ''
});

// Message queue processing
class MessageQueue {
  constructor() {
    this.processing = false;
    this.processQueue();
  }

  async addMessage(phoneNumber, message, priority = 'normal') {
    const queueKey = priority === 'high' ? 'messages:high' : 'messages:normal';
    await redis.lpush(queueKey, JSON.stringify({ phoneNumber, message, timestamp: Date.now() }));
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        // Process high priority first
        let messageData = await redis.rpop('messages:high');
        if (!messageData) {
          messageData = await redis.rpop('messages:normal');
        }

        if (!messageData) break; // No messages

        const { phoneNumber, message } = JSON.parse(messageData);

        // Rate limiting check
        const canSend = await this.checkRateLimit(phoneNumber);
        if (!canSend) {
          // Re-queue for later
          await redis.lpush('messages:delayed', messageData);
          continue;
        }

        // Process message
        await this.processMessage(phoneNumber, message);

        // Small delay to prevent overwhelming WhatsApp
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processing = false;
      // Continue processing in 5 seconds
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  async checkRateLimit(phoneNumber) {
    const key = `ratelimit:${phoneNumber}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60); // 1 minute window
    }
    return count <= 20; // Max 20 messages per minute per user
  }
}

module.exports = { MessageQueue };