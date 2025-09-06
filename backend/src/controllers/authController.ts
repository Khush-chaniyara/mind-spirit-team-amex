import { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User, { IUserDocument } from '../models/User';
import { config } from '../config/config';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { IApiResponse, IAuthTokens } from '../types';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: config.googleClientId,
  clientSecret: config.googleClientSecret,
  callbackURL: config.googleCallbackUrl
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(Error, false);
    }

    // Check if user exists with this email
    user = await User.findOne({ email: profile.emails?.[0]?.value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.profilePicture = profile.photos?.[0]?.value;
      await user.save();
      return done(null, user);
    }

    // Create new user
    user = new User({
      name: profile.displayName,
      email: profile.emails?.[0]?.value,
      googleId: profile.id,
      profilePicture: profile.photos?.[0]?.value,
      userType: 'donor', // Default to donor, can be changed later
      phone: '', // Will need to be filled later
      city: '',
      pincode: '',
      isVerified: profile.emails?.[0]?.verified || false
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Configure JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.userId);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth login
export const googleLogin = passport.authenticate('google', {
  scope: ['profile', 'email']
});

// Google OAuth callback (no session)
export const googleCallback = passport.authenticate('google', {
  session: false,
  failureRedirect: `${config.frontendUrl}/login?error=google_auth_failed`
});

// Handle successful Google authentication
export const handleGoogleAuth = async (req: Request, res: Response<IApiResponse<IAuthTokens>>) => {
  try {
    const user = req.user as IUserDocument;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Google authentication failed'
      });
    }

    const accessToken = generateToken(user._id!);
    const refreshToken = generateRefreshToken(user._id!);

    return res.redirect(`${config.frontendUrl}/auth/success?token=${accessToken}&refresh=${refreshToken}`);
  } catch (error) {
    console.error('Google auth handler error:', error);
    return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
};

// Refresh token endpoint
export const refreshToken = async (req: Request, res: Response<IApiResponse<IAuthTokens>>) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Manual registration
export const register = async (req: Request, res: Response<IApiResponse<IAuthTokens>>) => {
  try {
    const { name, email, userType, bloodGroup, phone, city, pincode, age, weight } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      userType,
      bloodGroup: userType === 'donor' ? bloodGroup : undefined,
      phone,
      city,
      pincode,
      age: userType === 'donor' ? age : undefined,
      weight: userType === 'donor' ? weight : undefined,
      isVerified: false
    });

    await user.save();

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

// Manual login
export const login = async (req: Request, res: Response<IApiResponse<IAuthTokens>>) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response<IApiResponse<IUserDocument>>) => {
  try {
    const user = req.user as IUserDocument;
    
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response<IApiResponse<IUserDocument>>) => {
  try {
    const user = req.user as IUserDocument;
    const updates = req.body;

    // Remove sensitive fields
    delete updates._id;
    delete updates.googleId;
    delete updates.createdAt;
    delete updates.updatedAt;

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser!
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout (client-side token removal)
export const logout = async (req: Request, res: Response<IApiResponse>) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};
