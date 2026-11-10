/* Muestrario interactions. Everything is visible without JS; GSAP only adds motion on top. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  /* ---------- hero: clip plays once, then the pins appear ---------- */
  const stage = $(".hero-stage"), heroVid = $("#hero-video");
  const showPins = () => {
    if (showPins.done) return; showPins.done = true;
    stage.classList.add("ended");
    if (hasGsap && !reduce) gsap.from(".pin", { scale: 0, duration: .5, ease: "back.out(2)", stagger: .05 });
  };
  if (reduce || !heroVid) showPins();
  else {
    heroVid.addEventListener("ended", showPins, { once: true });
    addEventListener("load", () => heroVid.play().catch(showPins), { once: true });
    setTimeout(showPins, 6500);  // never leave the visitor without pins
  }

  /* ---------- lazy looping clips (decorative, muted) ---------- */
  const portrait = matchMedia("(orientation: portrait)").matches;
  const loops = $$("video.loop");
  const io = new IntersectionObserver((entries) => entries.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting && !v.src) {
      v.src = portrait && v.dataset.srcTall ? v.dataset.srcTall : v.dataset.src;
      if (portrait && v.dataset.posterTall) v.poster = v.dataset.posterTall;
    }
    if (reduce) return;
    if (isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { rootMargin: "200px 0px" });
  loops.forEach((v) => io.observe(v));

  /* ---------- Sunon plant scene: inline video with timed captions ---------- */
  const full = $("#sunon-full");
  if (full) {
    const toggle = $(".scene-toggle"), caps = $$(".captions li");
    const setBtn = () => { const on = !full.paused; toggle.textContent = on ? "Pausar" : "Reproducir"; toggle.setAttribute("aria-pressed", String(on)); };
    toggle.addEventListener("click", () => (full.paused ? full.play() : full.pause()));
    full.addEventListener("play", setBtn); full.addEventListener("pause", setBtn);
    full.addEventListener("timeupdate", () => {
      const t = full.currentTime;
      caps.forEach((c) => c.classList.toggle("on", t >= +c.dataset.t0 && t < +c.dataset.t1));
    });
    if (!reduce) new IntersectionObserver(([en]) => {
      if (en.intersectionRatio >= .5 && full.paused && !full.dataset.userPaused) full.play().catch(() => {});
      if (en.intersectionRatio < .2 && !full.paused) full.pause();
    }, { threshold: [0, .2, .5] }).observe(full);
    toggle.addEventListener("click", () => { full.dataset.userPaused = full.paused ? "1" : ""; });
  }

  /* ---------- video facades: muted loop in place, full video with sound in the dialog ---------- */
  const player = $("#player"), frame = $(".player-frame", player);
  let lastFacade = null;
  $$(".facade").forEach((b) => b.addEventListener("click", () => {
    lastFacade = b;
    if (/\.mp4$/.test(b.dataset.embed)) {  // our own copy: starts at once, native controls
      const v = Object.assign(document.createElement("video"), { src: b.dataset.embed, controls: true, autoplay: true, playsInline: true, preload: "auto" });
      if (b.dataset.poster) v.poster = b.dataset.poster;
      frame.replaceChildren(v);
      player.showModal();
      v.play().catch(() => {});
      return;
    }
    const url = new URL(b.dataset.embed, location.href);  // fallback: platform embed
    url.searchParams.set("autoplay", "1");
    if (url.hostname.includes("youtube")) url.searchParams.set("rel", "0");
    if (url.hostname.includes("vimeo")) url.searchParams.set("dnt", "1");
    frame.innerHTML = `<iframe src="${url.href}" title="${b.getAttribute("aria-label")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    player.showModal();
  }));
  const closeDialog = (d) => d.close();
  $$("dialog").forEach((d) => {
    $(".close", d).addEventListener("click", () => closeDialog(d));
    d.addEventListener("click", (ev) => { if (ev.target === d) closeDialog(d); });
  });
  player.addEventListener("close", () => { frame.innerHTML = ""; lastFacade && lastFacade.focus(); hasGsap && ScrollTrigger.refresh(); });

  /* ---------- index sheet ---------- */
  const sheet = $("#index-sheet");
  $(".index-btn").addEventListener("click", () => sheet.showModal());
  $$("a", sheet).forEach((a) => a.addEventListener("click", () => sheet.close()));

  /* ---------- samples tray ---------- */
  const KEY = "mobiliti-muestras";
  const names = Object.fromEntries($$(".chapter").map((c) => [c.dataset.key, { name: c.dataset.name, id: c.id, img: $(`.swatch[href="#${c.id}"] img`) }]));
  let tray = [];
  try { tray = (JSON.parse(localStorage.getItem(KEY)) || []).filter((k) => names[k]); } catch { tray = []; }
  const announce = $("[data-announce]"), list = $("[data-tray]");
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tray)); } catch { /* private mode: keep in memory */ } };
  const render = () => {
    $$("[data-count]").forEach((c) => (c.textContent = tray.length));
    $$(".add").forEach((b) => {
      const on = tray.includes(b.dataset.key);
      b.setAttribute("aria-pressed", String(on));
      $(".add-txt", b).textContent = on ? "✓ En su muestrario" : "Agregar a su muestrario";
    });
    list.innerHTML = tray.length ? "" : '<li class="tray-empty">Aún no ha agregado marcas. <a href="#muestrario">Vaya al muestrario</a> y use el botón "Agregar a su muestrario".</li>';
    tray.forEach((k) => {
      const li = document.createElement("li");
      const im = names[k].img ? names[k].img.cloneNode() : document.createElement("span");
      if (im.tagName === "IMG") { im.removeAttribute("srcset"); im.removeAttribute("sizes"); im.alt = ""; }
      li.append(im);
      const b = document.createElement("b"); b.textContent = names[k].name; li.append(b);
      const rm = document.createElement("button"); rm.className = "rm"; rm.type = "button"; rm.textContent = "×";
      rm.setAttribute("aria-label", `Quitar ${names[k].name}`);
      rm.addEventListener("click", () => toggle(k));
      li.append(rm); list.append(li);
    });
  };
  const fly = (from) => {
    if (!hasGsap || reduce || !from) return;
    const count = $(".tray-link .count"), a = from.getBoundingClientRect(), z = count.getBoundingClientRect();
    const src = names[from.dataset.key].img;
    const chip = src ? src.cloneNode() : document.createElement("span");
    chip.removeAttribute && chip.removeAttribute("srcset");
    Object.assign(chip.style, { position: "fixed", left: `${a.left + a.width / 2 - 20}px`, top: `${a.top}px`, width: "40px", height: "52px", objectFit: "cover", zIndex: 60, pointerEvents: "none", borderRadius: "2px", background: "#eef1f2" });
    document.body.append(chip);
    const dx = z.left + z.width / 2 - (a.left + a.width / 2), dy = z.top - a.top;
    gsap.to(chip, { x: dx, duration: .6, ease: "power1.in" });
    gsap.to(chip, { y: dy, scale: .4, duration: .6, ease: "power2.out", onComplete: () => chip.remove() });
    gsap.fromTo(count, { scale: 1.5 }, { scale: 1, duration: .4, delay: .55, ease: "back.out(3)" });
  };
  function toggle(k, btn) {
    const i = tray.indexOf(k);
    if (i >= 0) tray.splice(i, 1); else { tray.push(k); fly(btn); }
    save(); render();
    announce.textContent = `${names[k].name} ${i >= 0 ? "quitada" : "agregada"} (${tray.length} ${tray.length === 1 ? "muestra" : "muestras"})`;
  }
  $$(".add").forEach((b) => b.addEventListener("click", () => toggle(b.dataset.key, b)));
  render();

  const form = $(".tray-form");
  const message = () => {
    const fd = new FormData(form);
    const marcas = tray.length ? tray.map((k) => names[k].name).join(", ") : "(por definir)";
    return `Hola, me interesan muestras de: ${marcas}. Proyecto: ${fd.get("tipo")}.` +
      (fd.get("ciudad") ? ` Ciudad: ${fd.get("ciudad")}.` : "") + (fd.get("nombre") ? ` Mi nombre: ${fd.get("nombre")}.` : "");
  };
  $$("[data-send]", form).forEach((b) => b.addEventListener("click", () => {
    const text = message().slice(0, 500);
    if (b.dataset.send === "wa") window.open(`https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    else location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent("Solicitud de muestras – Mobiliti")}&body=${encodeURIComponent(text)}`;
  }));

  /* ---------- GSAP choreography ---------- */
  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    gsap.from(".hero h1 .line > span", { yPercent: 100, duration: .9, ease: "power4.out", stagger: .08 });

    ScrollTrigger.create({ trigger: ".wall", start: "top 75%", once: true, onEnter: () =>
      gsap.from(".swatch", { y: -60, rotation: (i) => (i % 2 ? 3 : -3), duration: .9, ease: "sine.out", stagger: { each: .05 }, transformOrigin: "50% 0" }) });
  });

  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
    // category bands: pinned diagonal wipe (2 of them), the rest slide their word
    $$(".band--pin").forEach((b) => {
      gsap.timeline({ scrollTrigger: { trigger: b, start: "top top", end: "+=60%", pin: true, scrub: .6 } })
        .fromTo($(".in", b), { clipPath: "polygon(100% 0,100% 0,100% 100%,100% 100%)" }, { clipPath: "polygon(0% 0,100% 0,100% 100%,-25% 100%)", ease: "none" })
        .from($(".band-word", b), { xPercent: 20, ease: "none" }, 0);
    });
    $$(".band:not(.band--pin) .band-word").forEach((w) =>
      gsap.from(w, { xPercent: 12, ease: "none", scrollTrigger: { trigger: w.parentElement, start: "top bottom", end: "bottom top", scrub: .6 } }));

    // chapter headers: the sample is "pulled out" (clip opens) and the name widens
    $$(".ch-head").forEach((h) => {
      const st = { trigger: h, start: "top 90%", end: "top 25%", scrub: .6 };
      gsap.fromTo($(".media", h), { clipPath: "inset(18% 38% 18% 38% round 4px)" }, { clipPath: "inset(0% 0% 0% 0% round 4px)", ease: "none", scrollTrigger: st });
      gsap.fromTo($(".name", h), { "--wdth": 40 }, { "--wdth": 110, ease: "none", scrollTrigger: { ...st } });
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
