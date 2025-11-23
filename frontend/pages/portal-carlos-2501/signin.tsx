import { useState } from "react";
import { useRouter } from "next/router";
import api from "../api/api";
import styles from "../../styles/login.module.css";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const r = await api.post<{ token?: string; access_token?: string }>(
        "/auth/login",
        { email, password }
      );
      const t = r.data.token || r.data.access_token;
      if (!t) throw new Error();
      localStorage.setItem("token", t);
      router.push("/portal-carlos-2501");
    } catch {
      setErr("Credenciales inválidas");
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        {/* Círculo superior con la chinchilla */}
        <div className={styles.logoCircle}>
          <img
            src="/chinchilla_white_transparent.png"
            alt="Logo Chinchilla"
            className={styles.logoImage}
          />
        </div>

        {err && <div className={styles.error}>{err}</div>}

        <form onSubmit={onSubmit} className={styles.loginForm}>
          <input
            className={styles.input}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <div className={styles.passwordWrapper}>
            <input
              className={styles.input}
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button className={styles.loginBtn}>Entrar</button>
        </form>
      </div>
    </div>
  );
}
