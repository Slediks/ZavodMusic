import React, { useState } from "react";
import { api } from "../../api/adminApi";
import styles from "./Login.module.css";

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

  return (
    <div className={styles.screen}>
      <section className={styles.intro}>
        <p className={styles.kicker}>ZavodMusic</p>
        <h1 className={styles.hero}>Админ-панель медиатеки</h1>
        <p className={styles.copy}>Управление треками, альбомами, авторами, плейлистами и пользователями в одном рабочем центре.</p>
      </section>

      <form className={styles.form} autoComplete="off" onSubmit={submit}>
        <h2 className={styles.title}>Вход</h2>
        <input className={styles.input} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="login" />
        <input className={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <button className={styles.button}>Войти</button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
