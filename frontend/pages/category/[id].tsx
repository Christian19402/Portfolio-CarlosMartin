import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import api, { API_ORIGIN } from "../api/api";
import styles from "../../styles/category.module.css";

type TimelineItem = {
  id: number;
  type: "image" | "video";
  url: string;
  description?: string;
  position?: number;
  is_carousel?: boolean;
  slide_key?: string | null;
};

type Medium = {
  id: number;
  image_url?: string;
  video_url?: string;
  description?: string;
  position?: number;
  is_carousel?: boolean;
  slide_key?: string | null;
};

type Category = {
  id: number;
  name: string;
  description?: string;
  images: Medium[];
  videos: Medium[];
  timeline?: TimelineItem[];
};

function fullUrl(u: string) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API_ORIGIN}${u}`;
}


function getYouTubeId(url: string): string | null {
  const a = url.match(/youtu\.be\/([^?]+)/i)?.[1];
  const b = url.match(/v=([^&]+)/i)?.[1];
  return a || b || null;
}

function toEmbedUrl(raw: string) {
  const url = fullUrl(raw || "");
  if (/youtu\.be\/|youtube\.com\/watch\?v=/i.test(url)) {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (/vimeo\.com\/(\d+)/i.test(url)) {
    const id = url.match(/vimeo\.com\/(\d+)/i)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  return url;
}

function toAutoplayEmbedUrl(raw: string) {
  const base = toEmbedUrl(raw);
  // YouTube
  if (/youtube\.com\/embed\//i.test(base)) {
    const id = base.match(/embed\/([^?]+)/i)?.[1] || getYouTubeId(raw) || "";
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      playsinline: "1",
      loop: "1",
      playlist: id,
      rel: "0",
      modestbranding: "1",
      controls: "0",
    });
    return `${base}?${params.toString()}`;
  }
  // Vimeo
  if (/player\.vimeo\.com\/video\//i.test(base)) {
    const params = new URLSearchParams({
      autoplay: "1",
      muted: "1",
      loop: "1",
      background: "1", 
      autopause: "0",
    });
    return `${base}?${params.toString()}`;
  }

  return base;
}

export default function CategoryPage() {
  const router = useRouter();
  const { id } = router.query;

  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string>("");
  const [slideIndex, setSlideIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    const catId = Array.isArray(id) ? id[0] : id;
    api
      .get(`/categories/${catId}/detail`)
      .then((res) => setCategory(res.data as Category))
      .catch(() => setError("Failed to load the category."));
  }, [id]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handler = () => {
      const inner = el.querySelector(".carousel-inner");
      if (!inner) return;
      const items = Array.from(inner.querySelectorAll(".carousel-item"));
      const idx = items.findIndex((it) => it.classList.contains("active"));
      if (idx >= 0) setSlideIndex(idx);
    };
    el.addEventListener("slid.bs.carousel", handler as any);
    return () => el.removeEventListener("slid.bs.carousel", handler as any);
  }, [category]);

  const allMedia: TimelineItem[] = useMemo(() => {
    const imgs =
      (category?.images || []).map<TimelineItem>((i) => ({
        id: i.id,
        type: "image",
        url: i.image_url || "",
        description: i.description,
        position: i.position,
        is_carousel: i.is_carousel,
        slide_key: i.slide_key,
      })) || [];
    const vids =
      (category?.videos || []).map<TimelineItem>((v) => ({
        id: v.id,
        type: "video",
        url: v.video_url || "",
        description: v.description,
        position: v.position,
        is_carousel: v.is_carousel,
        slide_key: v.slide_key,
      })) || [];
    return [...imgs, ...vids].sort((a, b) => {
      const pa = a.position ?? 0;
      const pb = b.position ?? 0;
      return pa === pb ? a.id - b.id : pa - pb;
    });
  }, [category?.images, category?.videos]);

  const slides: TimelineItem[] = useMemo(() => {
    const s = allMedia.filter((m) => m.is_carousel);
    return s.length ? s : (category?.timeline?.length ? category.timeline! : allMedia);
  }, [allMedia, category?.timeline]);

  const activeSlide = slides[slideIndex];

  const bySlide = useMemo(() => {
    const map: Record<string, TimelineItem[]> = {};
    for (const m of allMedia) {
      if (m.is_carousel) continue;
      if (!m.slide_key) continue;
      map[m.slide_key] ??= [];
      map[m.slide_key].push(m);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return map;
  }, [allMedia]);

  const subcontent: TimelineItem[] = useMemo(() => {
    if (!activeSlide?.slide_key) return [];
    return bySlide[activeSlide.slide_key] || [];
  }, [activeSlide?.slide_key, bySlide]);

  if (error) return <div className="container mt-4 text-danger">{error}</div>;
  if (!category) return <div className="container mt-4">Loading</div>;

  const carouselId = `cat-carousel-${category.id}`;

  return (
    <div className={styles.pageBg}>
      <div className={`container mt-4 ${styles.categoryPage}`}>
        {category.description && <p>{category.description}</p>}

        {slides.length > 0 ? (
          <>
            <div
              id={carouselId}
              className={`carousel slide ${styles.carouselBlock}`}
              ref={carouselRef}
              data-bs-ride="false"
            >
              <div className="carousel-inner">
                {slides.map((item, index) => {
                  const isActive = index === 0 ? "active" : "";
                  const raw = fullUrl(item.url);
                  const isIframe = /youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/\d+/i.test(raw);
                  const embedAuto = toAutoplayEmbedUrl(raw);

                  return (
                    <div key={`${item.type}-${item.id}`} className={`carousel-item ${isActive}`}>
                      <div className={styles.heroWrapper}>
                        {item.type === "image" ? (
                          <img
                            src={raw}
                            alt={item.description || `img-${item.id}`}
                            className={styles.heroMedia}
                          />
                        ) : isIframe ? (
                          <iframe
                            src={embedAuto}
                            title={item.description || "video"}
                            allow="autoplay; fullscreen; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className={styles.heroMedia}
                          />
                        ) : (
                          <video
                            src={embedAuto}
                            className={styles.heroMedia}
                            muted
                            autoPlay
                            playsInline
                            loop
                          />
                        )}
                      </div>

                      {item.description && (
                        <div className={styles.heroDesc}>{item.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {slides.length > 1 && (
                <>
                  <button
                    className="carousel-control-prev"
                    type="button"
                    data-bs-target={`#${carouselId}`}
                    data-bs-slide="prev"
                  >
                    <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Prev</span>
                  </button>
                  <button
                    className="carousel-control-next"
                    type="button"
                    data-bs-target={`#${carouselId}`}
                    data-bs-slide="next"
                  >
                    <span className="carousel-control-next-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Next</span>
                  </button>
                </>
              )}
            </div>

            {subcontent.length > 0 && (
              <div className={styles.itemsSection}>
                {subcontent.map((it, idx) => {
                  const raw = fullUrl(it.url);
                  const isImg = it.type === "image";
                  const isIframe = /youtube\.com|youtu\.be|vimeo\.com/i.test(raw);
                  const reverse = idx % 2 === 1;

                  return (
                    <div
                      key={`${it.type}-${it.id}`}
                      className={`row align-items-center g-4 ${styles.itemRow} ${reverse ? "flex-row-reverse" : ""}`}
                    >
                      <div className="col-md-6">
                        <div className={styles.itemBox}>
                          {isImg ? (
                            <img src={raw} className={styles.itemMedia} alt={it.description || ""} />
                          ) : isIframe ? (
                            <iframe
                              src={toAutoplayEmbedUrl(raw)}
                              allow="autoplay; fullscreen"
                              allowFullScreen
                              className={styles.itemMedia}
                              title={it.description || "video"}
                            />
                          ) : (
                            <video
                              src={raw}
                              className={styles.itemMedia}
                              muted
                              autoPlay
                              playsInline
                              loop
                            />
                          )}
                        </div>
                      </div>
                      <div className={`col-md-6 ${styles.itemTextCol}`}>
                        {it.description && (
                          <div className={styles.itemDesc}>{it.description}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted">This category not have any content yet.</p>
        )}
      </div>
    </div>
  );
}
