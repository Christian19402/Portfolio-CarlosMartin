// pages/admin/contact.tsx
import { useEffect, useMemo, useState } from "react";
import api, { API_ORIGIN } from "../api/api";
import { useRouter } from "next/router";
import styles from "../../styles/contact.module.css"; 

type Block =
  | { type: "text"; content: string; position: number }
  | { type: "image"; url: string; position: number }
  | { type: "video"; url: string; position: number };

type ContactData = {
  title: string;
  intro: string;
  body: string;
  hero_image_url: string | null;
  blocks: Block[];
  footer_note?: string | null;
};

export default function AdminContact() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [data, setData] = useState<ContactData>({
    title: "Contacto",
    intro: "",
    body: "",
    hero_image_url: null,
    blocks: [],
    footer_note: "",
  });

  const [loading, setLoading] = useState(true);
  const [busyTexts, setBusyTexts] = useState(false);
  const [busyBlocks, setBusyBlocks] = useState(false);
  const [busyFooter, setBusyFooter] = useState(false);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) {
      router.replace("/portal-carlos-2501/signin");
      return;
    }
    setToken(t);
    (async () => {
      try {
        const r = await api.get<ContactData>("/contact");
        setData({
          title: r.data.title || "Contacto",
          intro: r.data.intro || "",
          body: r.data.body || "",
          hero_image_url: r.data.hero_image_url || null,
          footer_note: r.data.footer_note ?? "",
          blocks: (r.data.blocks || []).map((b: any, idx: number) => ({
            ...b,
            position: b.position ?? idx,
          })),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const sortedBlocks = useMemo(
    () => [...(data.blocks || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [data.blocks]
  );

  // Secciones separadas
  const imageBlocks = sortedBlocks.filter((b) => b.type === "image");
  const otherBlocks = sortedBlocks.filter((b) => b.type !== "image");

  function setBlocks(next: Block[]) {
    setData((d) => ({ ...d, blocks: next }));
  }

  function move(blocks: Block[], idx: number, dir: -1 | 1, section: "images" | "others") {
    const arr = [...blocks];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const updated = section === "images" ? [...arr, ...otherBlocks] : [...imageBlocks, ...arr];
    setBlocks(updated.map((b, i) => ({ ...b, position: i })));
  }

  function remove(blocks: Block[], idx: number, section: "images" | "others") {
    const arr = [...blocks];
    arr.splice(idx, 1);
    const updated = section === "images" ? [...arr, ...otherBlocks] : [...imageBlocks, ...arr];
    setBlocks(updated.map((b, i) => ({ ...b, position: i })));
  }

  function addText() {
    setBlocks([
      ...sortedBlocks,
      { type: "text", content: "", position: sortedBlocks.length } as Block,
    ]);
  }

  async function addImageLocal(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API_ORIGIN}/api/contact/upload-image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    setBlocks([
      ...sortedBlocks,
      { type: "image", url: j.url, position: sortedBlocks.length } as Block,
    ]);
  }

  async function addVideoLocal(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API_ORIGIN}/api/contact/upload-video`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    setBlocks([
      ...sortedBlocks,
      { type: "video", url: j.url, position: sortedBlocks.length } as Block,
    ]);
  }

  function addVideoUrl(url: string) {
    const clean = url.trim();
    if (!clean) return;
    setBlocks([
      ...sortedBlocks,
      { type: "video", url: clean, position: sortedBlocks.length } as Block,
    ]);
  }

  async function saveTexts(e: React.FormEvent) {
    e.preventDefault();
    setBusyTexts(true);
    try {
      await api.post("/contact", {
        title: data.title,
        intro: data.intro,
        body: data.body,
      });
      alert("Textos guardados");
    } catch {
      alert("No se pudo guardar");
    } finally {
      setBusyTexts(false);
    }
  }

  async function saveBlocks() {
    setBusyBlocks(true);
    try {
      await api.put("/contact/blocks", { blocks: sortedBlocks });
      alert("Bloques guardados");
    } catch {
      alert("No se pudo guardar bloques");
    } finally {
      setBusyBlocks(false);
    }
  }

  async function saveFooter(e: React.FormEvent) {
    e.preventDefault();
    setBusyFooter(true);
    try {
      await api.post("/contact", { footer_note: data.footer_note ?? "" });
      alert("Párrafo guardado");
    } catch {
      alert("No se pudo guardar el párrafo");
    } finally {
      setBusyFooter(false);
    }
  }

  if (loading) return <div className="container mt-4">Cargando…</div>;

  // Estilo tarjeta igual que la pública (variante ligera)
  const panelStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(110,231,231,0.08)",
    borderRadius: 12,
  };

  return (
    <div className="container py-4" style={{ maxWidth: 980 }}>
      <h1 className="mb-3">Editar página de Contacto</h1>

      {/* === TEXTOS PRINCIPALES (mismo look) === */}
      <div className="card card-body mb-4" style={panelStyle}>
        <h5 className="mb-3">Textos</h5>
        <form onSubmit={saveTexts} className="d-grid gap-3">
          <div>
            <label className="form-label">Título</label>
            <input
              className="form-control"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Intro (permite párrafos)</label>
            <div className={styles.textCard} style={{ margin: 0 }}>
              <textarea
                className="form-control"
                rows={4}
                value={data.intro}
                onChange={(e) => setData({ ...data, intro: e.target.value })}
                placeholder="Texto introductorio..."
                style={{ background: "transparent", border: "1px solid rgba(110,231,231,0.12)", color: "#e7f6f6" }}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Cuerpo</label>
            <div className={styles.textCard} style={{ margin: 0 }}>
              <textarea
                className="form-control"
                rows={6}
                value={data.body}
                onChange={(e) => setData({ ...data, body: e.target.value })}
                placeholder="Texto del cuerpo..."
                style={{ background: "transparent", border: "1px solid rgba(110,231,231,0.12)", color: "#e7f6f6" }}
              />
            </div>
          </div>
          <div className="d-flex justify-content-end">
            <button className="btn btn-primary" disabled={busyTexts}>
              {busyTexts ? "Guardando…" : "Guardar textos"}
            </button>
          </div>
        </form>
      </div>

      {/* === IMÁGENES (Grid Carrusel) === */}
      <div className="card card-body mb-4" style={panelStyle}>
        <h5 className="mb-3">Imágenes del carrusel</h5>

        <label className="btn btn-outline-primary mb-3" style={{ width: "fit-content" }}>
          + Añadir imagen
          <input
            type="file"
            accept="image/*"
            className="d-none"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await addImageLocal(f);
              (e.target as HTMLInputElement).value = "";
            }}
          />
        </label>

        {imageBlocks.length === 0 ? (
          <div className="text-muted">No hay imágenes todavía.</div>
        ) : (
          <div
            className="d-grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}
          >
            {imageBlocks.map((b, idx) => (
              <div key={idx} className="p-2" style={panelStyle}>
                <img
                  src={`${b.url.startsWith("http") ? "" : API_ORIGIN}${b.url}`}
                  alt=""
                  style={{ width: "100%", borderRadius: 8, marginBottom: 8 }}
                />
                <div className="d-flex justify-content-center gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => move(imageBlocks, idx, -1, "images")}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => move(imageBlocks, idx, 1, "images")}
                    disabled={idx === imageBlocks.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => remove(imageBlocks, idx, "images")}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === VIDEOS + TEXTOS (tarjeta) === */}
      <div className="card card-body mb-4" style={panelStyle}>
        <h5 className="mb-3">Videos y textos</h5>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button className="btn btn-outline-primary" onClick={addText}>
            + Texto
          </button>

          <label className="btn btn-outline-primary mb-0">
            + Vídeo (archivo)
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              className="d-none"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await addVideoLocal(f);
                (e.target as HTMLInputElement).value = "";
              }}
            />
          </label>

          <AddVideoUrl onAdd={addVideoUrl} />
        </div>

        {otherBlocks.length === 0 ? (
          <div className="text-muted">No hay contenido aún.</div>
        ) : (
          <div className="d-grid" style={{ gap: 12 }}>
            {otherBlocks.map((b, idx) => (
              <div key={idx} className="p-2" style={panelStyle}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <strong>{b.type.toUpperCase()}</strong>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => move(otherBlocks, idx, -1, "others")}
                      disabled={idx === 0}
                    >
                      ↑
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => move(otherBlocks, idx, 1, "others")}
                      disabled={idx === otherBlocks.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => remove(otherBlocks, idx, "others")}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {b.type === "text" && (
                  <div className={styles.textCard} style={{ margin: 0 }}>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={(b as any).content || ""}
                      onChange={(e) => {
                        const arr = [...otherBlocks];
                        (arr[idx] as any).content = e.target.value;
                        const updated = [...imageBlocks, ...arr].map((x, i) => ({ ...x, position: i }));
                        setBlocks(updated);
                      }}
                      placeholder="Texto..."
                      style={{ background: "transparent", border: "1px solid rgba(110,231,231,0.12)", color: "#e7f6f6" }}
                    />
                  </div>
                )}

                {b.type === "video" && (
                  <div className={styles.textCard} style={{ margin: 0 }}>
                    <div className="text-muted" style={{ color: "#bcd6d7" }}>
                      {b.url}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="d-flex justify-content-end mt-3">
          <button className="btn btn-primary" onClick={saveBlocks} disabled={busyBlocks}>
            {busyBlocks ? "Guardando…" : "Guardar bloques"}
          </button>
        </div>
      </div>

      {/* === FOOTER === */}
      <div className="card card-body" style={panelStyle}>
        <h5 className="mb-1">Párrafo bajo “Contact”</h5>
        <form onSubmit={saveFooter} className="d-grid gap-2">
          <div className={styles.textCard} style={{ margin: 0 }}>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Ej.: Escríbeme si crees que podemos colaborar…"
              value={data.footer_note ?? ""}
              onChange={(e) => setData({ ...data, footer_note: e.target.value })}
              style={{ background: "transparent", border: "1px solid rgba(110,231,231,0.12)", color: "#e7f6f6" }}
            />
          </div>
          <div className="d-flex justify-content-end">
            <button className="btn btn-primary" disabled={busyFooter}>
              {busyFooter ? "Guardando…" : "Guardar párrafo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVideoUrl({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onAdd(url.trim());
        setUrl("");
      }}
      className="d-flex gap-2"
    >
      <input
        className="form-control"
        placeholder="Añadir vídeo por URL (YouTube/Vimeo)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: 320 }}
      />
      <button className="btn btn-outline-primary">Añadir</button>
    </form>
  );
}
