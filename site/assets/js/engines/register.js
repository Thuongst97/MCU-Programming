/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — register / bit-field viewer (PLAN.md §9.3).
   MCU.Register(host, { reg: "RCC_CFGR", value, editable, show, port, onChange })
     reg       key in window.MCU_DATA.regs (data/regs-stm32g474.js)
     value     initial value (default: the reset value)
     show      field names listed in the editor (default: all)
     port      for GPIOx_* registers: "GPIOA" | "GPIOB" | "GPIOC"
   Returns { set(v), get value(), field(name) }.
   The pure helpers (fieldValue, withField, cExpr) are exported for unit tests.
   ========================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.MCU = root.MCU || {};
    root.MCU.Register = api.mount;
    root.MCU.Register.helpers = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hex = (v, d = 8) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(d, "0");
  const mask = (f) => (f.bits[0] - f.bits[1] === 31 ? 0xffffffff : ((1 << (f.bits[0] - f.bits[1] + 1)) - 1) >>> 0);

  function fieldValue(value, f) { return ((value >>> 0) >>> f.bits[1]) & mask(f); }
  function withField(value, f, v) {
    const m = (mask(f) << f.bits[1]) >>> 0;
    return (((value >>> 0) & ~m) | (((v >>> 0) << f.bits[1]) & m)) >>> 0;
  }
  /** The C expression a programmer would write for this value, using CMSIS macro names.
      Read-only fields (status reported by hardware, such as RCC_CFGR.SWS) are left out: writing them has no effect. */
  function cExpr(r, value) {
    const prefix = r.macro || `${(r.typedef || r.periph.replace(/\d+$/, "")).replace("FLASH_R", "FLASH")}_${r.reg}`;
    const parts = [];
    r.fields.forEach((f) => {
      const v = fieldValue(value, f);
      if (!v || f.access === "r") return;
      const name = f.cmsis || f.name;
      if (f.macros && f.macros[v]) parts.push(f.macros[v]);
      else if (f.bits[0] === f.bits[1]) parts.push(`${prefix}_${name}`);
      else parts.push(`(${v}U << ${prefix}_${name}_Pos)`);
    });
    return parts.length ? parts.join(" | ") : "0U";
  }

  function mount(host, opts) {
    const S = window.MCU_STRINGS.register;
    const r = window.MCU_DATA.regs[opts.reg];
    if (!r) throw new Error(`Register: unknown register "${opts.reg}"`);
    const editable = opts.editable !== false;
    const fields = r.fields;
    const shown = opts.show ? fields.filter((f) => opts.show.includes(f.name)) : fields;
    let value = (opts.value !== undefined ? opts.value : r.reset) >>> 0;
    let port = opts.port || (r.addrOf ? Object.keys(r.addrOf).find((k) => r.addrOf[k] === r.addr) : null);
    const owner = (bit) => fields.find((f) => bit <= f.bits[0] && bit >= f.bits[1]);
    const writable = (f) => f && editable && f.access !== "r";
    const uid = "reg" + Math.random().toString(36).slice(2, 8);

    host.classList.add("reg-host", "glass");
    const title = r.addrOf ? opts.reg.replace("GPIOx", port) : opts.reg;
    host.innerHTML = `<div class="reg-head">
        <div><b class="reg-name mono">${esc(title)}</b> <span class="muted small">${esc(r.title)}</span></div>
        <div class="reg-meta small">
          ${r.addrOf ? `<label>${S.port} <select class="reg-port">${Object.keys(r.addrOf).map((k) => `<option${k === port ? " selected" : ""}>${k}</option>`).join("")}</select></label>` : ""}
          <span>${S.addr} <code class="reg-addr"></code></span><span>${S.reset} <code>${hex(r.reset)}</code></span><span class="badge gray">${esc(r.ref)}</span>
        </div></div>
      <p class="small reg-desc">${esc(r.desc)}</p>
      <div class="reg-bits" role="group" aria-label="${S.bitsLabel(title)}"></div>
      <div class="reg-out">
        <div><span class="muted small">${S.hex}</span> <code class="reg-hex"></code></div>
        <div><span class="muted small">${S.bin}</span> <code class="reg-bin"></code></div>
        <div class="reg-c"><span class="muted small">${S.c}</span> <code class="reg-cexpr"></code></div>
      </div>
      <div class="reg-fields"></div>
      ${editable ? `<div class="reg-actions"><button type="button" class="btn sm" data-act="reset">${S.resetBtn}</button><button type="button" class="btn sm" data-act="clear">${S.clearBtn}</button></div>` : ""}`;

    const bitsEl = host.querySelector(".reg-bits");
    const fieldsEl = host.querySelector(".reg-fields");
    // two rows of 16 bits so it fits on a phone
    const row = (hi) => {
      let h = `<div class="reg-row">`;
      let b = hi;
      while (b > hi - 16) {
        const f = owner(b);
        const lo = f ? Math.max(f.bits[1], hi - 15) : b;
        let span = 1;
        if (!f) { while (b - span > hi - 16 && !owner(b - span)) span++; }
        else span = b - lo + 1;
        const cells = [];
        for (let k = b; k > b - span; k--) {
          cells.push(`<button type="button" class="reg-bit${f ? "" : " rsv"}" data-bit="${k}" ${writable(f) ? "" : 'aria-disabled="true"'} title="${f ? esc(f.name) : S.reserved} · bit ${k}"><span class="reg-bitno">${k}</span><span class="reg-bitval"></span></button>`);
        }
        h += `<div class="reg-field${f ? "" : " rsv"}" style="--span:${span}" ${f ? `data-field="${esc(f.name)}"` : ""}><div class="reg-cells">${cells.join("")}</div><div class="reg-flabel">${f ? esc(f.name) : ""}</div></div>`;
        b -= span;
      }
      return h + `</div>`;
    };
    bitsEl.innerHTML = row(31) + row(15);

    fieldsEl.innerHTML = shown.map((f) => {
      const id = `${uid}-${f.name}`;
      const w = f.bits[0] - f.bits[1] + 1;
      let ctl;
      if (!writable(f)) ctl = `<output id="${id}" class="mono"></output>`;
      else if (f.values) ctl = `<select id="${id}" data-f="${esc(f.name)}">${Object.keys(f.values).map((k) => `<option value="${k}">${k} · ${esc(f.values[k])}</option>`).join("")}</select>`;
      else ctl = `<input id="${id}" data-f="${esc(f.name)}" type="number" min="0" max="${mask(f)}" step="1" inputmode="numeric">`;
      return `<div class="reg-frow" data-field="${esc(f.name)}"><label for="${id}"><code>${esc(f.name)}</code> <span class="muted small">[${f.bits[0]}${w > 1 ? ":" + f.bits[1] : ""}] ${esc(f.access)}</span></label>${ctl}<p class="small">${esc(f.desc)}</p></div>`;
    }).join("");

    function render() {
      const addr = r.addrOf ? r.addrOf[port] : r.addr;
      host.querySelector(".reg-addr").textContent = hex(addr);
      host.querySelector(".reg-name").textContent = r.addrOf ? opts.reg.replace("GPIOx", port) : opts.reg;
      host.querySelectorAll(".reg-bit").forEach((el) => {
        const on = ((value >>> +el.dataset.bit) & 1) === 1;
        el.classList.toggle("on", on);
        el.querySelector(".reg-bitval").textContent = on ? "1" : "0";
        el.setAttribute("aria-pressed", String(on));
      });
      host.querySelector(".reg-hex").textContent = hex(value);
      host.querySelector(".reg-bin").textContent = (value >>> 0).toString(2).padStart(32, "0").replace(/(.{4})(?=.)/g, "$1 ");
      host.querySelector(".reg-cexpr").textContent = `${r.addrOf ? port : r.periph.replace("FLASH_R", "FLASH")}->${r.reg}${r.regIndex !== undefined ? `[${r.regIndex}]` : ""} = ${cExpr(r, value)};`;
      shown.forEach((f) => {
        const el = host.querySelector(`#${uid}-${f.name}`);
        const v = fieldValue(value, f);
        if (el.tagName === "OUTPUT") el.textContent = f.values && f.values[v] !== undefined ? `${v} · ${f.values[v]}` : String(v);
        else if (el.tagName === "SELECT") {
          if (![...el.options].some((o) => +o.value === v)) el.insertAdjacentHTML("beforeend", `<option value="${v}">${v}</option>`);
          el.value = String(v);
        } else el.value = String(v);
      });
      if (opts.onChange) opts.onChange(value);
    }
    function set(v) { value = v >>> 0; render(); }

    host.addEventListener("click", (e) => {
      const bit = e.target.closest(".reg-bit");
      if (bit && bit.getAttribute("aria-disabled") !== "true") { set(value ^ (1 << +bit.dataset.bit)); return; }
      const act = e.target.closest("[data-act]");
      if (act) set(act.dataset.act === "reset" ? r.reset : 0);
    });
    host.addEventListener("change", (e) => {
      if (e.target.classList.contains("reg-port")) { port = e.target.value; render(); return; }
      const name = e.target.dataset && e.target.dataset.f;
      if (!name) return;
      const f = fields.find((x) => x.name === name);
      const v = Math.max(0, Math.min(mask(f), parseInt(e.target.value, 10) || 0));
      set(withField(value, f, v));
    });
    host.addEventListener("pointerover", (e) => {
      const fe = e.target.closest("[data-field]");
      host.querySelectorAll(".lit").forEach((x) => x.classList.remove("lit"));
      if (fe) host.querySelectorAll(`[data-field="${fe.dataset.field}"]`).forEach((x) => x.classList.add("lit"));
    });
    render();
    return { set, get value() { return value; }, field: (n) => fieldValue(value, fields.find((f) => f.name === n)) };
  }

  return { mount, fieldValue, withField, cExpr, hex };
});
