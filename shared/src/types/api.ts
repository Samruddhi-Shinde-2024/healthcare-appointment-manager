export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ApiFailure {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
