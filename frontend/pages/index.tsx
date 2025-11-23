import { NextPage } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import api, { API_ORIGIN } from "./api/api";
import styles from "../styles/Home.module.css";

type Cat = { id: number; name: string };
type CatDetail = {
  id: number;
  name: string;
  images: { id: number; image_url: string }[];
};

type SocialsPublic = {
  linkedin?: { platform: "linkedin"; url: string } | null;
  artstation?: { platform: "artstation"; url: string } | null;
};

const Home: NextPage = () => {
  const [cats, setCats] = useState<CatDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [socials, setSocials] = useState<SocialsPublic>({});
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Cat[]>("/categories/public");
        const details = await Promise.all(
          res.data.map((c) =>
            api.get<CatDetail>(`/categories/${c.id}/detail`).then((r) => r.data)
          )
        );
        setCats(details);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    api
      .get<SocialsPublic>("/socials/public")
      .then((r) => setSocials(r.data || {}))
      .catch(() => setSocials({}));
  }, []);

  const firstCategoryId = cats.length > 0 ? cats[0].id : null;

  function renderIcon(platform: string) {
    const p = platform.toLowerCase();
    if (p === "linkedin") return <i className="bi bi-linkedin" />;

    if (p === "artstation") {
      return <span className={styles.artstationMask} aria-hidden="true" />;
    }
    return null;
  }

  return (
    <div className={styles["home-container"]}>
      {/* Fondo con slider */}
      <div className={styles.slider}>
        {(cats.flatMap((cat) => cat.images) || [])
          .slice(0, 5)
          .map((img, i) => (
            <div
              key={i}
              className={styles.slide}
              style={{ backgroundImage: `url(${API_ORIGIN}${img.image_url})` }}
            />
          ))}
        {(!cats.length || !cats.some((c) => c.images.length)) && (
          <div className={styles.slide} style={{ background: "#111" }} />
        )}
      </div>

      {/* Layout tipo mockup: izquierda imagen / derecha panel */}
      <div className={styles.overlay}>
        <div className={styles.hero}>
          <div className={styles.portrait}>
            <img src="/chinchilla_white_transparent.png" alt="Chinchilla" />
          </div>

          <div className={styles.panel}>
            <h1 className={styles["client-name"]}>Carlos &quot;Fungus&quot; Martin</h1>
            <h2 className={styles["client-role"]}>Technical Artist</h2>

            <div className={styles.buttons}>
              {firstCategoryId && (
                <button
                  className={styles["btn-enter"]}
                  onClick={() => router.push(`/category/${firstCategoryId}`)}
                >
                  Enter
                </button>
              )}
              <button
                className={styles["btn-outline"]}
                onClick={() => router.push("/contact")}
              >
                Contact
              </button>
              <a
                href={`${API_ORIGIN}/api/cv/download`}
                className={styles["btn-cv"]}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download CV
              </a>
            </div>

            <div className={styles["social-icons"]}>
              {socials.linkedin?.url && (
                <a href={socials.linkedin.url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  {renderIcon("linkedin")}
                </a>
              )}
              {socials.artstation?.url && (
                <a href={socials.artstation.url} target="_blank" rel="noopener noreferrer" aria-label="ArtStation">
                  {renderIcon("artstation")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
