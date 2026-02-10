// Error types and enums for the application

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  OCR_ERROR = 'OCR_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  SYNC_ERROR = 'SYNC_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ExpenseTrackerError extends Error {
  public readonly type: ErrorType;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(type: ErrorType, message: string, details?: any) {
    super(message);
    this.name = 'ExpenseTrackerError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExpenseTrackerError);
    }
  }

  toAppError(): AppError {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

// Specific error classes for better error handling
export class NetworkError extends ExpenseTrackerError {
  constructor(message: string, details?: any) {
    super(ErrorType.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

export class StorageError extends ExpenseTrackerError {
  constructor(message: string, details?: any) {
    super(ErrorType.STORAGE_ERROR, message, details);
    this.name = 'StorageError';
  }
}

export class ValidationError extends ExpenseTrackerError {
  constructor(message: string, details?: any) {
    super(ErrorType.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class OCRError extends ExpenseTrackerError {
  constructor(message: string, details?: any) {
    super(ErrorType.OCR_ERROR, message, details);
    this.name = 'OCRError';
  }
}

export class PermissionError extends ExpenseTrackerError {
  constructor(message: string, details?: any) {
    super(ErrorType.PERMISSION_ERROR, message, details);
    this.name = 'PermissionError';
  }
}

export class AuthError extends ExpenseTrackerError {
  constructor(message: string, details?: any) {
    super(ErrorType.AUTH_ERROR, message, details);
    this.name = 'AuthError';
  }
}

export class SyncError extends ExpenseTrackerError {
  constructor(message: string, details?: any) {
    super(ErrorType.SYNC_ERROR, message, details);
    this.name = 'SyncError';
  }
}
