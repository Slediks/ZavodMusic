export type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;
  error: string;

  constructor(status: number, error: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.error = error;
  }
}

export type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";


