import { NextResponse } from 'next/server';
import { ApiErrorResponse, ApiSuccessResponse, ApiErrorCode } from '@/types/api';

export function jsonSuccess<T>(data: T, meta?: ApiSuccessResponse<T>['meta'], status = 200) {
  const responseBody: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(responseBody, { status });
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorResponse['error']['details'],
  status = 400
) {
  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return NextResponse.json(responseBody, { status });
}
