"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TOTAL_FRAMES = 169;
const FRAME_PATH = (n: number) =>
  `/about/frames/frame_${String(n).padStart(4, "0")}.jpg`;

/** iPhone in portrait only: full-width copy, no canvas / scroll-driven frames / GSAP. */
function isIPhonePortrait(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPhone = /iPhone/i.test(ua);
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  return isIPhone && portrait;
}

interface Props {
  siteName: string;
}

export function AboutClient({ siteName }: Props) {
  const [useStaticIPhoneLayout, setUseStaticIPhoneLayout] = useState(false);

  useLayoutEffect(() => {
    function resolve() {
      setUseStaticIPhoneLayout(isIPhonePortrait());
    }
    resolve();
    const mq = window.matchMedia("(orientation: portrait)");
    mq.addEventListener("change", resolve);
    window.addEventListener("resize", resolve);
    return () => {
      mq.removeEventListener("change", resolve);
      window.removeEventListener("resize", resolve);
    };
  }, []);

  if (useStaticIPhoneLayout) {
    return <AboutStaticIPhone siteName={siteName} />;
  }

  return <AboutScrollAnimation siteName={siteName} />;
}

const PILLARS: [string, string][] = [
  ["Coverage you can rely on", "timely, accurate reporting on local government, development, and business."],
  ["People first, tools second", "we use AI-assisted workflows to move faster on public records and meetings—every story is edited and approved by human journalists before it reaches readers."],
  ["Built for residents", "to keep people informed, engaged, and connected to decisions that affect daily life."],
  ["Access matters", "trustworthy local information should be easy to find—not buried in algorithms or rumor."],
];

