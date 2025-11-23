import axios from "axios";

export const API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_ORIGIN || "http://127.0.0.1:5000").replace(/\/$/, "");

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`, // 👈 usamos /api aquí
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${t}`;
    }
  }
  return config;
});

export default api;
