/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — code text utilities: syntax tokenizer, «n» annotation markers.
   Pure functions, no DOM: loaded by the browser (window.MCU_CODE) and by the
   Node unit tests (require / import), so what the tests check is what runs.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MCU_CODE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const set = (s) => new Set(s.split(/\s+/).filter(Boolean));

  const C_KW = "auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool _Static_assert _Alignas _Alignof _Noreturn _Atomic bool true false NULL";
  const C_TY = "uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t size_t uintptr_t intptr_t ptrdiff_t " +
    "uint8 uint16 uint32 uint64 sint8 sint16 sint32 sint64 boolean float32 float64 Std_ReturnType Std_VersionInfoType StatusType TaskType EventMaskType AlarmType TickType";
  const DQ = String.raw`"(?:\\.|[^"\\\n])*"`;
  const SQ = String.raw`'(?:\\.|[^'\\\n])*'`;
  const NUM = String.raw`\b0[xX][0-9A-Fa-f]+[uUlL]*\b|\b0[bB][01]+[uUlL]*\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUlLfF]*\b`;

  /**
   * Language table. Each entry: com (comment regex), str (string regex), pp (preprocessor regex),
   * extra ([regex, cls] tried before identifiers), id (identifier regex), kw/ty sets,
   * classify(word, next, ctx) for language-specific identifier colouring.
   */
  const LANGS = {
    c: { com: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`, str: `${DQ}|${SQ}`, pp: String.raw`^[ \t]*#[ \t]*[a-z]+(?:\\\n|[^\n])*`, kw: set(C_KW), ty: set(C_TY) },
    cpp: { com: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`, str: `${DQ}|${SQ}`, pp: String.raw`^[ \t]*#[ \t]*[a-z]+(?:\\\n|[^\n])*`,
      kw: set(C_KW + " namespace class public private protected override final constexpr auto template typename virtual explicit operator new delete nullptr using this throw try catch noexcept"), ty: set(C_TY + " std string vector array") },
    asm: { com: String.raw`@[^\n]*|\/\/[^\n]*|\/\*[\s\S]*?\*\/`, str: DQ, extra: [[String.raw`#-?(?:0x[0-9A-Fa-f]+|\d+)`, "num"], [String.raw`\.[A-Za-z_][\w.]*`, "kw"]],
      id: String.raw`[A-Za-z_$][\w$.]*`,
      ty: set("r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 sp lr pc psr apsr xpsr msp psp primask basepri faultmask control"),
      classify(w, next, ctx) { if (next === ":") return "fn"; if (ctx.firstOnLine) return "kw"; return ""; } },
    ld: { com: String.raw`\/\*[\s\S]*?\*\/`, str: DQ, extra: [[String.raw`\.[A-Za-z_][\w.]*`, "ty"], [String.raw`\b\d+[KM]\b`, "num"]],
      kw: set("MEMORY SECTIONS ENTRY KEEP ALIGN PROVIDE PROVIDE_HIDDEN ORIGIN LENGTH AT SIZEOF ADDR LOADADDR NOLOAD ASSERT INCLUDE GROUP OUTPUT_FORMAT OUTPUT_ARCH DISCARD") },
    cmake: { com: String.raw`#[^\n]*`, str: DQ, extra: [[String.raw`\$\{[^}\n]+\}|\$<[^>\n]+>`, "ann"]], id: String.raw`[A-Za-z_][\w-]*`,
      classify(w, next) { return next === "(" ? "fn" : ""; } },
    sh: { com: String.raw`(?:^|(?<=\s))#[^\n]*`, str: `${DQ}|${SQ}`, extra: [[String.raw`\$\{[^}\n]+\}|\$[A-Za-z_]\w*`, "ann"], [String.raw`(?<=\s)--?[A-Za-z][\w-]*`, "attr"]],
      id: String.raw`[A-Za-z_][\w./-]*`, kw: set("if then else elif fi for while do done case esac in export sudo cd echo function return source"),
      classify(w, next, ctx) { return ctx.firstOnLine && !this.kw.has(w) ? "fn" : ""; } },
    tcl: { com: String.raw`(?:^|(?<=[;\s]))#[^\n]*`, str: DQ, extra: [[String.raw`\$\{?[A-Za-z_][\w:]*\}?`, "ann"], [String.raw`(?<=\s)-[A-Za-z][\w-]*`, "attr"]],
      kw: set("set proc if else elseif source find expr return foreach while info exists puts adapter transport reset_config init targets halt shutdown program verify reset") },
    robot: { com: String.raw`(?:^|(?<=\s))#[^\n]*`, str: DQ, extra: [[String.raw`^\*\*\*[^\n]*\*\*\*`, "kw"], [String.raw`[$@&%]\{[^}\n]+\}`, "ann"]], id: String.raw`[A-Za-z_][\w-]*` },
    resc: { com: String.raw`#[^\n]*`, str: `${DQ}|"""[\s\S]*?"""`, extra: [[String.raw`@[\w/.:-]+`, "str"], [String.raw`\$[A-Za-z_]\w*\??`, "ann"]],
      kw: set("using mach create machine sysbus emulation showAnalyzer macro runMacro include start pause quit logLevel LoadPlatformDescription LoadPlatformDescriptionFromString LoadELF StartGdbServer") },
    yaml: { com: String.raw`(?:^|(?<=\s))#[^\n]*`, str: `${DQ}|${SQ}`, extra: [[String.raw`^[ \t-]*[\w.-]+(?=\s*:)`, "attr"]], kw: set("true false null yes no on off") },
    json: { extra: [[String.raw`${DQ}(?=\s*:)`, "attr"], [DQ, "str"]], kw: set("true false null") },
  };
  LANGS.h = LANGS.c;
  LANGS.s = LANGS.asm;
  LANGS.ini = LANGS.yaml;

  function push(out, cls, t) {
    const last = out[out.length - 1];
    if (last && last.cls === cls && !cls) last.text += t;
    else out.push({ cls, text: t });
  }

  function tokXml(code) {
    const re = /(<!--[\s\S]*?-->)|(<\/?[\w:.-]+)|([\w:.-]+)(?==)|("[^"]*")|(\/?>|\?>)|([\s\S])/g;
    const out = [];
    let m;
    while ((m = re.exec(code))) push(out, m[1] ? "com" : m[2] ? "tag" : m[3] ? "attr" : m[4] ? "str" : m[5] ? "tag" : "", m[0]);
    return out;
  }

  /** Console transcripts: "$ cmd" lines are shell, everything else is program output. */
  function tokConsole(code) {
    const out = [];
    code.split("\n").forEach((line, i) => {
      if (i) push(out, "", "\n");
      const m = line.match(/^(\s*[$>#] )(.*)$/);
      if (m) { push(out, "pp", m[1]); tokenize(m[2], "sh").forEach((t) => push(out, t.cls, t.text)); }
      else if (line) push(out, "out", line);
    });
    return out;
  }

  /** Split code into [{cls, text}] tokens. Unknown languages come back as one plain token. */
  function tokenize(code, lang) {
    lang = String(lang || "").toLowerCase();
    if (lang === "xml" || lang === "arxml" || lang === "html" || lang === "svg") return tokXml(code);
    if (lang === "console") return tokConsole(code);
    const L = LANGS[lang];
    if (!L) return [{ cls: "", text: code }];
    const parts = [];
    const add = (src, cls) => { if (src) parts.push([src, cls]); };
    add(L.com, "com");
    add(L.str, "str");
    add(L.pp, "pp");
    (L.extra || []).forEach(([src, cls]) => add(src, cls));
    add(NUM, "num");
    add(L.id || String.raw`[A-Za-z_]\w*`, "id");
    const re = new RegExp(parts.map(([src]) => `(${src})`).join("|") + String.raw`|([\s\S])`, "gm");
    const kw = L.kw || new Set(), ty = L.ty || new Set();
    const out = [];
    let m, lineStart = 0, sawWord = false;
    while ((m = re.exec(code))) {
      const t = m[0];
      const g = m.findIndex((x, i) => i > 0 && x !== undefined) - 1;
      let cls = g >= 0 && g < parts.length ? parts[g][1] : "";
      const nl = t.lastIndexOf("\n");
      if (nl >= 0) { lineStart = m.index + nl + 1; sawWord = false; }
      if (cls === "id") {
        let k = re.lastIndex;
        while (code[k] === " " || code[k] === "\t") k++;
        const next = code[k];
        const firstOnLine = !sawWord && /^\s*$/.test(code.slice(lineStart, m.index));
        cls = (L.classify && L.classify.call(L, t, next, { firstOnLine })) || "";
        if (!cls) {
          if (kw.has(t)) cls = "kw";
          else if (ty.has(t) || /(?:_t|[a-z]Type|_TypeDef)$/.test(t)) cls = "ty";  // uint32_t, Dio_ChannelType, GPIO_TypeDef
          else if (/^[A-Z][A-Z0-9_]{2,}$/.test(t)) cls = "cst";
          else if (next === "(") cls = "fn";
        }
        sawWord = true;
      }
      push(out, cls, t);
    }
    return out;
  }

  /** Tokens → array of HTML strings, one per line, with <span class="t-…"> wrappers. */
  function toLines(tokens) {
    const lines = [[]];
    tokens.forEach((tok) => {
      tok.text.split("\n").forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part) lines[lines.length - 1].push(tok.cls ? `<span class="t-${tok.cls}">${esc(part)}</span>` : esc(part));
      });
    });
    return lines.map((l) => l.join(""));
  }

  // A marker at line end, bare («3») or wrapped in the language's comment syntax:
  // "// «3»", "/* «3» */", "@ «3»", "# «3»", "; «3»", "-- «3»" (CLAUDE.md rule 16).
  const MARK_RE = /[ \t]*(?:(?:\/\/|@|#|;|--)[ \t]*«(\d+)»|\/\*[ \t]*«(\d+)»[ \t]*\*\/|«(\d+)»)[ \t]*$/;

  /** Strip «n» markers. Returns {code, marks: {lineIndex: n}} with the comment that carried them removed. */
  function parseMarks(src) {
    const marks = {};
    const lines = String(src).replace(/^\n+|\s+$/g, "").split("\n").map((line, i) => {
      const m = line.match(MARK_RE);
      if (m) { marks[i] = +(m[1] || m[2] || m[3]); return line.slice(0, m.index); }
      return line;
    });
    return { code: lines.join("\n"), marks };
  }

  /** Source line numbers for `count` shown lines: start at `start`, jump over `skip`
      ("4,7": region-marker lines tools/embed-code.py removed). */
  function lineNumbers(count, start, skip) {
    const gone = new Set(String(skip || "").split(",").filter(Boolean).map(Number));
    const out = [];
    for (let n = +start || 1; out.length < count; n++) if (!gone.has(n)) out.push(n);
    return out;
  }

  return { esc, LANGS, tokenize, toLines, parseMarks, lineNumbers, MARK_RE };
});
