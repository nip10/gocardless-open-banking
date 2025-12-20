/**
 * Mock server utilities for testing
 */
import { vi } from 'vitest';

/**
 * Create a mock Response object
 */
export function createMockResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    blob: vi.fn(),
    arrayBuffer: vi.fn(),
    formData: vi.fn(),
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic',
    url: '',
  } as unknown as Response;
}

/**
 * Create a mock error response
 */
export function createMockErrorResponse(
  status: number,
  summary: string,
  detail: string,
): Response {
  return createMockResponse(status, {
    summary,
    detail,
    status_code: status,
  });
}

/**
 * Mock ky with controlled responses
 */
export function mockKy(responses: {
  get?: unknown;
  post?: unknown;
  put?: unknown;
  delete?: unknown;
  error?: Error;
}) {
  const createMethod = (response: unknown) => {
    const method = vi.fn(() => ({
      json: vi.fn().mockResolvedValue(response),
    }));
    return method;
  };

  return {
    create: vi.fn(() => ({
      get: responses.get ? createMethod(responses.get) : vi.fn(),
      post: responses.post ? createMethod(responses.post) : vi.fn(),
      put: responses.put ? createMethod(responses.put) : vi.fn(),
      delete: responses.delete ? createMethod(responses.delete) : vi.fn(),
    })),
    get: responses.get ? createMethod(responses.get) : vi.fn(),
    post: responses.post ? createMethod(responses.post) : vi.fn(),
    put: responses.put ? createMethod(responses.put) : vi.fn(),
    delete: responses.delete ? createMethod(responses.delete) : vi.fn(),
  };
}
