import { useEffect, useState } from "react";
import api, { API_ORIGIN } from "./api/api";
import styles from "../styles/contact.module.css";

type Block =
  | { type: "text"; content: string; position: number }
  | {
      type: "image";
      url: string;
      caption?: string;
      position: number;
      in_carousel?: boolean; // ✅ usado para la tira
    }
  | {
      type: "video";
      url: string;
      caption?: string;
      position: number;
      in_carousel?: boolean;
    };

type ContactData = {
  title: string;
  intro: string;
  body: string;
  hero_image_url: string | null;
  blocks: Block[];
  footer_note?: string | null;
};

type SocialsPublic = {
  linkedin?: { platform: "linkedin"; url: string } | null;
  artstation?: { platform: "artstation"; url: string } | null;
};

export default function ContactPage() {
  const [data, setData] = useState<ContactData | null>(null);
  const [err, setErr] = useState("");
  const [socials, setSocials] = useState<SocialsPublic>({});
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Formulario
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  const full = (u: string) => (u.startsWith("http") ? u : `${API_ORIGIN}${u}`);

  // Datos página contacto
  useEffect(() => {
    api
      .get<ContactData>("/contact/public")
      .then((r) => setData(r.data))
      .catch(() => setErr("Failed to load the contact page."));
  }, []);

  // Redes sociales
  useEffect(() => {
    api
      .get<SocialsPublic>("/socials/public")
      .then((r) => setSocials(r.data || {}))
      .catch(() => setSocials({}));
  }, []);

  // Tira: usa imágenes marcadas (in_carousel) o fallback a categorías
  useEffect(() => {
    async function loadFallbackFromCategories() {
      try {
        const cats = await api.get<{ id: number; name: string }[]>(
          "/categories/public"
        );
        const allImages: string[] = [];
        for (const c of cats.data) {
          const det = await api.get<{
            images?: { image_url?: string | null }[];
          }>(`/categories/${c.id}/detail`);
          det.data.images?.forEach((img) => {
            if (img?.image_url) allImages.push(`${API_ORIGIN}${img.image_url}`);
          });
        }
        setThumbnails(allImages);
      } catch {
        setThumbnails([]);
      }
    }

    if (!data) return;

const chosen =
  data.blocks
    ?.filter((b) => b.type === "image")
    .map((b: any) => full(b.url || "")) || [];


    if (chosen.length > 0) {
      setThumbnails(chosen);
    } else {
      loadFallbackFromCategories();
    }
  }, [data]);

  if (err) return <div className="container mt-4 text-danger">{err}</div>;
  if (!data) return <div className="container mt-4">Loading...</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    if (website.trim() !== "") return; // bot
    if (!name.trim() || !lastName.trim() || !email.trim() || !content.trim())
      return;

    try {
      setSending(true);
      await api.post("/messages", {
        name: name.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        content: content.trim(),
      });
      setOk("Thank you! Your message was sent successfully. Carlos will read it soon.");
      setName("");
      setLastName("");
      setEmail("");
      setContent("");
    } catch {
      alert("Failed to send your message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.pageBg}>
      <div className={styles.contactContainer}>
        {/* === Título === */}
        <h1 className={styles.title}>{data.title || "Contacto"}</h1>

        {/* === Tira animada === */}
        {thumbnails.length > 0 && (
          <div className={styles.thumbStrip}>
            <div className={styles.thumbTrack}>
              {[...thumbnails, ...thumbnails].map((url, i) => (
                <div key={i} className={styles.thumb}>
                  <img src={url} alt={`thumb-${i}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === Intro + Cuerpo === */}
        {(data.intro || data.body) && (
          <section className={styles.twoCol}>
            {data.intro && (
              <div className={styles.colIntro}>
                <p className={styles.intro}>{data.intro}</p>
              </div>
            )}
            {data.body && (
              <div className={styles.colBody}>
                <div className={styles.textCard}>
                  <p className={styles.richText}>{data.body}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* === Redes sociales === */}
        {(socials.linkedin?.url || socials.artstation?.url) && (
          <div className={styles.socialRow}>
            <div className={styles.socialIcons}>
              {socials.linkedin?.url && (
                <a
                  href={socials.linkedin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <i className="bi bi-linkedin" />
                </a>
              )}
              {socials.artstation?.url && (
                <a
                  href={socials.artstation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ArtStation"
                >
                  <span className={styles.artstationMask} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className={styles.blocks}>
          {data.blocks
            ?.filter((b) => b.type !== "image")   
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((b, i) => {
              if (b.type === "text") {
                return (
                  <div key={i} className={styles.textCard}>
                    <p className={styles.richText}>{(b as any).content}</p>
                  </div>
                );
              }
              const vurl = (b as any).url || "";
              const isYouTube =
                /youtube\.com\/watch\?v=|youtu\.be\//i.test(vurl);
              const isVimeo = /vimeo\.com\/\d+/i.test(vurl);
              let embed = vurl;
              if (isYouTube) {
                const id =
                  vurl.match(/v=([^&]+)/i)?.[1] ||
                  vurl.match(/youtu\.be\/([^?]+)/i)?.[1];
                if (id) embed = `https://www.youtube.com/embed/${id}`;
              } else if (isVimeo) {
                const id = vurl.match(/vimeo\.com\/(\d+)/i)?.[1];
                if (id) embed = `https://player.vimeo.com/video/${id}`;
              } else if (!vurl.startsWith("http")) {
                embed = full(vurl);
              }

              return (
                <div
                  key={i}
                  className={`${styles.mediaWrapper} ${styles.mediaShadow}`}
                >
                  {isYouTube || isVimeo ? (
                    <iframe
                      src={embed}
                      title="video"
                      allowFullScreen
                      className={styles.mediaFill}
                    />
                  ) : (
                    <video src={embed} controls className={styles.mediaFill} />
                  )}
                </div>
              );
            })}
        </div>

        {/* === Formulario centrado en carril central === */}
        <section className={styles.gridForm}>
          <div className={styles.formCenter}>
            <h3 className={styles.formTitle}>Contact</h3>

            {data.footer_note && (
              <div className={styles.textCard} style={{ marginBottom: 12 }}>
                <p className={styles.richText}>{data.footer_note}</p>
              </div>
            )}

            {ok && <div className={styles.successMsg}>{ok}</div>}

            <form onSubmit={submit} className={styles.formCard}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className={styles.label}>First Name</label>
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className={styles.label}>Last Name</label>
                  <input
                    className={styles.input}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>Email Address</label>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Honeypot */}
              <div
                style={{ position: "absolute", left: "-10000px" }}
                aria-hidden="true"
              >
                <label>Website</label>
                <input
                  type="text"
                  tabIndex={-1}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div>
                <label className={styles.label}>Message</label>
                <textarea
                  className={styles.textarea}
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="d-flex justify-content-end">
                <button className={styles.btnSend} disabled={sending}>
                  {sending ? "Sending…" : "SUBMIT"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
