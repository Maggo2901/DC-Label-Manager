class AppError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(message, issues) {
    super(message, 'VALIDATION_FAILED', 422);
    this.name = 'ValidationError';
    this.issues = Array.isArray(issues) ? issues : [];
  }
}

class NotFoundError extends AppError {
  constructor(message, code = 'NOT_FOUND') {
    super(message, code, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(message, code, 409);
    this.name = 'ConflictError';
  }
}

class BadRequestError extends AppError {
  constructor(message, code = 'BAD_REQUEST') {
    super(message, code, 400);
    this.name = 'BadRequestError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  BadRequestError
};
