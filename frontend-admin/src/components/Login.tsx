import React, { useState } from "react";
import { api } from "../api/adminApi";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api("/auth/login", { method: "POST", body: JSON.stringify({ login, password }) });
      localStorage.setItem("admin_token", res.token);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return <div className="auth-wrap"><form className="card auth-form" autoComplete="off" onSubmit={submit}><h2>Admin Login</h2><input autoComplete="off" name="admin-login" value={login} onChange={(e)=>setLogin(e.target.value)} placeholder="login"/><input autoComplete="new-password" name="admin-password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="password" type="password"/><button>Войти</button>{error && <p className="error">{error}</p>}</form></div>;
}
