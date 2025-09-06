import express from 'express';
import cors from 'cors';
import { config } from './config/config';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Blood Buddy Pro API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Basic auth routes
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login endpoint ready',
    data: { accessToken: 'mock-token', refreshToken: 'mock-refresh' }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'Registration endpoint ready',
    data: { accessToken: 'mock-token', refreshToken: 'mock-refresh' }
  });
});

// Basic blood request routes
app.get('/api/blood-requests', (req, res) => {
  res.json({
    success: true,
    message: 'Blood requests endpoint ready',
    data: []
  });
});

app.post('/api/blood-requests', (req, res) => {
  res.json({
    success: true,
    message: 'Blood request created',
    data: { id: 'mock-id', ...req.body }
  });
});

// Basic donation routes
app.get('/api/donations', (req, res) => {
  res.json({
    success: true,
    message: 'Donations endpoint ready',
    data: []
  });
});

app.post('/api/donations', (req, res) => {
  res.json({
    success: true,
    message: 'Donation created',
    data: { id: 'mock-id', ...req.body }
  });
});

// Basic user routes
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    message: 'Users endpoint ready',
    data: []
  });
});

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
🚀 Blood Buddy Pro API Server is running!
📍 Environment: ${config.nodeEnv}
🌐 Server: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
🔗 API Base URL: http://localhost:${PORT}/api
  `);
});
