import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  mongodbTestUri: string;
  jwtSecret: string;
  jwtExpire: string;
  jwtRefreshSecret: string;
  jwtRefreshExpire: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  emailFrom: string;
  frontendUrl: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxFileSize: number;
  uploadPath: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/blood-buddy-pro',
  mongodbTestUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/blood-buddy-pro-test',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
  emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@bloodbuddy.com',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  uploadPath: process.env.UPLOAD_PATH || './uploads'
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && config.nodeEnv === 'production') {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

export { config };
