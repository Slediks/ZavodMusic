import { ApiError, type ApiErrorPayload, type RequestMethod } from "../types/api";
import { authStorage } from "../utils/authStorage";

type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
};

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "http://127.0.0.1:5000";

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const login = authStorage.getLogin();
  if (login) {
    headers["X-User-Login"] = login;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiError(
      response.status,
      payload.error || "UNKNOWN_ERROR",
      payload.message || "Что-то пошло не так, попробуйте обновить страницу",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}




