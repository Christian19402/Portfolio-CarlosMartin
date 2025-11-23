import { useEffect, useMemo, useState } from "react";
import api, { API_ORIGIN } from "../api/api";
import { useRouter } from "next/router";
import styles from "../../styles/AdminPanel.module.css";

/* =========================
   Tipos
   ========================= */
type Medium = {
  id: number;
  image_url?: string;
  video_url?: string;
  description?: string;
  position?: number;
  is_carousel?: boolean;
  slide_key?: string | null;
};

type Category = { id: number; name: string; description?: string; order?: number };

type MediaBlock = {
  id: number;
  type: "image" | "video";
  url: string;
  description?: string | null;
  position?: number;
  is_carousel?: boolean;
  slide_key?: string | null;
};

type CategoryDetail = {
  id: number;
  name: string;
  description?: string;
  images: Medium[];
  videos: Medium[];
};

/* =========================
   Helpers
   ========================= */
function toBlocks(detail: CategoryDetail): MediaBlock[] {
  const imgs =
    (detail.images || []).map<MediaBlock>((i) => ({
      id: i.id,
      type: "image",
      url: i.image_url || "",
      description: i.description || "",
      position: i.position,
      is_carousel: i.is_carousel,
      slide_key: i.slide_key,
    })) || [];
  const vids =
    (detail.videos || []).map<MediaBlock>((v) => ({
      id: v.id,
      type: "video",
      url: v.video_url || "",
      description: v.description || "",
      position: v.position,
      is_carousel: v.is_carousel,
      slide_key: v.slide_key,
    })) || [];
  return [...imgs, ...vids].sort((a, b) => {
    const pa = a.position ?? 0;
    const pb = b.position ?? 0;
    return pa === pb ? a.id - b.id : pa - pb;
  });
}
function slidesFrom(all: MediaBlock[]) {
  const slides = all.filter((m) => m.is_carousel);
  return slides.length ? slides : all; // fallback si no marcaron nada
}
function fullUrl(u: string) {
  return /^https?:\/\//i.test(u) ? u : `${API_ORIGIN}${u}`;
}
function isVideo(b: MediaBlock) {
  return b.type === "video";
}
function isImage(b: MediaBlock) {
  return b.type === "image";
}

/* =========================
   Página Admin
   ========================= */
