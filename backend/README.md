# Blood Buddy Pro - Backend API

A comprehensive backend API for the Blood Buddy Pro blood donation management system.

## Features

- 🔐 **Authentication & Authorization**
  - Google OAuth 2.0 integration
  - JWT-based authentication
  - Role-based access control (Donor, Patient, Hospital)

- 🩸 **Blood Management**
  - Blood request creation and management
  - Donor matching and availability
  - Donation tracking and records
  - Urgency-based prioritization

- 👥 **User Management**
  - User registration and profiles
  - Donor availability management
  - Contribution tracking and leaderboards

- 📊 **Analytics & Statistics**
  - Real-time statistics
  - Donation analytics
  - User contribution summaries

- 🛡️ **Security & Performance**
  - Rate limiting
  - Input validation
  - Error handling
  - CORS protection

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js with Google OAuth & JWT
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/blood-buddy-pro
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or install MongoDB locally
   ```

5. **Run the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Blood Requests
- `GET /api/blood-requests` - Get all blood requests
- `POST /api/blood-requests` - Create blood request
- `GET /api/blood-requests/:id` - Get specific request
- `PUT /api/blood-requests/:id` - Update request
- `DELETE /api/blood-requests/:id` - Delete request
- `GET /api/blood-requests/search` - Search requests

### Donations
- `GET /api/donations` - Get all donations
- `POST /api/donations` - Create donation record
- `GET /api/donations/leaderboard` - Get top donors
- `GET /api/donations/stats` - Get donation statistics
- `GET /api/donations/user/summary` - Get user donation summary

### Users
- `GET /api/users` - Get all users
- `GET /api/users/donors/available` - Get available donors
- `GET /api/users/stats` - Get user statistics
- `PUT /api/users/availability` - Update availability

## Database Models

### User
- Personal information (name, email, phone)
- User type (donor, patient, hospital)
- Blood group and medical info
- Availability and donation history

### BloodRequest
- Patient and hospital information
- Blood group and urgency level
- Location and contact details
- Status and fulfillment tracking

### DonationRecord
- Donor and donation details
- Points and contribution tracking
- Hospital and date information
- Status management

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
6. Copy Client ID and Client Secret to your `.env` file

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── types/           # TypeScript type definitions
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

## Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Validates all incoming data
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt for password security

## Error Handling

The API includes comprehensive error handling:
- Global error handler
- Validation error handling
- Database error handling
- Authentication error handling
- Custom error classes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
