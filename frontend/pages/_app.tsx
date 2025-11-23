import { useEffect } from "react";
import type { AppProps } from "next/app";

import Layout from "../components/layout";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Fuerza dark por si algo lo quita
    document.documentElement.setAttribute("data-bs-theme", "dark");

    // eslint-disable-next-line
    // @ts-ignore
    import("bootstrap/dist/js/bootstrap.bundle.min.js")
      .then(() => console.log("Bootstrap JS cargado ✅"))
      .catch((err) => console.error("Error al cargar Bootstrap JS ❌", err));
  }, []);

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
