import { describe, it, expect } from 'vitest';
import { GoCardlessAPIError } from '../../../src/errors/api-error';

describe('GoCardlessAPIError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new GoCardlessAPIError(
        'Test error',
        404,
        'NOT_FOUND',
        'Resource not found',
        'Not found',
        undefined, // rateLimit
        { foo: 'bar' },
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('GoCardlessAPIError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.detail).toBe('Resource not found');
      expect(error.summary).toBe('Not found');
      expect(error.meta).toEqual({ foo: 'bar' });
    });

    it('should create error without metadata', () => {
      const error = new GoCardlessAPIError(
        'Test error',
        404,
        'NOT_FOUND',
        'Resource not found',
        'Not found',
      );

      expect(error.meta).toBeUndefined();
    });
  });

  describe('fromResponse', () => {
    it('should create error from API response', () => {
      const error = GoCardlessAPIError.fromResponse(404, {
        summary: 'Account not found',
        detail: 'The account does not exist',
        status_code: 404,
      });

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('ACCOUNT_NOT_FOUND');
      expect(error.summary).toBe('Account not found');
      expect(error.detail).toBe('The account does not exist');
      expect(error.message).toBe('Account not found: The account does not exist');
    });

    it('should handle missing summary and detail', () => {
      const error = GoCardlessAPIError.fromResponse(500, {});

      expect(error.summary).toBe('API Error');
      expect(error.detail).toBe('An error occurred');
      expect(error.message).toBe('API Error: An error occurred');
    });

    it('should include metadata when provided', () => {
      const error = GoCardlessAPIError.fromResponse(
        429,
        {
          summary: 'Rate limit exceeded',
          detail: 'Please try again in 60 seconds',
        },
        undefined, // rateLimit
        { retryAfter: 60 },
      );

      expect(error.meta).toEqual({ retryAfter: 60 });
    });
  });

  describe('getErrorCode', () => {
    it('should map 404 with account in summary to ACCOUNT_NOT_FOUND', () => {
      const error = GoCardlessAPIError.fromResponse(404, {
        summary: 'Account ID not found',
        detail: 'Check the account ID',
      });

      expect(error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should map 404 with transaction to TRANSACTION_NOT_FOUND', () => {
      const error = GoCardlessAPIError.fromResponse(404, {
        summary: 'Transaction not found',
        detail: 'Invalid transaction ID',
      });

      expect(error.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should map 404 with requisition to REQUISITION_NOT_FOUND', () => {
      const error = GoCardlessAPIError.fromResponse(404, {
        summary: 'Requisition not found',
        detail: 'Invalid requisition',
      });

      expect(error.code).toBe('REQUISITION_NOT_FOUND');
    });

    it('should map 404 with agreement to AGREEMENT_NOT_FOUND', () => {
      const error = GoCardlessAPIError.fromResponse(404, {
        summary: 'Agreement not found',
        detail: 'Invalid agreement',
      });

      expect(error.code).toBe('AGREEMENT_NOT_FOUND');
    });

    it('should map generic 404 to NOT_FOUND', () => {
      const error = GoCardlessAPIError.fromResponse(404, {
        summary: 'Not found',
        detail: 'Resource does not exist',
      });

      expect(error.code).toBe('NOT_FOUND');
    });

    it('should map 429 to RATE_LIMIT_EXCEEDED', () => {
      const error = GoCardlessAPIError.fromResponse(429, {
        summary: 'Too many requests',
        detail: 'Rate limit exceeded',
      });

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should map 401 to AUTHENTICATION_FAILED', () => {
      const error = GoCardlessAPIError.fromResponse(401, {
        summary: 'Unauthorized',
        detail: 'Invalid token',
      });

      expect(error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('should map 402 to PAYMENT_REQUIRED', () => {
      const error = GoCardlessAPIError.fromResponse(402, {
        summary: 'Payment required',
        detail: 'Free usage limit exceeded',
      });

      expect(error.code).toBe('PAYMENT_REQUIRED');
    });

    it('should map 403 with IP to IP_NOT_WHITELISTED', () => {
      const error = GoCardlessAPIError.fromResponse(403, {
        summary: 'IP address not whitelisted',
        detail: 'Your IP is not allowed',
      });

      expect(error.code).toBe('IP_NOT_WHITELISTED');
    });

    it('should map generic 403 to FORBIDDEN', () => {
      const error = GoCardlessAPIError.fromResponse(403, {
        summary: 'Forbidden',
        detail: 'Access denied',
      });

      expect(error.code).toBe('FORBIDDEN');
    });

    it('should map 409 to CONFLICT', () => {
      const error = GoCardlessAPIError.fromResponse(409, {
        summary: 'Conflict',
        detail: 'Account is suspended',
      });

      expect(error.code).toBe('CONFLICT');
    });

    it('should map 400 to VALIDATION_ERROR', () => {
      const error = GoCardlessAPIError.fromResponse(400, {
        summary: 'Bad request',
        detail: 'Invalid input',
      });

      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should map 500 to INTERNAL_SERVER_ERROR', () => {
      const error = GoCardlessAPIError.fromResponse(500, {});
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should map 502 to BAD_GATEWAY', () => {
      const error = GoCardlessAPIError.fromResponse(502, {});
      expect(error.code).toBe('BAD_GATEWAY');
    });

    it('should map 503 to SERVICE_UNAVAILABLE', () => {
      const error = GoCardlessAPIError.fromResponse(503, {});
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should map 504 to GATEWAY_TIMEOUT', () => {
      const error = GoCardlessAPIError.fromResponse(504, {});
      expect(error.code).toBe('GATEWAY_TIMEOUT');
    });

    it('should map unknown status to UNKNOWN_ERROR', () => {
      const error = GoCardlessAPIError.fromResponse(418, {});
      expect(error.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getRetryAfter', () => {
    it('should parse retry-after from detail message', () => {
      const error = GoCardlessAPIError.fromResponse(429, {
        summary: 'Rate limit exceeded',
        detail: 'Please try again in 60 seconds',
      });

      expect(error.getRetryAfter()).toBe(60);
    });

    it('should parse retry-after with different casing', () => {
      const error = GoCardlessAPIError.fromResponse(429, {
        summary: 'Rate limit',
        detail: 'Try again in 120 second',
      });

      expect(error.getRetryAfter()).toBe(120);
    });

    it('should return null if not a rate limit error', () => {
      const error = GoCardlessAPIError.fromResponse(404, {
        summary: 'Not found',
        detail: 'Resource not found',
      });

      expect(error.getRetryAfter()).toBeNull();
    });

    it('should return null if detail does not contain retry time', () => {
      const error = GoCardlessAPIError.fromResponse(429, {
        summary: 'Rate limit',
        detail: 'Too many requests',
      });

      expect(error.getRetryAfter()).toBeNull();
    });

    it('should handle plural "seconds"', () => {
      const error = GoCardlessAPIError.fromResponse(429, {
        summary: 'Rate limit',
        detail: 'Please try again in 30 seconds',
      });

      expect(error.getRetryAfter()).toBe(30);
    });
  });
});
