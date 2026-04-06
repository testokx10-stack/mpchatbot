const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  console.log(`🚀 Starting ${os.cpus().length} bot workers...`);

  // Fork workers
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }

  // Restart workers on crash
  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  // Worker process - run the bot
  require('./index.js');
}