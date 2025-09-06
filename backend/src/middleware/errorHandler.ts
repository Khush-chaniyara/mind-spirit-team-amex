import { Request, Response, NextFunction } from 'express';
import { IApiResponse } from '../types';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle MongoDB validation errors
const handleValidationError = (err: any): AppError => {
  const errors = Object.values(err.errors).map((val: any) => val.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle MongoDB duplicate key errors
const handleDuplicateKeyError = (err: any): AppError => {
  const field = Object.keys(err.keyValue)[0];
  const message = `${field} already exists. Please use a different ${field}.`;
  return new AppError(message, 400);
};

// Handle MongoDB cast errors
const handleCastError = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

// Send error response in development
const sendErrorDev = (err: AppError, res: Response<IApiResponse>): void => {
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    error: err.message
  });
};

// Send error response in production
const sendErrorProd = (err: AppError, res: Response<IApiResponse>): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

// Global error handling middleware
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response<IApiResponse>,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific MongoDB errors
    if (err.name === 'ValidationError') {
      error = handleValidationError(err);
    }
    if (err.code === 11000) {
      error = handleDuplicateKeyError(err);
    }
    if (err.name === 'CastError') {
      error = handleCastError(err);
    }
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (err: any) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });
};

// Handle uncaught exceptions
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (err: Error) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });
};

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
export const notFound = (req: Request, res: Response<IApiResponse>): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};