/** Full-width About copy for iPhone portrait — no canvas, no marquee animation, no Lenis/GSAP. */
function AboutStaticIPhone({ siteName }: Props) {
  const Gap = () => <div style={{ height: "1.75rem" }} />;

  return (
    <main
      className="about-static-iphone"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100dvh",
        boxSizing: "border-box",
        paddingBottom: "2.5rem",
        background: "var(--color-page, #fafafa)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          paddingLeft: "clamp(1rem, 5vw, 1.5rem)",
          paddingRight: "clamp(1rem, 5vw, 1.5rem)",
          paddingTop: "clamp(1rem, 4vh, 2rem)",
        }}
      >
        <div style={{ paddingTop: "0.5rem", paddingBottom: "0.25rem" }}>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-red-hat)",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--color-riviera-blue)",
              marginBottom: "0.75rem",
            }}
          >
            001 / About
          </span>
          <h1
            style={{
              fontFamily: "var(--font-newsreader)",
              fontWeight: 800,
              fontSize: "clamp(1.85rem, 8vw, 2.4rem)",
              lineHeight: 1.05,
              color: "var(--color-dark)",
              margin: 0,
            }}
          >
            About<br />{siteName}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-red-hat)",
              fontWeight: 400,
              fontSize: "0.88rem",
              color: "var(--color-medium)",
              marginTop: "0.75rem",
            }}
          >
            {siteName} — DPJ Media LLC
          </p>
        </div>

        <Gap />

        <div id="s1" style={{ ...secStatic }}>
          <span className="section-label" style={label}>002 / Who We Are</span>
          <p className="section-body" style={body}>
            Thank you for reading <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong>. Whether you live here, work here, or care about what happens in this community, this site is built for you—clear local news you can use, without the noise of national feeds or scattered social posts.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", borderLeft: "2px solid var(--color-riviera-blue)", paddingLeft: "1rem" }}>
            {PILLARS.map(([l, b], i) => (
              <li key={i} className="section-pillar" style={{ marginBottom: "0.6rem", ...body }}>
                <strong style={{ color: "var(--color-dark)" }}>{l}:</strong> {b}
              </li>
            ))}
          </ul>
        </div>

        <Gap />

        <div id="s2" style={secStatic}>
          <span className="section-label" style={label}>003 / Our Mission</span>
          <p className="section-body" style={body}>
            As our area grows and changes, residents need dependable updates about what is happening close to home. That is why we publish <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong>—an independent local news source focused on fast, accurate, and accessible coverage of the communities we serve.
          </p>
        </div>

        <Gap />

        <div
          id="marquee-band"
          style={{
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem 0.75rem",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: "var(--font-masthead)",
              fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--color-dark)",
            }}
          >
            {["Timely", "·", "Accurate", "·", "Accessible"].map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
        </div>

        <Gap />

        <div id="s3" style={secStatic}>
          <span className="section-label" style={label}>004 / What We Cover</span>
          <p className="section-body" style={body}>
            Our goal is straightforward: give people the information they need to participate in local civic life. That includes clear reporting on municipal meetings and boards, local elections, proposed development, and the businesses opening, closing, or changing hands in the neighborhoods, townships, and boroughs in our coverage area.
          </p>
        </div>

        <Gap />

        <div id="s4" style={secStatic}>
          <span className="section-label" style={label}>005 / Why It Matters</span>
          <p className="section-body" style={body}>
            This work matters because communities are changing quickly—growth, new projects, and complex proposals bring both opportunity and questions. A more polarized national conversation can make it harder to stay grounded in what is actually happening on the ground.{" "}
            <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong> aims to deliver reporting that is timely, well-sourced, and grounded in public records and firsthand observation.
          </p>
        </div>

        <Gap />

        <div id="s5" style={secStatic}>
          <span className="section-label" style={label}>006 / How We Work</span>
          <h2
            className="section-heading"
            style={{
              fontFamily: "var(--font-newsreader)",
              fontWeight: 700,
              fontSize: "clamp(1.05rem, 4vw, 1.35rem)",
              lineHeight: 1.25,
              color: "var(--color-dark)",
              margin: "0.4rem 0 0.8rem",
            }}
          >
            How we use AI—and why editors still decide what gets published
          </h2>
          <p className="section-body" style={body}>
            <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong> uses an AI-assisted platform called <strong style={{ color: "var(--color-dark)" }}>Diffuse</strong> to help our team work through large volumes of public material: faster review of agendas, meeting transcription, and structured drafts. Used well, AI is a <strong style={{ color: "var(--color-dark)" }}>force multiplier</strong>—covering more meetings on a steadier cadence.
          </p>
        </div>

        <Gap />

        <div id="s6" style={secStatic}>
          <span className="section-label" style={label}>007 / Editorial Standards</span>
          <p className="section-body" style={body}>
            <strong style={{ color: "var(--color-dark)" }}>Nothing goes live on the strength of a machine draft alone.</strong> Editors review every piece: checking facts, adding context, correcting errors, and applying editorial standards. AI may suggest structure; humans are responsible for accuracy, fairness, and clarity.
          </p>
        </div>

        <Gap />

        <div id="s7" style={secStatic}>
          <span className="section-label" style={label}>008 / Our Commitment</span>
          <p className="section-body" style={body}>
            <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong> exists to serve the public: to document what is happening, explain issues that affect residents, and help make local information accessible to everyone who needs it. We look forward to growing alongside the community we cover.
          </p>
          <p
            className="section-sig"
            style={{
              fontFamily: "var(--font-cursive)",
              fontSize: "1.4rem",
              fontWeight: 500,
              color: "var(--color-dark)",
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            — The DPJ Media Team
          </p>
        </div>
      </div>
    </main>
  );
}

function AboutScrollAnimation({ siteName }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const outer = outerRef.current;
    const hero = heroRef.current;
    if (!canvas || !outer || !hero) return;

    const canvasEl = canvas;
    const outerEl = outer;
    const heroEl = hero;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvasEl.getContext("2d", { willReadFrequently: true })!;
    let currentFrameIdx = 0;
    let bgColor = "#ffffff";

    function getHeaderBottom(): number {
      const header = document.querySelector<HTMLElement>("header");
      return header ? header.getBoundingClientRect().height + 12 : 12;
    }

    Object.assign(canvasEl.style, {
      position: "fixed",
      left: "40vw",
      zIndex: "1",
      background: bgColor,
      pointerEvents: "none",
      visibility: "visible",
      filter: "brightness(1.12) contrast(0.84)",
    });

    function setCanvasSize() {
      const headerBottom = getHeaderBottom();
      const w = Math.round(window.innerWidth * 0.60);
      const h = window.innerHeight - headerBottom;
      canvasEl.style.top = `${headerBottom}px`;
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;
      canvasEl.width = w * dpr;
      canvasEl.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    setCanvasSize();

    const frames: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);

    function sampleBgColor(img: HTMLImageElement): string {
      const oc = document.createElement("canvas");
      oc.width = img.naturalWidth;
      oc.height = img.naturalHeight;
      const octx = oc.getContext("2d", { willReadFrequently: true })!;
      octx.drawImage(img, 0, 0);
      const pts: [number, number][] = [
        [4, 4],
        [img.naturalWidth - 4, 4],
        [4, img.naturalHeight - 4],
        [img.naturalWidth - 4, img.naturalHeight - 4],
        [Math.floor(img.naturalWidth / 2), 4],
        [4, Math.floor(img.naturalHeight / 2)],
        [img.naturalWidth - 4, Math.floor(img.naturalHeight / 2)],
      ];
      let r = 0, g = 0, b = 0;
      for (const [x, y] of pts) {
        const px = octx.getImageData(x, y, 1, 1).data;
        r += px[0]; g += px[1]; b += px[2];
      }
      const n = pts.length;
      return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
    }

    function drawFrame(img: HTMLImageElement) {
      if (!img?.naturalWidth) return;
      const cw = canvasEl.width / dpr;
      const ch = canvasEl.height / dpr;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * 0.92;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.onload = () => {
        frames[i] = img;
        if (i === 0) {
          bgColor = sampleBgColor(img);
          canvasEl.style.background = bgColor;
          document.body.style.backgroundColor = bgColor;
          drawFrame(img);
        }
      };
      img.src = FRAME_PATH(i + 1);
    }

    let lenisInstance: InstanceType<typeof import("lenis")["default"]> | null = null;
    let stRef: typeof import("gsap/ScrollTrigger")["ScrollTrigger"] | null = null;

    async function init() {
      const [{ gsap }, { default: Lenis }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("lenis"),
        import("gsap/ScrollTrigger"),
      ]);

      gsap.registerPlugin(ScrollTrigger);
      stRef = ScrollTrigger;

      let frameLocked = false;
      function checkFrameLock() {
        const footer = document.querySelector<HTMLElement>("footer");
        if (!footer) return;
        frameLocked = footer.getBoundingClientRect().top <= window.innerHeight;
      }

      const lenis = new Lenis({ lerp: 0.15, smoothWheel: true });
      lenisInstance = lenis;
      lenis.on("scroll", () => {
        ScrollTrigger.update();
        checkFrameLock();
      });
      gsap.ticker.add((time: number) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      ScrollTrigger.create({
        trigger: outerEl,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.15,
        onUpdate(self) {
          checkFrameLock();
          if (frameLocked) return;
          const idx = Math.min(
            Math.floor(self.progress * (TOTAL_FRAMES - 1)),
            TOTAL_FRAMES - 1
          );
          if (idx !== currentFrameIdx) {
            currentFrameIdx = idx;
            const f = frames[idx];
            if (f) drawFrame(f);
          }
        },
      });

      canvasEl.style.visibility = "visible";

      ScrollTrigger.create({
        trigger: outerEl,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate(self) {
          heroEl.style.opacity = String(Math.max(0, 1 - self.progress * 20));
        },
      });

      const heroLabel = heroEl.querySelector<HTMLElement>(".hero-label");
      const heroHeading = heroEl.querySelector<HTMLElement>(".hero-heading");
      const heroTagline = heroEl.querySelector<HTMLElement>(".hero-tagline");
      const heroEls = [heroLabel, heroHeading, heroTagline].filter(Boolean);

      gsap.fromTo(
        heroEls,
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, stagger: 0.15, duration: 1.1, ease: "power3.out", delay: 0.25 }
      );

      type AnimType = "slide-left" | "fade-up" | "slide-right" | "scale-up" | "clip-reveal" | "rotate-in";

      function animateSection(id: string, type: AnimType, persist = false) {
        const el = document.getElementById(id);
        if (!el) return;
        const children = Array.from(
          el.querySelectorAll<HTMLElement>(
            ".section-label, .section-heading, .section-body, .section-pillar, .section-sig"
          )
        );
        if (!children.length) return;

        const toggleActions = persist ? "play none none none" : "play none none reverse";
        const shared = {
          scrollTrigger: { trigger: el, start: "top 88%", toggleActions },
          stagger: 0.04,
          ease: "power2.out" as const,
          duration: 0.38,
        };

        switch (type) {
          case "slide-left":
            gsap.fromTo(children, { opacity: 0, x: -35 }, { opacity: 1, x: 0, ...shared });
            break;
          case "fade-up":
            gsap.fromTo(children, { opacity: 0, y: 28 }, { opacity: 1, y: 0, ...shared });
            break;
          case "slide-right":
            gsap.fromTo(children, { opacity: 0, x: 35 }, { opacity: 1, x: 0, ...shared });
            break;
          case "scale-up":
            gsap.fromTo(children, { opacity: 0, scale: 0.92 }, {
              opacity: 1, scale: 1,
              ...shared,
              ease: "power2.out" as const,
            });
            break;
          case "clip-reveal":
            gsap.fromTo(children, { clipPath: "inset(0 100% 0 0)" }, {
              clipPath: "inset(0 0% 0 0)",
              ...shared,
              ease: "power2.inOut" as const,
              duration: 0.55,
            });
            break;
          case "rotate-in":
            gsap.fromTo(children,
              { opacity: 0, y: 22, rotationX: 20, transformPerspective: 800 },
              { opacity: 1, y: 0, rotationX: 0, ...shared, duration: 0.45 }
            );
            break;
        }
      }

      animateSection("s1", "slide-left");
      animateSection("s2", "fade-up");
      animateSection("s3", "slide-right");
      animateSection("s4", "scale-up");
      animateSection("s5", "clip-reveal");
      animateSection("s6", "rotate-in");
      animateSection("s7", "fade-up", true);

      const marquee = document.getElementById("marquee-band");
      if (marquee) {
        gsap.fromTo(marquee, { opacity: 0 }, {
          opacity: 1, duration: 0.7,
          scrollTrigger: { trigger: marquee, start: "top 80%", toggleActions: "play none none reverse" },
        });
      }

      ScrollTrigger.refresh();
    }

    init();

    let resizeTimer: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setCanvasSize();
        const f = frames[currentFrameIdx];
        if (f) drawFrame(f);
        stRef?.refresh();
      }, 200);
    }

    function handleNativeScroll() {}
    window.addEventListener("scroll", handleNativeScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleNativeScroll);
      clearTimeout(resizeTimer);
      lenisInstance?.destroy();
      stRef?.getAll().forEach((t) => t.kill());
      document.body.style.backgroundColor = "";
    };
  }, [siteName]);

  const Gap = () => <div style={{ height: "10vh", minHeight: "60px" }} />;

  return (
    <main style={{ position: "relative" }}>
      <canvas ref={canvasRef} />

      <div ref={outerRef} style={{ width: "40vw", position: "relative", minHeight: "280vh" }}>

        <div
          ref={heroRef}
          style={{
            paddingTop: "clamp(4rem, 10vh, 7rem)",
            paddingLeft: "clamp(1.5rem, 4vw, 3.5rem)",
            paddingRight: "2rem",
            paddingBottom: "1rem",
            position: "relative",
            zIndex: 10,
          }}
        >
          <span className="hero-label" style={{ display: "block", fontFamily: "var(--font-red-hat)", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-riviera-blue)", marginBottom: "1rem", opacity: 0 }}>
            001 / About
          </span>
          <h1 className="hero-heading" style={{ fontFamily: "var(--font-newsreader)", fontWeight: 800, fontSize: "clamp(2rem, 3.8vw, 3.8rem)", lineHeight: 1.0, color: "var(--color-dark)", margin: 0, opacity: 0 }}>
            About<br />{siteName}
          </h1>
          <p className="hero-tagline" style={{ fontFamily: "var(--font-red-hat)", fontWeight: 400, fontSize: "0.85rem", color: "var(--color-medium)", marginTop: "1rem", opacity: 0 }}>
            {siteName} — DPJ Media LLC
          </p>
        </div>

        <Gap />

        <div id="s1" style={sec}>
          <span className="section-label" style={label}>002 / Who We Are</span>
          <p className="section-body" style={body}>
            Thank you for reading <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong>. Whether you live here, work here, or care about what happens in this community, this site is built for you—clear local news you can use, without the noise of national feeds or scattered social posts.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", borderLeft: "2px solid var(--color-riviera-blue)", paddingLeft: "1rem" }}>
            {PILLARS.map(([l, b], i) => (
              <li key={i} className="section-pillar" style={{ marginBottom: "0.6rem", ...body }}>
                <strong style={{ color: "var(--color-dark)" }}>{l}:</strong> {b}
              </li>
            ))}
          </ul>
        </div>

        <Gap />

        <div id="s2" style={sec}>
          <span className="section-label" style={label}>003 / Our Mission</span>
          <p className="section-body" style={body}>
            As our area grows and changes, residents need dependable updates about what is happening close to home. That is why we publish <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong>—an independent local news source focused on fast, accurate, and accessible coverage of the communities we serve.
          </p>
        </div>

        <Gap />

        <div id="marquee-band" style={{ overflow: "hidden", paddingLeft: "clamp(1.5rem, 4vw, 3.5rem)", paddingTop: "0.5rem", paddingBottom: "0.5rem", zIndex: 10, position: "relative", opacity: 0 }}>
          <div style={{ display: "flex", gap: "1.5rem", width: "max-content", animation: "marqueeScroll 10s linear infinite", fontFamily: "var(--font-masthead)", fontSize: "clamp(1rem, 2vw, 1.6rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-dark)" }}>
            {["Timely", "·", "Accurate", "·", "Accessible", "·", "Timely", "·", "Accurate", "·", "Accessible", "·"].map((w, i) => <span key={i}>{w}</span>)}
          </div>
        </div>

        <Gap />

        <div id="s3" style={sec}>
          <span className="section-label" style={label}>004 / What We Cover</span>
          <p className="section-body" style={body}>
            Our goal is straightforward: give people the information they need to participate in local civic life. That includes clear reporting on municipal meetings and boards, local elections, proposed development, and the businesses opening, closing, or changing hands in the neighborhoods, townships, and boroughs in our coverage area.
          </p>
        </div>

        <Gap />

        <div id="s4" style={sec}>
          <span className="section-label" style={label}>005 / Why It Matters</span>
          <p className="section-body" style={body}>
            This work matters because communities are changing quickly—growth, new projects, and complex proposals bring both opportunity and questions. A more polarized national conversation can make it harder to stay grounded in what is actually happening on the ground.{" "}
            <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong> aims to deliver reporting that is timely, well-sourced, and grounded in public records and firsthand observation.
          </p>
        </div>

        <Gap />

        <div id="s5" style={sec}>
          <span className="section-label" style={label}>006 / How We Work</span>
          <h2 className="section-heading" style={{ fontFamily: "var(--font-newsreader)", fontWeight: 700, fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)", lineHeight: 1.25, color: "var(--color-dark)", margin: "0.4rem 0 0.8rem" }}>
            How we use AI—and why editors still decide what gets published
          </h2>
          <p className="section-body" style={body}>
            <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong> uses an AI-assisted platform called <strong style={{ color: "var(--color-dark)" }}>Diffuse</strong> to help our team work through large volumes of public material: faster review of agendas, meeting transcription, and structured drafts. Used well, AI is a <strong style={{ color: "var(--color-dark)" }}>force multiplier</strong>—covering more meetings on a steadier cadence.
          </p>
        </div>

        <Gap />

        <div id="s6" style={sec}>
          <span className="section-label" style={label}>007 / Editorial Standards</span>
          <p className="section-body" style={body}>
            <strong style={{ color: "var(--color-dark)" }}>Nothing goes live on the strength of a machine draft alone.</strong> Editors review every piece: checking facts, adding context, correcting errors, and applying editorial standards. AI may suggest structure; humans are responsible for accuracy, fairness, and clarity.
          </p>
        </div>

        <Gap />

        <div id="s7" style={sec}>
          <span className="section-label" style={label}>008 / Our Commitment</span>
          <p className="section-body" style={body}>
            <strong style={{ color: "var(--color-dark)" }}>{siteName}</strong> exists to serve the public: to document what is happening, explain issues that affect residents, and help make local information accessible to everyone who needs it. We look forward to growing alongside the community we cover.
          </p>
          <p className="section-sig" style={{ fontFamily: "var(--font-cursive)", fontSize: "1.5rem", fontWeight: 500, color: "var(--color-dark)", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
            — The DPJ Media Team
          </p>
        </div>

      </div>
    </main>
  );
}

const sec: React.CSSProperties = {
  position: "relative",
  width: "100%",
  paddingLeft: "clamp(1.5rem, 4vw, 3.5rem)",
  paddingRight: "2rem",
  zIndex: 10,
};

const secStatic: React.CSSProperties = {
  position: "relative",
  width: "100%",
  paddingLeft: 0,
  paddingRight: 0,
  zIndex: 10,
};

const label: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-red-hat)",
  fontWeight: 700,
  fontSize: "0.7rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--color-riviera-blue)",
  marginBottom: "0.75rem",
};

const body: React.CSSProperties = {
  fontFamily: "var(--font-red-hat)",
  fontWeight: 400,
  fontSize: "0.92rem",
  lineHeight: 1.8,
  color: "var(--color-medium)",
  margin: 0,
};
