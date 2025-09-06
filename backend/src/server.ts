import app from './app';
import connectDB from './config/database';
import { config } from './config/config';
import { handleUncaughtException, handleUnhandledRejection } from './middleware/errorHandler';

// Handle uncaught exceptions
handleUncaughtException();

// Handle unhandled promise rejections
handleUnhandledRejection();

// Connect to database
connectDB();

// Start server
const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Blood Buddy Pro API Server is running!
📍 Environment: ${config.nodeEnv}
🌐 Server: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
🔗 API Base URL: http://localhost:${PORT}/api
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default server;
