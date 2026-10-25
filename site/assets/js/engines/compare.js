/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — bad-vs-good comparison (PLAN.md §9.9).
   MCU.Compare(host, { bad: "src-…", good: "src-…", rule?, why, badgeText? })
   bad/good are ids of embedded <script type="text/plain" data-src=…> blocks, so
   both versions come from files that compile (CLAUDE.md rule 17). Rules are cited
   by number with our own one-line paraphrase (CLAUDE.md rule 7).
   ========================================================================= */
(function () {
  "use strict";
  const MCU = (window.MCU = window.MCU || {});
  MCU.Compare = function (host, spec) {
    const S = window.MCU_STRINGS.compare;
    const { embedded, codeBlockHTML, parseMarks, esc, wireCopy } = MCU;
    const block = (id, label) => {
      const e = embedded(id);
      return codeBlockHTML({ code: parseMarks(e.src).code, lang: e.lang, file: e.file, label, src: e.source, start: e.start, end: e.end, skip: e.skip });
    };
    host.classList.add("cmp-host");
    host.innerHTML = `<div class="cmp-badges">${[].concat(spec.rule || []).map((r) => `<span class="badge purple">${esc(r)}</span>`).join("")}</div>
      <div class="cmp-grid">
        <div class="cmp-col bad"><div class="cmp-tag">✗ ${esc(S.bad)}</div>${block(spec.bad, S.bad)}</div>
        <div class="cmp-col good"><div class="cmp-tag">✓ ${esc(S.good)}</div>${block(spec.good, S.good)}</div>
      </div>
      <div class="cmp-why small">${spec.why || ""}</div>`;
    wireCopy(host);
  };
})();
