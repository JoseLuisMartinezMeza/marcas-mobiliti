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
    const v = Object.assign(document.createElement("video"), { src: b.dataset.embed, controls: true, autoplay: true, playsInline: true, preload: "auto" });
    if (b.dataset.poster) v.poster = b.dataset.poster;
    frame.replaceChildren(v);
    player.showModal();
    v.play().catch(() => {});
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

  /* ---------- GSAP choreography: every move is tied to the scroll and plays back when scrolling up ---------- */
  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const mm = gsap.matchMedia();
  const scrub = (trigger, start = "top 90%", end = "top 50%") => ({ trigger, start, end, scrub: .6 });
  const tl = (st) => gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: st });
  const headerH = () => $(".top").offsetHeight;

  mm.add("(prefers-reduced-motion: no-preference)", () => {  // one-time intro, never replayed on resize
    gsap.from(".hero h1 .line > span", { yPercent: 100, duration: .9, ease: "power4.out", stagger: .08 });
  });

  mm.add({ motion: "(prefers-reduced-motion: no-preference)", desk: "(min-width: 861px) and (min-height: 600px)" }, ({ conditions: { motion, desk } }) => {
    if (!motion) return;
    // triggers are created top to bottom so the pinned sections push the later ones correctly

    // hero: text and illustration drift apart as the visitor leaves (no fade: buttons must not look disabled)
    tl(scrub(".hero", "top top", "bottom top")).to(".hero-text", { yPercent: -16 }).to(".hero-art", { y: -50, scale: .95 }, 0);

    // plant footage: the camera pulls back over the whole pass; the line is fully in while the clip is on screen
    gsap.fromTo(".footage video", { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: scrub(".footage", "top bottom", "bottom top") });
    gsap.from(".footage-text > *", { y: 50, opacity: 0, stagger: .15, ease: "none", scrollTrigger: scrub(".footage", "top 80%", "top 35%") });

    // sample wall: samples drop onto the rail, then the rail travels sideways with the scroll (pinned)
    const rack = $(".rack"), groups = $$(".rack > li"), items = $$(".rack .wall-group > ul > li"), cats = groups.map((g) => $(".wall-cat", g));
    rack.classList.add("rack--driven"); rack.scrollLeft = 0;
    tl(scrub(".wall", "top 85%", "top 30%")).from(".wall-title", { xPercent: -8, opacity: 0, duration: .5 })
      .from(".wall-intro", { y: 20, opacity: 0, duration: .4 }, .1)
      .from(items, { y: -20, scale: .94, opacity: 0, stagger: .05, duration: .5 }, .15);
    // layout offsets ignore transforms, so these stay right while the rail is moved
    let pad = [0, 0];
    const measure = () => { const cs = getComputedStyle(rack); pad = [parseFloat(cs.paddingLeft), parseFloat(cs.paddingRight)]; };
    const leftIn = (el) => el.offsetLeft - groups[0].offsetLeft + pad[0];  // left edge inside the rail, rail at rest
    const travel = () => {
      measure();
      const last = groups[groups.length - 1];
      return Math.max(0, leftIn(last) + last.offsetWidth + pad[1] - rack.clientWidth);
    };
    gsap.set(items, { transformOrigin: "50% 0" });
    const swingTo = items.map((li) => gsap.quickTo(li, "rotation", { duration: .6, ease: "power3" }));
    let calm;
    const pinCats = () => {  // each category name stays readable at the left edge while its group crosses
      const x = gsap.getProperty(groups[0], "x");
      groups.forEach((g, i) => gsap.set(cats[i], { x: gsap.utils.clamp(0, Math.max(0, g.offsetWidth - cats[i].offsetWidth), pad[0] - (leftIn(g) + x)) }));
    };
    const ride = gsap.to(groups, { x: () => -travel(), ease: "none", onUpdate: pinCats,
      // title + rail are pinned when the rail's middle reaches 55% of the screen; the list below stays outside the pin
      // so opening it never forces a re-measure mid-ride
      // start is an absolute scroll position measured on the pin spacer, which never moves while pinned
      // (a relative "top+=N 55%" start was re-measured wrongly after a resize in the middle of or below the ride)
      scrollTrigger: { trigger: ".wall-pin", pin: true, start: () => {
          const pin = $(".wall-pin"), box = pin.parentElement.classList.contains("pin-spacer") ? pin.parentElement : pin;
          return Math.round(box.getBoundingClientRect().top + scrollY + (rack.getBoundingClientRect().top - pin.getBoundingClientRect().top) + rack.offsetHeight / 2 - innerHeight * .55);
        },
        end: () => "+=" + travel(), scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
        onRefresh: pinCats,
        onUpdate: (self) => {  // hanging samples lag behind the rail and settle when it stops
          const r = gsap.utils.clamp(-4, 4, -self.getVelocity() / 300);
          swingTo.forEach((f, i) => f(r * (1 + (i % 3) * .1)));
          clearTimeout(calm); calm = setTimeout(() => swingTo.forEach((f) => f(0)), 150);
        } } });
    const onFocus = (e) => {  // keyboard: bring the focused sample into view by scrolling to its place on the ride
      const st = ride.scrollTrigger, card = e.target.closest(".swatch"), t = travel();
      if (!st || !card || !t) return;
      rack.scrollLeft = 0;
      const left = card.getBoundingClientRect().left - rack.getBoundingClientRect().left - gsap.getProperty(groups[0], "x");  // as if the rail were at rest
      const p = gsap.utils.clamp(0, 1, (left + card.offsetWidth / 2 - rack.clientWidth / 2) / t);
      window.scrollTo({ top: st.start + p * (st.end - st.start), behavior: "instant" });
    };
    rack.addEventListener("focusin", onFocus);

    // the rest of the page, in document order
    $$(".band, .finale, .chapter, .tray-section").forEach((sec) => {
      if (sec.matches(".band")) {
        const imgs = $$(".band-img img", sec), word = $(".band-word", sec);
        if (sec.matches(".band--pin")) {  // diagonal wipe to the second photo; pinned (full screen) on desktop
          tl(desk ? { trigger: sec, start: () => "top " + headerH(), end: "+=60%", pin: true, scrub: .6, anticipatePin: 1 } : scrub(sec, "top 75%", "bottom 25%"))
            .fromTo($(".in", sec), { clipPath: "polygon(100% 0,100% 0,100% 100%,100% 100%)" }, { clipPath: "polygon(0% 0,100% 0,100% 100%,-25% 100%)" })
            .fromTo(imgs, { scale: 1.15 }, { scale: 1 }, 0)
            .from(word, { xPercent: 20 }, 0);
        } else {
          gsap.fromTo(imgs, { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: scrub(sec, "top bottom", "bottom top") });
          gsap.from(word, { xPercent: 14, ease: "none", scrollTrigger: scrub(sec, "top bottom", "bottom top") });
        }
        return;
      }
      if (sec.matches(".finale")) {
        gsap.fromTo($("video", sec), { scale: 1.2 }, { scale: 1, ease: "none", scrollTrigger: scrub(sec, "top bottom", "bottom top") });
        gsap.from($$(".finale-text > *", sec), { y: 50, opacity: 0, stagger: .15, ease: "none", scrollTrigger: scrub(sec, "top 80%", "top 35%") });
        return;
      }
      if (sec.matches(".tray-section")) {
        gsap.from(Array.from(sec.children), { y: 50, opacity: 0, stagger: .15, ease: "none", scrollTrigger: scrub(sec, "top 90%", "top 40%") });
        return;
      }
      // brand chapter: the sample is pulled out (clip opens, photo settles), name and sector rise
      const head = $(".ch-head", sec), media = $(".media", head);
      tl(scrub(head, "top 90%", "top 25%"))
        .fromTo(media, { clipPath: "inset(18% 38% 18% 38% round 4px)" }, { clipPath: "inset(0% 0% 0% 0% round 4px)" })
        .fromTo($$("img, video", media), { scale: 1.25 }, { scale: 1 }, 0)
        .from($(".name", head), { yPercent: 35, opacity: 0, duration: .35 }, 0)
        .from($(".sector", head), { y: 14, opacity: 0, duration: .35 }, .08);
      // the label is a tag swinging in from its hole; the text follows line by line
      const spec = $(".spec", sec);
      tl(scrub(spec, "top 92%", "top 40%"))
        .from($(".label-card", spec), desk ? { x: -60, rotation: -5, opacity: 0, transformOrigin: "100% 0", duration: .6 }
          : { x: -16, rotation: -2, opacity: 0, transformOrigin: "100% 0", duration: .6 })
        .from($$(".tagline, .about, .fig, .strengths", spec), { y: 40, opacity: 0, stagger: .1, duration: .5 }, .1);
      // products: each photo opens like a sample being uncovered (phones skip the repaint-heavy clip)
      $$(".prod", sec).forEach((p) => tl(scrub(p, "top 97%", "top 60%"))
        .fromTo($("img", p), desk ? { clipPath: "inset(14% 10% 14% 10% round 4px)", scale: 1.12 } : { scale: 1.12, opacity: .3 },
          desk ? { clipPath: "inset(0% 0% 0% 0% round 4px)", scale: 1 } : { scale: 1, opacity: 1 })
        .from($("figcaption", p), { y: 24, opacity: 0, duration: .6 }, .3));
      const scene = $(".scene-video", sec);
      if (scene) gsap.fromTo(scene, { scale: .86, opacity: .4 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: scrub(scene, "top 95%", "top 45%") });
      // official videos: the dark panel opens, then the cards rise in
      const screen = $(".screening", sec);
      if (screen) tl(scrub(screen, "top 95%", "top 35%"))
        .fromTo(screen, { clipPath: "inset(8% 6% 8% 6% round 16px)" }, { clipPath: "inset(0% 0% 0% 0% round 4px)" })
        .from($$(".facade, .screening-side", screen), { y: 60, opacity: 0, stagger: .1, duration: .5 }, .2);
      const projects = $(".projects", sec);
      if (projects) gsap.from($$("figure, .credits li", projects), { y: 40, opacity: 0, stagger: .08, ease: "none", scrollTrigger: scrub(projects, "top 92%", "top 50%") });
    });

    // opening or closing a list changes the page height: re-measure every trigger
    const remeasure = () => ScrollTrigger.refresh();
    $$("details").forEach((d) => d.addEventListener("toggle", remeasure));

    return () => {
      rack.classList.remove("rack--driven"); rack.removeEventListener("focusin", onFocus); clearTimeout(calm);
      $$("details").forEach((d) => d.removeEventListener("toggle", remeasure));
    };
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
