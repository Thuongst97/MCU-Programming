/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — generic state-machine engine (PLAN.md §9.9).
   MCU.StateMachine(host, {
     states: [{ id, label, sub?, x, y, tone?, desc }],     x/y in a 1000-wide canvas
     transitions: [{ from, to, label, desc?, bend? }],     bend: curve offset in px
     initial: "id", height?: px, ariaLabel? })
   Click a state to read about it; event buttons fire the transitions that
   leave the current state, so learners can "drive" the machine.
   ========================================================================= */
(function () {
  "use strict";
  const MCU = (window.MCU = window.MCU || {});
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let uid = 0;

  MCU.StateMachine = function (host, spec) {
    const S = window.MCU_STRINGS.sm;
    const id = "sm" + ++uid;
    const W = 1000, H = spec.height || 320, BW = spec.boxW || 150, BH = 54;
    const byId = Object.fromEntries(spec.states.map((s) => [s.id, s]));
    let cur = spec.initial || spec.states[0].id;
    let lastT = null;
    const center = (s) => [s.x + BW / 2, s.y + BH / 2];
    // point on the box border towards (tx, ty)
    const edge = (s, tx, ty) => {
      const [cx, cy] = center(s);
      const dx = tx - cx, dy = ty - cy;
      const k = Math.min(Math.abs((BW / 2) / (dx || 1e-9)), Math.abs((BH / 2) / (dy || 1e-9)));
      return [cx + dx * k, cy + dy * k];
    };
    let svg = `<defs><marker id="${id}-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="sm-ah"/></marker></defs>`;
    spec.transitions.forEach((t, i) => {
      const a = byId[t.from], b = byId[t.to];
      if (!a || !b) throw new Error(`StateMachine: unknown state in transition ${t.from} → ${t.to}`);
      let d, lx, ly;
      if (a === b) {
        const [cx] = center(a);
        d = `M${cx - 20},${a.y} C${cx - 40},${a.y - 46} ${cx + 40},${a.y - 46} ${cx + 20},${a.y}`;
        lx = cx; ly = a.y - 40;
      } else {
        const [bx, by] = center(b), [ax, ay] = center(a);
        const back = spec.transitions.some((u) => u.from === t.to && u.to === t.from);
        const bend = t.bend !== undefined ? t.bend : back ? 22 : 0;
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const nx = -(by - ay) / len, ny = (bx - ax) / len;
        const qx = mx + nx * bend * 2, qy = my + ny * bend * 2;
        const [sx, sy] = edge(a, qx, qy), [ex, ey] = edge(b, qx, qy);
        d = `M${sx},${sy} Q${qx},${qy} ${ex},${ey}`;
        lx = (sx + 2 * qx + ex) / 4; ly = (sy + 2 * qy + ey) / 4;
      }
      svg += `<g class="sm-t" data-t="${i}"><path d="${d}" marker-end="url(#${id}-ah)"/><text x="${lx}" y="${ly - 5}" text-anchor="middle">${esc(t.label)}</text></g>`;
    });
    spec.states.forEach((s) => {
      svg += `<g class="sm-s${s.tone ? " tn-" + s.tone : ""}" data-s="${esc(s.id)}" tabindex="0" role="button" aria-label="${esc(s.label)}">
        <rect x="${s.x}" y="${s.y}" width="${BW}" height="${BH}" rx="12"/>
        <text class="sm-l" x="${s.x + BW / 2}" y="${s.y + (s.sub ? 23 : 32)}" text-anchor="middle">${esc(s.label)}</text>
        ${s.sub ? `<text class="sm-sub" x="${s.x + BW / 2}" y="${s.y + 40}" text-anchor="middle">${esc(s.sub)}</text>` : ""}</g>`;
    });
    host.classList.add("sm-host", "glass");
    host.innerHTML = `<div class="sm-canvas"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.ariaLabel || S.aria)}">${svg}</svg></div>
      <div class="sm-ctl"><span class="small muted">${esc(S.events)}</span><div class="sm-events"></div><button type="button" class="btn sm ghost" data-act="reset">${esc(S.reset)}</button></div>
      <div class="sm-info" aria-live="polite"></div>`;
    const info = host.querySelector(".sm-info"), events = host.querySelector(".sm-events");
    const render = (viewId) => {
      const v = byId[viewId || cur];
      host.querySelectorAll(".sm-s").forEach((g) => { g.classList.toggle("cur", g.dataset.s === cur); g.classList.toggle("view", g.dataset.s === v.id && v.id !== cur); });
      host.querySelectorAll(".sm-t").forEach((g) => g.classList.toggle("last", lastT !== null && +g.dataset.t === lastT));
      const outs = spec.transitions.map((t, i) => [t, i]).filter(([t]) => t.from === cur);
      events.innerHTML = outs.length ? outs.map(([t, i]) => `<button type="button" class="btn sm" data-fire="${i}">${esc(t.label)}</button>`).join("") : `<span class="small muted">${esc(S.none)}</span>`;
      const t = lastT !== null && !viewId ? spec.transitions[lastT] : null;
      info.innerHTML = `<h4>${esc(v.label)}${v.id === cur ? ` <span class="badge green">${esc(S.current)}</span>` : ""}</h4><div>${v.desc || ""}</div>${t && t.desc ? `<p class="small muted"><b>${esc(t.label)}:</b> ${t.desc}</p>` : ""}`;
    };
    host.addEventListener("click", (e) => {
      const f = e.target.closest("[data-fire]");
      if (f) { const t = spec.transitions[+f.dataset.fire]; lastT = +f.dataset.fire; cur = t.to; render(); return; }
      if (e.target.closest('[data-act="reset"]')) { cur = spec.initial || spec.states[0].id; lastT = null; render(); return; }
      const s = e.target.closest(".sm-s");
      if (s) render(s.dataset.s);
    });
    host.addEventListener("keydown", (e) => {
      const s = e.target.closest && e.target.closest(".sm-s");
      if (s && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); render(s.dataset.s); }
    });
    render();
    return { fire(label) { const i = spec.transitions.findIndex((t) => t.from === cur && t.label === label); if (i >= 0) { lastT = i; cur = spec.transitions[i].to; render(); } return cur; }, get state() { return cur; } };
  };
})();
