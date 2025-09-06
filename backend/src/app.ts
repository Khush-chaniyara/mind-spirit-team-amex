import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import passport from 'passport';
import { config } from './config/config';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { globalErrorHandler, notFound } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import bloodRequestRoutes from './routes/bloodRequestRoutes';
import donationRoutes from './routes/donationRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Initialize Passport strategies (configured in controllers)
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Blood Buddy Pro API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

export default app;