export default function AdminPanel() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [error, setError] = useState("");

  // edición de descripciones
  const [saving, setSaving] = useState<number | null>(null);
  const [draftDescriptions, setDraftDescriptions] = useState<Record<number, string>>({});

  // Subida guiada
  const [activeSlideKey, setActiveSlideKey] = useState<string | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [slideDescription, setSlideDescription] = useState("");

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) {
      router.replace("/portal-carlos-2501/signin");
      return;
    }
    setToken(t);
    loadCategories();
  }, [router]);

  async function loadCategories() {
    try {
      const res = await api.get<Category[]>("/categories");
      setCats(res.data);
    } catch {
      setError("No se pudieron cargar las categorías");
    }
  }

  async function loadDetail(cat: Category) {
    setSelected(cat);
    try {
      const res = await api.get<CategoryDetail>(`/categories/${cat.id}/detail`);
      const data = res.data;
      setDetail(data);

      const drafts: Record<number, string> = {};
      (data.images || []).forEach((img) => (drafts[img.id] = img.description || ""));
      (data.videos || []).forEach((v) => (drafts[v.id] = v.description || ""));
      setDraftDescriptions(drafts);
    } catch {
      setDetail(null);
      setError("No se pudo cargar el detalle");
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.post<{ id: number; name: string }>("/categories", { name, description });
      setName("");
      setDescription("");
      await loadCategories();
      loadDetail({ id: res.data.id, name: res.data.name } as Category);
    } catch {
      setError("No se pudo crear la categoría");
    }
  }

  async function deleteCategory(catId: number) {
    if (!confirm("¿Eliminar la categoría completa?")) return;
    try {
      await api.delete(`/categories/${catId}`);
      setSelected(null);
      setDetail(null);
      setActiveSlideKey(null);
      await loadCategories();
    } catch {
      setError("No se pudo eliminar la categoría");
    }
  }

  // Reordenar categorías (↑ / ↓)
  async function reorder(newOrder: number[]) {
    await api.put("/categories/reorder", { ordered_ids: newOrder });
    await loadCategories();
    if (selected) {
      const still = newOrder.find((id) => id === selected.id);
      if (still) {
        const found = cats.find((c) => c.id === still);
        if (found) loadDetail(found);
      }
    }
  }
  function moveUp(idx: number) {
    if (idx <= 0) return;
    const arr = cats.map((c) => c.id);
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    reorder(arr);
  }
  function moveDown(idx: number) {
    if (idx >= cats.length - 1) return;
    const arr = cats.map((c) => c.id);
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    reorder(arr);
  }

  // === Datos calculados
  const allBlocks = useMemo(() => (detail ? toBlocks(detail) : []), [detail]);
  const slideBlocks = useMemo(() => slidesFrom(allBlocks), [allBlocks]);

  // asignar slide activa por defecto
  useEffect(() => {
    if (!slideBlocks.length) {
      setActiveSlideKey(null);
      return;
    }
    if (!activeSlideKey) {
      const firstWithKey = slideBlocks.find((s) => s.slide_key);
      setActiveSlideKey(firstWithKey?.slide_key ?? null);
    }
  }, [slideBlocks.length]);

  const itemsBySlide = useMemo(() => {
    const map: Record<string, MediaBlock[]> = {};
    for (const m of allBlocks) {
      if (m.is_carousel) continue;
      if (!m.slide_key) continue;
      map[m.slide_key] ??= [];
      map[m.slide_key].push(m);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return map;
  }, [allBlocks]);

  const stats = useMemo(() => {
    const slides = slideBlocks.length;
    const items = allBlocks.filter((b) => !b.is_carousel).length;
    const imgItems = allBlocks.filter((b) => !b.is_carousel && b.type === "image").length;
    const vidItems = allBlocks.filter((b) => !b.is_carousel && b.type === "video").length;
    return { slides, items, imgItems, vidItems };
  }, [slideBlocks, allBlocks]);

  // === Subida
  async function addSlideFile(file: File, type: "image" | "video") {
    if (!detail) return;
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);
    fd.append("is_carousel", "true"); // crea slide
    if (slideDescription.trim()) fd.append("description", slideDescription.trim());
    await fetch(`${API_ORIGIN}/api/categories/${detail.id}/media`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
    });
    setSlideDescription("");
    await loadDetail({ id: detail.id, name: detail.name });
  }

  async function addItemFile(file: File, type: "image" | "video") {
    if (!detail) return;
    if (!activeSlideKey) {
      alert("Selecciona primero una diapositiva.");
      return;
    }
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);
    fd.append("is_carousel", "false");
    fd.append("slide_key", activeSlideKey);
    if (itemDescription.trim()) fd.append("description", itemDescription.trim());
    await fetch(`${API_ORIGIN}/api/categories/${detail.id}/media`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
    });
    setItemDescription("");
    await loadDetail({ id: detail.id, name: detail.name });
  }

  async function deleteMedia(mediaId: number) {
    await api.delete(`/categories/media/${mediaId}`);
    if (selected) await loadDetail(selected);
  }

  async function saveDescription(mediaId: number) {
    setSaving(mediaId);
    try {
      const desc = draftDescriptions[mediaId] || "";
      await api.patch(`/categories/media/${mediaId}/meta`, { description: desc });
      if (selected) await loadDetail(selected);
    } catch {
      alert("No se pudo actualizar la descripción");
    }
    setSaving(null);
  }

  async function moveMediaToSlide(mediaId: number, newKey: string | null) {
    try {
      await api.patch(`/categories/media/${mediaId}/meta`, { slide_key: newKey || "" });
      if (selected) await loadDetail(selected);
    } catch {
      alert("No se pudo mover el item");
    }
  }

  async function bumpPosition(mediaId: number, currentPos = 0, dir: -1 | 1) {
    try {
      await api.patch(`/categories/media/${mediaId}/meta`, { position: (currentPos || 0) + dir });
      if (selected) await loadDetail(selected);
    } catch {
      alert("No se pudo reordenar");
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} container py-4`}>
        <h1 className={`${styles.title} mb-3`}>Panel de administración</h1>
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Crear categoría */}
        <form
          onSubmit={createCategory}
          className={`card card-body mb-4 ${styles.card} ${styles.createCategoryCard}`}
        >
          <h5 className="mb-3">Nueva categoría</h5>
          <div className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="col-md-2 d-grid">
              <button className="btn btn-primary">Crear</button>
            </div>
          </div>
        </form>

        <div className="row">
          {/* Columna izquierda */}
          <div className={`col-md-4 ${styles.leftColumn} ${styles.colNoStretch}`}>
            <div className={`list-group ${styles.listGroup}`}>
              {cats.map((c, idx) => (
                <div
                  key={c.id}
                  className={`list-group-item d-flex align-items-center justify-content-between ${styles.catBtn} ${
                    selected?.id === c.id ? styles.catBtnActive : ""
                  }`}
                  style={{ gap: 8 }}
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    title="Subir"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    title="Bajar"
                    onClick={() => moveDown(idx)}
                    disabled={idx === cats.length - 1}
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    className="btn btn-link text-start flex-grow-1"
                    onClick={() => loadDetail(c)}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {c.name}
                  </button>
                </div>
              ))}
            </div>

            {selected && (
              <button
                className={`btn btn-outline-danger mt-3 ${styles.dangerOutline}`}
                onClick={() => deleteCategory(selected.id)}
              >
                Eliminar categoría
              </button>
            )}

            <SocialsEditor />
            <CvManager token={token} />
          </div>

          {/* Columna derecha */}
          <div className="col-md-8">
            {!selected || !detail ? (
              <div className="text-muted">Selecciona una categoría para gestionarla</div>
            ) : (
              <>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5 className="mb-0">Gestionando: {detail.name}</h5>
                  <div className={styles.stats}>
                    <span className={styles.statPill}>Slides: {stats.slides}</span>
                    <span className={styles.statPill}>Items: {stats.items}</span>
                    <span className={styles.statPill}>IMG: {stats.imgItems}</span>
                    <span className={styles.statPill}>VID: {stats.vidItems}</span>
                  </div>
                </div>

                {/* Zonas de subida (sin filtros ni vista plana) */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className={`card card-body ${styles.card} ${styles.dropCardSlide}`}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Añadir <strong>DIAPOSITIVA</strong></h6>
                        <span className={styles.badgeSlide}>SLIDE</span>
                      </div>

                      {/* Descripción de la DIAPOSITIVA (nuevo) */}
                      <label className="form-label">Descripción de la diapositiva (opcional)</label>
                      <textarea
                        className={`form-control mb-2 ${styles.descArea}`}
                        rows={2}
                        value={slideDescription}
                        onChange={(e) => setSlideDescription(e.target.value)}
                        placeholder="Texto para la diapositiva"
                      />

                      <div className="row g-2">
                        <div className="col-12">
                          <label className="form-label">Imagen (archivo local)</label>
                          <input
                            type="file"
                            accept="image/*"
                            className={`form-control ${styles.fileInput}`}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) await addSlideFile(f, "image");
                              (e.target as HTMLInputElement).value = "";
                            }}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Vídeo (archivo local)</label>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/ogg"
                            className={`form-control ${styles.fileInput}`}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) await addSlideFile(f, "video");
                              (e.target as HTMLInputElement).value = "";
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className={`card card-body ${styles.card} ${styles.dropCardItem}`}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">
                          Añadir <strong>ITEM</strong> a:
                          <select
                            className="form-select d-inline-block ms-2"
                            value={activeSlideKey || ""}
                            onChange={(e) => setActiveSlideKey(e.target.value || null)}
                            style={{ width: 220 }}
                          >
                            <option value="">(elige diapositiva)</option>
                            {slideBlocks
                              .filter((s) => s.slide_key)
                              .map((s) => (
                                <option key={s.slide_key!} value={s.slide_key!}>
                                  {s.slide_key}
                                </option>
                              ))}
                          </select>
                        </h6>
                        <span className={styles.badgeItem}>ITEM</span>
                      </div>

                      <label className="form-label">Descripción del item (opcional)</label>
                      <textarea
                        className={`form-control mb-2 ${styles.descArea}`}
                        rows={2}
                        value={itemDescription}
                        onChange={(e) => setItemDescription(e.target.value)}
                        placeholder="Texto que acompañará a este item"
                      />

                      <div className="row g-2">
                        <div className="col-12">
                          <label className="form-label">Imagen (archivo local)</label>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={!activeSlideKey}
                            className={`form-control ${styles.fileInput}`}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) await addItemFile(f, "image");
                              (e.target as HTMLInputElement).value = "";
                            }}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Vídeo (archivo local)</label>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/ogg"
                            disabled={!activeSlideKey}
                            className={`form-control ${styles.fileInput}`}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) await addItemFile(f, "video");
                              (e.target as HTMLInputElement).value = "";
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agrupado por diapositiva (con edición de descripción para SLIDE e Items) */}
                <div className={`card card-body mb-3 ${styles.card}`}>
                  <h6 className="mb-3">Diapositivas e Items (agrupados)</h6>

                  {slideBlocks.filter((s) => s.slide_key).length === 0 ? (
                    <div className="text-muted">Aún no hay diapositivas.</div>
                  ) : (
                    slideBlocks
                      .filter((s) => s.slide_key)
                      .map((s) => {
                        const sk = s.slide_key!;
                        const group = itemsBySlide[sk] || [];
                        return (
                          <div key={sk} className={styles.slideGroup}>
                            <div className={styles.slideHeader}>
                              <div className="d-flex align-items-center gap-2">
                                <span className={styles.badgeSlide}>SLIDE</span>
                                <span className="fw-semibold">{sk}</span>
                                <span className={styles.typeChip}>{s.type.toUpperCase()}</span>
                                <span className={styles.posChip}>#{s.position ?? 0}</span>
                                <button
                                  className={`btn btn-sm ${styles.selectBtn}`}
                                  onClick={() => setActiveSlideKey(sk)}
                                  title="Trabajar con esta slide"
                                >
                                  Seleccionar
                                </button>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <span className={styles.countPill}>Items: {group.length}</span>
                                <button
                                  className="btn btn-sm btn-outline-light"
                                  title="Subir de posición"
                                  onClick={() => bumpPosition(s.id, s.position || 0, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-light"
                                  title="Bajar de posición"
                                  onClick={() => bumpPosition(s.id, s.position || 0, 1)}
                                >
                                  ↓
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteMedia(s.id)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>

                            {/* preview de la slide */}
                            <div className={styles.slidePreview}>
                              {isImage(s) ? (
                                <img src={fullUrl(s.url)} alt="" />
                              ) : (
                                <video src={fullUrl(s.url)} controls />
                              )}
                            </div>

                            {/* edición de descripción de la SLIDE (nuevo) */}
                            <div className="mb-3">
                              <label className="form-label">Descripción de la diapositiva</label>
                              <textarea
                                className={`form-control ${styles.descArea}`}
                                rows={2}
                                value={draftDescriptions[s.id] ?? s.description ?? ""}
                                onChange={(e) =>
                                  setDraftDescriptions({
                                    ...draftDescriptions,
                                    [s.id]: e.target.value,
                                  })
                                }
                                placeholder="Descripción"
                              />
                              <div className="d-flex gap-2 mt-2">
                                <button
                                  className={`btn btn-sm ${styles.btnSave}`}
                                  disabled={saving === s.id}
                                  onClick={() => saveDescription(s.id)}
                                >
                                  {saving === s.id ? "Guardando..." : "Guardar"}
                                </button>
                              </div>
                            </div>

                            {/* items de esta slide */}
                            {group.length === 0 ? (
                              <div className="text-muted">Sin items aún.</div>
                            ) : (
                              <div className={styles.itemsGrid}>
                                {group.map((it) => (
                                  <div key={it.id} className={styles.itemCard}>
                                    <div className={styles.itemHeader}>
                                      <div className="d-flex align-items-center gap-2">
                                        <span className={styles.badgeItem}>ITEM</span>
                                        <span className={styles.typeChip}>{it.type.toUpperCase()}</span>
                                        <span className={styles.posChip}>#{it.position ?? 0}</span>
                                      </div>
                                      <div className="d-flex align-items-center gap-2">
                                        <button
                                          className="btn btn-sm btn-outline-light"
                                          title="Subir"
                                          onClick={() => bumpPosition(it.id, it.position || 0, -1)}
                                        >
                                          ↑
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-light"
                                          title="Bajar"
                                          onClick={() => bumpPosition(it.id, it.position || 0, 1)}
                                        >
                                          ↓
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => deleteMedia(it.id)}
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>

                                    <div className={styles.itemMediaBox}>
                                      {isImage(it) ? (
                                        <img src={fullUrl(it.url)} alt="" />
                                      ) : (
                                        <video src={fullUrl(it.url)} controls />
                                      )}
                                    </div>

                                    <div className="mt-2">
                                      <label className="form-label">Descripción</label>
                                      <textarea
                                        className={`form-control ${styles.descArea}`}
                                        rows={2}
                                        value={draftDescriptions[it.id] || ""}
                                        onChange={(e) =>
                                          setDraftDescriptions({
                                            ...draftDescriptions,
                                            [it.id]: e.target.value,
                                          })
                                        }
                                        placeholder="Descripción"
                                      />
                                      <div className="d-flex gap-2 mt-2">
                                        <button
                                          className={`btn btn-sm ${styles.btnSave}`}
                                          disabled={saving === it.id}
                                          onClick={() => saveDescription(it.id)}
                                        >
                                          {saving === it.id ? "Guardando..." : "Guardar"}
                                        </button>

                                        <select
                                          className="form-select form-select-sm"
                                          value={it.slide_key || ""}
                                          onChange={(e) => moveMediaToSlide(it.id, e.target.value || null)}
                                          style={{ maxWidth: 220 }}
                                          title="Mover a otra slide"
                                        >
                                          <option value="">(sin slide)</option>
                                          {slideBlocks
                                            .filter((s2) => s2.slide_key)
                                            .map((s2) => (
                                              <option key={s2.slide_key!} value={s2.slide_key!}>
                                                {s2.slide_key}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Extras: redes y CV (sin cambios)
   ========================= */
function SocialsEditor() {
  const [linkedin, setLinkedin] = useState("");
  const [artstation, setArtstation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"linkedin" | "artstation" | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.get("/socials/public");
        const data: any = r.data || {};
        setLinkedin(data?.linkedin?.url || "");
        setArtstation(data?.artstation?.url || "");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function normalize(u: string) {
    const t = u.trim();
    return !t ? "" : /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }

  async function save(platform: "linkedin" | "artstation", url: string) {
    try {
      setSaving(platform);
      const clean = normalize(url);
      if (!clean) await api.delete(`/socials/${platform}`);
      else await api.post("/socials", { platform, url: clean });
      alert("Guardado");
    } catch {
      alert("No se pudo guardar");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="text-muted mt-4">Cargando redes…</div>;

  return (
    <div className={`card card-body mt-4 ${styles.card}`}>
      <h5 className="mb-3">Redes sociales</h5>
      <div className="mb-2">
        <label className="form-label"><strong>LinkedIn</strong></label>
        <div className="d-flex gap-2">
          <input className="form-control" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          <button
            className="btn btn-outline-primary"
            disabled={saving === "linkedin"}
            onClick={() => save("linkedin", linkedin)}
          >
            {saving === "linkedin" ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
      <div>
        <label className="form-label"><strong>ArtStation</strong></label>
        <div className="d-flex gap-2">
          <input className="form-control" value={artstation} onChange={(e) => setArtstation(e.target.value)} />
          <button
            className="btn btn-outline-primary"
            disabled={saving === "artstation"}
            onClick={() => save("artstation", artstation)}
          >
            {saving === "artstation" ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CvManager({ token }: { token: string | null }) {
  const [hasCv, setHasCv] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    check();
  }, []);
  async function check() {
    try {
      const r = await fetch(`${API_ORIGIN}/api/cv/download`, { method: "GET" });
      setHasCv(r.ok);
    } catch {
      setHasCv(false);
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert("Selecciona un PDF");
    if (!/\.pdf$/i.test(file.name)) return alert("Debe ser un .pdf");
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`${API_ORIGIN}/api/cv/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
      });
      setFile(null);
      await check();
      alert("CV subido");
    } catch {
      alert("No se pudo subir");
    } finally {
      setBusy(false);
    }
  }

  async function removeCv() {
    if (!confirm("¿Eliminar el CV?")) return;
    try {
      setBusy(true);
      await api.delete("/cv/");
      await check();
      alert("CV eliminado");
    } catch {
      alert("No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card card-body mt-4 ${styles.card}`}>
      <h5 className="mb-3">Currículum (PDF)</h5>
      {hasCv === null ? (
        <div className="text-muted mb-3">Comprobando…</div>
      ) : hasCv ? (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <span>Ya hay un CV subido.</span>
          <div className="d-flex gap-2">
            <a
              className="btn btn-outline-secondary btn-sm"
              href={`${API_ORIGIN}/api/cv/download`}
              target="_blank"
              rel="noreferrer"
            >
              Ver/descargar
            </a>
            <button className="btn btn-outline-danger btn-sm" disabled={busy} onClick={removeCv}>
              {busy ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">No hay CV subido todavía.</div>
      )}

      <form onSubmit={upload} className="d-flex gap-2 align-items-center">
        <input
          type="file"
          accept="application/pdf"
          className="form-control"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={busy}
        />
        <button className="btn btn-primary" disabled={busy || !file}>
          {busy ? "Subiendo…" : "Subir PDF"}
        </button>
      </form>
    </div>
  );
}
