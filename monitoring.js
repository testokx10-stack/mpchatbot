const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeUsers: Object.keys(conversationHistories).length,
    totalMessages: Object.values(messageCount).reduce((a, b) => a + b, 0),
    timestamp: new Date().toISOString()
  };

  res.json(metrics);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Leads dashboard
app.get('/dashboard', async (req, res) => {
  const summary = await getLeadsSummary();
  res.json(summary);
});

app.listen(port, () => {
  console.log(`📊 Monitoring server running on port ${port}`);
});

module.exports = app;