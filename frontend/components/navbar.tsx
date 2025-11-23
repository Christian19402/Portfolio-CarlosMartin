import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import api, { API_ORIGIN } from "../pages/api/api";
import styles from "../styles/navbar.module.css";

type Cat = { id: number; name: string };

export default function Navbar() {
  const [cats, setCats] = useState<Cat[]>([]);
  const router = useRouter();

  useEffect(() => {
    api
      .get<Cat[]>("/categories/public")
      .then((res) => setCats(res.data))
      .catch(() => setCats([]));
  }, []);


  if (router.pathname === "/") return null;

  return (
    <nav className={`navbar navbar-expand-lg ${styles.siteNav}`}>
      <div className="container-fluid px-3 px-lg-4">
        <Link className="navbar-brand" href="/">
          Carlos Martin | Portfolio
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navMain"
          aria-controls="navMain"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse ${styles.navbarLine}`} id="navMain">
          <ul className={`navbar-nav ${styles.navCenter}`}>
            {cats.map((c) => (
              <li key={c.id} className="nav-item">
                <Link className="nav-link" href={`/category/${c.id}`}>
                  {c.name}
                </Link>
              </li>
            ))}
            <li className="nav-item">
              <Link className="nav-link" href="/contact">
                Contact
              </Link>
            </li>
          </ul>

          <div className="d-none d-lg-block ms-lg-3">
            <a
              className="btn btn-sm btn-outline-primary"
              href={`${API_ORIGIN}/api/cv/download`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download CV
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
