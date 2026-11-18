export interface ApiFieldError {
  code: string;
  field?: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  errors: ApiFieldError[];
  traceId: string;
}

export function createSuccessResponse<T>(
  data: T,
  message = 'Operation completed successfully',
  traceId = ''
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    errors: [],
    traceId
  };
}

export function createErrorResponse(
  message = 'Request could not be processed',
  errors: ApiFieldError[] = [],
  traceId = ''
): ApiResponse<null> {
  return {
    success: false,
    message,
    data: null,
    errors,
    traceId
  };
}
