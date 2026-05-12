import { request } from "./client";
import type { User } from "../types/user";

export const authApi = {
  login: (login: string) => request<User>("/api/auth/login", { method: "POST", body: { login } }),
};



