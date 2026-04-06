// Batch lead logging to reduce I/O operations
class BatchLeadLogger {
  constructor(logLeadFunction, batchSize = 5, flushInterval = 30000) { // 30 seconds
    this.logLead = logLeadFunction; // Injected function
    this.batch = [];
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.timer = null;
    this.startTimer();
  }

  // Add lead to batch
  add(phoneNumber, status, message = '', notes = '', products = '') {
    this.batch.push({
      phoneNumber,
      status,
      message: message.substring(0, 200), // Truncate long messages
      notes: notes.substring(0, 500),
      products,
      timestamp: Date.now()
    });

    // Flush if batch is full
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  // Flush batch to CSV
  flush() {
    if (this.batch.length === 0) return;

    const batchToProcess = [...this.batch];
    this.batch = [];

    // Process in background (non-blocking)
    setImmediate(async () => {
      try {
        for (const lead of batchToProcess) {
          await this.processLeadAsync(lead);
        }
        console.log(`📝 Batch logged ${batchToProcess.length} leads`);
      } catch (error) {
        console.error('❌ Batch logging failed:', error.message);
        // Re-queue failed leads
        this.batch.unshift(...batchToProcess);
      }
    });
  }

  // Process single lead asynchronously
  async processLeadAsync(lead) {
    return new Promise((resolve, reject) => {
      try {
        this.logLead(lead.phoneNumber, lead.status, lead.message, lead.notes, lead.products);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Start periodic flush timer
  startTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // Stop timer and flush remaining
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

// Create global batch logger
const batchLogger = new BatchLeadLogger();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down batch logger...');
  batchLogger.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down batch logger...');
  batchLogger.stop();
  process.exit(0);
});

module.exports = { BatchLeadLogger };