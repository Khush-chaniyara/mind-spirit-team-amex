#!/bin/bash

# Create backend .env file
cat > backend/.env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/blood-buddy-pro
MONGODB_TEST_URI=mongodb://localhost:27017/blood-buddy-pro-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here-change-this-in-production
JWT_REFRESH_EXPIRE=30d

# Google OAuth - You need to get these from Google Cloud Console
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@bloodbuddy.com

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
EOF

# Create frontend .env file
cat > frontend/blood-buddy-enhancements/.env << EOF
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Google OAuth (if needed for frontend)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
EOF

echo "Environment files created successfully!"
echo "Please update the Google OAuth credentials in backend/.env"
echo "You can get them from: https://console.cloud.google.com/"


