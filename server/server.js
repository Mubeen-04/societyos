import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { ENV } from './src/config/env.js';
import { initBackgroundJobs } from './src/jobs/scheduler.js';
import { Society } from './src/models/Society.js';
import { runSeed } from './seeds/seed.js';

const startServer = async () => {
  try {
    // 1. Connect to Database (External MongoDB or Embedded MongoMemoryServer)
    await connectDB();

    // Check if initial seed is needed
    const societyCount = await Society.countDocuments();
    if (societyCount === 0) {
      console.log('🌱 Empty database detected. Running initial SocietyOS seed routine...');
      await runSeed();
    }

    // 2. Initialize Background Cron Scheduler
    initBackgroundJobs();

    // 3. Start Express Server
    const PORT = ENV.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🏢 SocietyOS Backend Engine Active on Port: ${PORT}`);
      console.log(`🌐 API Endpoint: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });

    // Graceful Shutdown
    const handleShutdown = () => {
      console.log('Received kill signal, shutting down gracefully...');
      server.close(() => {
        console.log('Closed out remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
  } catch (error) {
    console.error('Fatal error starting SocietyOS server:', error);
    process.exit(1);
  }
};

startServer();
