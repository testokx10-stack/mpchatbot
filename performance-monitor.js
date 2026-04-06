// Performance monitoring and metrics
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      totalMessages: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      errorCount: 0,
      aiRequests: 0,
      aiErrors: 0,
      memoryPeak: 0,
      lastReset: Date.now()
    };
  }

  // Track message processing
  startMessage(phoneNumber) {
    return {
      phoneNumber,
      startTime: Date.now(),
      end: (success = true, error = null) => {
        const duration = Date.now() - this.startTime;
        this.metrics.totalMessages++;
        this.metrics.totalResponseTime += duration;
        this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalMessages;

        if (!success) {
          this.metrics.errorCount++;
        }

        // Track memory usage
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > this.metrics.memoryPeak) {
          this.metrics.memoryPeak = memUsage.heapUsed;
        }

        console.log(`📊 Message processed: ${duration}ms, Success: ${success}`);
        if (error) {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    };
  }

  // Track AI requests
  trackAIRequest(success = true) {
    this.metrics.aiRequests++;
    if (!success) {
      this.metrics.aiErrors++;
    }
  }

  // Get current metrics
  getMetrics() {
    const uptime = Date.now() - this.metrics.lastReset;
    return {
      ...this.metrics,
      uptime: Math.floor(uptime / 1000), // seconds
      memoryPeakMB: Math.floor(this.metrics.memoryPeak / 1024 / 1024),
      errorRate: this.metrics.totalMessages > 0 ? (this.metrics.errorCount / this.metrics.totalMessages * 100).toFixed(2) : 0,
      aiSuccessRate: this.metrics.aiRequests > 0 ? ((this.metrics.aiRequests - this.metrics.aiErrors) / this.metrics.aiRequests * 100).toFixed(2) : 100
    };
  }

  // Reset metrics
  reset() {
    const oldMetrics = { ...this.metrics };
    this.metrics = {
      totalMessages: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      errorCount: 0,
      aiRequests: 0,
      aiErrors: 0,
      memoryPeak: 0,
      lastReset: Date.now()
    };
    return oldMetrics;
  }
}

// Global performance monitor
const perfMonitor = new PerformanceMonitor();

module.exports = { perfMonitor };