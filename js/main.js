/* Campsor Capital — site scripts (no dependencies) */
(function () {
  "use strict";

  /* ---------- Nav: scrolled state, mobile menu, active link ---------- */
  const nav = document.querySelector(".nav");
  const links = document.getElementById("navLinks");
  const burger = document.getElementById("burger");

  const toTop = document.querySelector(".to-top");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
    if (toTop) toTop.classList.toggle("is-visible", window.scrollY > 600);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  burger.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    })
  );

  // Brand (logo + wordmark) in the nav and footer: scroll back to the very top
  document.querySelectorAll('a[href="#top"], a[href="#home"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      links.classList.remove("is-open"); burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false"); document.body.classList.remove("menu-open");
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    })
  );

  const sections = [...document.querySelectorAll("section[id], footer[id]")];
  const navAnchors = [...links.querySelectorAll("a[href^='#']")];
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navAnchors.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => spy.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    reveals.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 60 + "ms"; io.observe(el); });
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Hero: subtle network / particle field ---------- */
  (function heroCanvas() {
    const canvas = document.getElementById("heroCanvas");
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    let w, h, pts, raf;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round(Math.min(90, (w * h) / 16000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 1.4,
      }));
    }
    function step() {
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(170, w * 0.14);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
          if (d < R) {
            ctx.strokeStyle = "rgba(79,195,209," + (0.28 * (1 - d / R)).toFixed(3) + ")";
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(207,237,241,.85)";
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      raf = requestAnimationFrame(step);
    }
    resize(); step();
    window.addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); step(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(raf); else step(); });
  })();

  /* ---------- Performance table: colour cells, build cumulative chart ---------- */
  const table = document.getElementById("perfTable");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const series = []; // { label, value(index), ret }
  let idx = 100;
  series.push({ label: "Dec 2018", value: 100, ret: null });

  [...table.tBodies[0].rows].forEach((row) => {
    const year = row.cells[0].textContent.trim();
    for (let m = 1; m <= 12; m++) {
      const td = row.cells[m];
      const txt = td.textContent.trim();
      if (!txt) continue;
      const v = parseFloat(txt.replace("%", ""));
      if (v < 0) td.classList.add("neg");
      else if (v >= 5) td.classList.add("pos-strong");
      idx *= 1 + v / 100;
      series.push({ label: months[m - 1] + " " + year, value: idx, ret: v, year, month: m });
    }
  });

  (function drawChart() {
    const host = document.getElementById("perfChart");
    if (!host) return;
    const NS = "http://www.w3.org/2000/svg";
    const el = (n, attrs) => { const e = document.createElementNS(NS, n); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    let tip;

    function render() {
      host.innerHTML = "";
      const W = host.clientWidth, H = host.clientHeight;
      const narrow = W < 640;
      const pad = { t: 14, r: narrow ? 8 : 64, b: 28, l: 10 };
      const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });

      const vals = series.map((d) => d.value);
      const vmin = Math.min(...vals), vmax = Math.max(...vals);
      const step = niceStep((vmax - vmin) / 4);
      const y0 = Math.floor(vmin / step) * step, y1 = Math.ceil(vmax / step) * step;
      const x = (i) => pad.l + (i / (series.length - 1)) * iw;
      const y = (v) => pad.t + ih - ((v - y0) / (y1 - y0)) * ih;

      // defs
      const defs = el("defs", {});
      const grad = el("linearGradient", { id: "perfGrad", x1: 0, y1: 0, x2: 0, y2: 1 });
      grad.append(el("stop", { offset: "0%", "stop-color": "#0097A7", "stop-opacity": ".22" }), el("stop", { offset: "100%", "stop-color": "#0097A7", "stop-opacity": "0" }));
      defs.append(grad); svg.append(defs);

      // grid + y labels
      const grid = el("g", { class: "grid" }), axis = el("g", { class: "axis" });
      const lastY = y(series[series.length - 1].value) - 10;
      for (let v = y0; v <= y1 + 1e-9; v += step) {
        grid.append(el("line", { x1: pad.l, x2: pad.l + iw, y1: y(v), y2: y(v) }));
        if (narrow) {
          // labels sit inside the plot, just above their grid line; skip one that would collide with the end label
          if (v === y0 || Math.abs((y(v) - 4) - lastY) < 14) continue;
          const t = el("text", { x: pad.l + iw - 2, y: y(v) - 4, "text-anchor": "end" }); t.textContent = Math.round(v); axis.append(t);
        } else {
          const t = el("text", { x: pad.l + iw + 8, y: y(v) + 4 }); t.textContent = Math.round(v); axis.append(t);
        }
      }
      // x year ticks (January of each year)
      series.forEach((d, i) => {
        if (d.month === 1) {
          const t = el("text", { class: "yeartick", x: x(i), y: H - 8, "text-anchor": "middle" }); t.textContent = d.year; axis.append(t);
        }
      });
      svg.append(grid, axis);

      // area + line
      const path = series.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(d.value).toFixed(1)).join(" ");
      svg.append(el("path", { class: "area", d: path + ` L${x(series.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} L${pad.l},${(pad.t + ih).toFixed(1)} Z` }));
      svg.append(el("path", { class: "series", d: path }));

      // end label
      const last = series[series.length - 1];
      svg.append(el("circle", { class: "enddot", cx: x(series.length - 1), cy: y(last.value), r: 4 }));
      const lbl = el("text", { class: "endlabel", x: x(series.length - 1) - 10, y: y(last.value) - 10, "text-anchor": "end" });
      lbl.textContent = Math.round(last.value) + " · " + last.label; svg.append(lbl);

      // hover layer
      const cross = el("line", { class: "crosshair", y1: pad.t, y2: pad.t + ih });
      const dot = el("circle", { class: "dot" });
      const hit = el("rect", { x: pad.l, y: pad.t, width: iw, height: ih, fill: "transparent" });
      svg.append(cross, dot, hit);
      host.append(svg);

      tip = document.createElement("div"); tip.className = "chart__tip"; host.append(tip);

      const show = (clientX) => {
        const rect = host.getBoundingClientRect();
        const px = clientX - rect.left;
        const i = Math.max(0, Math.min(series.length - 1, Math.round(((px - pad.l) / iw) * (series.length - 1))));
        const d = series[i], cx = x(i), cy = y(d.value);
        cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.style.opacity = 1;
        dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.style.opacity = 1;
        tip.innerHTML = `<b>${d.value.toFixed(1)}</b>${d.ret === null ? "" : ` · ${d.ret >= 0 ? "+" : ""}${d.ret.toFixed(1)}%`}<small>${d.label}</small>`;
        tip.style.left = Math.max(60, Math.min(W - 60, cx)) + "px"; tip.style.top = (cy - 12) + "px"; tip.style.opacity = 1;
      };
      const hide = () => { cross.style.opacity = 0; dot.style.opacity = 0; tip.style.opacity = 0; };
      hit.addEventListener("mousemove", (e) => show(e.clientX));
      hit.addEventListener("touchstart", (e) => show(e.touches[0].clientX), { passive: true });
      hit.addEventListener("touchmove", (e) => show(e.touches[0].clientX), { passive: true });
      hit.addEventListener("mouseleave", hide);
      hit.addEventListener("touchend", hide);
    }
    function niceStep(raw) {
      const p = Math.pow(10, Math.floor(Math.log10(raw)));
      const n = raw / p;
      return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
    }
    render();
    let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(render, 150); });
  })();

  /* ---------- Contact form: Web3Forms (AJAX) ---------- */
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form__status";
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);
    if (data.get("botcheck")) return; // honeypot tripped: silently ignore
    data.delete("botcheck");

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; status.textContent = "Sending…";
    try {
      const res = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.success !== false) { form.reset(); status.textContent = "Thank you. We will be in touch shortly."; }
      else { throw new Error(out.message || "Request failed"); }
    } catch (err) {
      status.textContent = "Something went wrong. Please email us at info@campsorcapital.com.";
      status.classList.add("is-error");
    } finally { btn.disabled = false; }
  });

  /* ---------- Theme switcher (preview only) ---------- */
  const sw = document.querySelector(".theme-switch");
  if (sw) {
    const cur = () => document.documentElement.getAttribute("data-theme") || "navy";
    const paint = () => sw.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b.dataset.themeSet === cur()));
    sw.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-theme-set]"); if (!b) return;
      document.documentElement.setAttribute("data-theme", b.dataset.themeSet);
      try { localStorage.setItem("campsor-theme", b.dataset.themeSet); } catch (err) {}
      history.replaceState(null, "", "?theme=" + b.dataset.themeSet + location.hash);
      paint();
    });
    paint();
  }
})();
