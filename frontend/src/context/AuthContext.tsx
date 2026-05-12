import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/authApi";
import { ApiError } from "../types/api";
import type { User } from "../types/user";
import { authStorage } from "../utils/authStorage";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  loginError: string;
  login: (loginValue: string) => Promise<void>;
  logout: () => void;
  updateUser: (next: User | null) => void;
  clearLoginError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const restore = async () => {
      const savedLogin = authStorage.getLogin();
      if (!savedLogin) {
        setIsLoading(false);
        return;
      }
      try {
        const restored = await authApi.login(savedLogin);
        setUser(restored);
      } catch {
        authStorage.clearLogin();
        localStorage.removeItem("zavod_music_player");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void restore();
  }, []);

  const login = useCallback(async (loginValue: string) => {
    setLoginError("");
    const normalized = loginValue.trim();
    if (!normalized) {
      setLoginError("Введите логин");
      throw new Error("LOGIN_REQUIRED");
    }
    try {
      const next = await authApi.login(normalized);
      authStorage.setLogin(next.login);
      setUser(next);
    } catch (error) {
      if (error instanceof ApiError) {
        setLoginError(error.message);
      } else {
        setLoginError("Что-то пошло не так, попробуйте снова");
      }
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    authStorage.clearLogin();
    localStorage.removeItem("zavod_music_player");
    setUser(null);
    setLoginError("");
  }, []);

  const updateUser = useCallback((next: User | null) => {
    setUser(next);
  }, []);

  const clearLoginError = useCallback(() => setLoginError(""), []);

  const value = useMemo(
    () => ({ user, isLoading, loginError, login, logout, updateUser, clearLoginError }),
    [user, isLoading, loginError, login, logout, updateUser, clearLoginError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}






