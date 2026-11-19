export interface ApiFieldError {
  code: string;
  field?: string;
  message: string;
}

export interface ApiErrorDetail {
  code: string;
  details: unknown | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  error?: ApiErrorDetail;
  errors: ApiFieldError[];
  traceId?: string;
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
  traceId = '',
  errorCode = 'ERROR'
): ApiResponse<null> {
  const primaryCode = errors.length > 0 && errors[0].code ? errors[0].code : errorCode;
  return {
    success: false,
    message,
    data: null,
    error: {
      code: primaryCode,
      details: errors.length > 1 ? errors : null
    },
    errors,
    traceId
  };
}
