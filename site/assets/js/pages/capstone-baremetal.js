/* SPDX-License-Identifier: MIT
   Module 24 · Capstone 1: Turn-Signal ECU, Bare Metal. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Pinout, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Pinout($("#po-tl"), { board: "bluepill", mode: "wiring", ...window.MCU_DATA.wiring["tl-ecu"] });

  /* ---- flasher simulator: the rules of logic/turnlight_sm.c, ported line by line ---- */
  const P = 670, ON = 330, FP = 340, FON = 170, TAP = 500, CYC = 3;
  const t = { mode: "idle", side: 0, hazard: false, prev: [false, false], phase: 0, hphase: 0, held: 0, cycles: 0 };
  const inp = { stalk: [false, false], hazardPressed: false, failed: [false, false] };
  const per = (f) => (f ? FP : P);
  const lampOn = (ph, f) => ph % per(f) < (f ? FON : ON);
  function step(dt) {
    if (inp.hazardPressed) { t.hazard = !t.hazard; t.hphase = 0; if (t.hazard && t.mode === "comfort") t.mode = "idle"; inp.hazardPressed = false; }
    for (let s = 0; s < 2; s++) {
      const pressed = inp.stalk[s] && !t.prev[s], released = !inp.stalk[s] && t.prev[s];
      if (pressed && !(t.mode === "turn" && t.side === 1 - s)) { t.mode = "turn"; t.side = s; t.phase = 0; t.held = 0; t.cycles = 0; }
      if (released && t.mode === "turn" && t.side === s) t.mode = t.held < TAP ? "comfort" : "idle";
      t.prev[s] = inp.stalk[s];
    }
    if (t.mode !== "idle") {
      t.held += t.mode === "turn" ? dt : 0;
      t.phase += dt;
      if (t.phase >= per(inp.failed[t.side])) { t.phase -= per(inp.failed[t.side]); t.cycles++; if (t.mode === "comfort" && t.cycles >= CYC) t.mode = "idle"; }
    }
    if (t.hazard) t.hphase = (t.hphase + dt) % (P * FP);
    return [0, 1].map((s) => (t.hazard ? lampOn(t.hphase, inp.failed[s]) : t.mode !== "idle" && t.side === s && lampOn(t.phase, inp.failed[s])));
  }
  const host = $("#tl-sim");
  const N = 400;                                   // 4 s of 10 ms samples
  const hist = [new Array(N).fill(0), new Array(N).fill(0)];
  host.innerHTML = `<div class="tlsim-top">
      <div class="tlsim-lamps"><span class="tlsim-lamp" data-l="0">◀</span><span class="tlsim-lamp" data-l="1">▶</span></div>
      <div class="tlsim-btns">
        <button type="button" class="btn sm" data-a="hold0" aria-pressed="false">Hold left stalk</button>
        <button type="button" class="btn sm" data-a="tap0">Tap left</button>
        <button type="button" class="btn sm" data-a="hold1" aria-pressed="false">Hold right stalk</button>
        <button type="button" class="btn sm" data-a="tap1">Tap right</button>
        <button type="button" class="btn sm primary" data-a="hazard">Hazard</button>
        <label class="tlsim-chk"><input type="checkbox" data-a="fail0"> left lamp blown</label>
        <label class="tlsim-chk"><input type="checkbox" data-a="fail1"> right lamp blown</label>
      </div></div>
    <svg class="tlsim-wave" viewBox="0 0 ${N} 70" preserveAspectRatio="none" role="img" aria-label="Lamp states over the last 4 seconds">
      <polyline class="tlsim-l" points=""/><polyline class="tlsim-r" points=""/></svg>
    <p class="tlsim-state small muted" aria-live="polite"></p>`;
  let tapLeft = [0, 0];
  host.addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]");
    if (!a) return;
    const k = a.dataset.a;
    if (k.startsWith("hold")) { const s = +k[4]; inp.stalk[s] = !inp.stalk[s]; a.setAttribute("aria-pressed", String(inp.stalk[s])); a.classList.toggle("on", inp.stalk[s]); }
    else if (k.startsWith("tap")) { const s = +k[3]; inp.stalk[s] = true; tapLeft[s] = 20; }   // held for 200 ms
    else if (k === "hazard") inp.hazardPressed = true;
    else if (k.startsWith("fail")) inp.failed[+k[4]] = a.checked;
  });
  const lamps = host.querySelectorAll(".tlsim-lamp");
  const lines = [host.querySelector(".tlsim-l"), host.querySelector(".tlsim-r")];
  let visible = true, ticks = 0;
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(host);
  setInterval(() => {
    if (!visible) return;
    for (let k = 0; k < 5; k++) {                  // 5 steps of 10 ms per 50 ms timer tick
      for (let s = 0; s < 2; s++) if (tapLeft[s] > 0 && --tapLeft[s] === 0) inp.stalk[s] = false;
      const out = step(10);
      for (let s = 0; s < 2; s++) { hist[s].push(out[s] ? 1 : 0); hist[s].shift(); }
    }
    ticks++;
    lamps.forEach((el, s) => el.classList.toggle("on", !!hist[s][N - 1]));
    lines.forEach((pl, s) => {
      const base = s ? 62 : 28;
      pl.setAttribute("points", hist[s].map((v, i) => `${i},${base - v * 20}`).join(" "));
    });
    if (ticks % 4 === 0) host.querySelector(".tlsim-state").textContent = `mode: ${t.mode}${t.mode !== "idle" ? (t.side ? " right" : " left") : ""}${t.hazard ? ", hazard on" : ""}${t.mode === "comfort" ? `, flashes done: ${t.cycles}/3` : ""}`;
  }, 50);

  StateMachine($("#sm-tl"), {
    ariaLabel: "TurnLight state machine",
    initial: "idle", height: 280, boxW: 170,
    states: [
      { id: "idle", label: "Idle", sub: "lamps off", x: 40, y: 110, tone: "tool", desc: "<p>No request. A stalk press starts TURN on that side, with the lamp on at once.</p>" },
      { id: "turn", label: "Turn", sub: "stalk held", x: 420, y: 20, tone: "svc", desc: "<p>Flashing one side at 1.5 Hz (3 Hz with a failed lamp) while the stalk is held. Counts how long it is held.</p>" },
      { id: "comfort", label: "Comfort", sub: "3 flashes after a tap", x: 420, y: 200, tone: "mcal", desc: "<p>The stalk was released within 500 ms: finish three full flash cycles, then go idle. A new press on either side takes over.</p>" },
      { id: "hazard", label: "Hazard", sub: "both sides, in phase", x: 800, y: 110, tone: "cdd", desc: "<p>Runs on top of the others: both lamps flash with one phase counter. Pressing hazard again returns to whatever the stalk says.</p>" },
    ],
    transitions: [
      { from: "idle", to: "turn", label: "stalk pressed" },
      { from: "turn", to: "comfort", label: "released < 500 ms" },
      { from: "turn", to: "idle", label: "released ≥ 500 ms", bend: 40 },
      { from: "comfort", to: "idle", label: "3 cycles done" },
      { from: "comfort", to: "turn", label: "new press", bend: 40 },
      { from: "turn", to: "hazard", label: "hazard" },
      { from: "idle", to: "hazard", label: "hazard", bend: -60 },
      { from: "hazard", to: "turn", label: "hazard (stalk held)", bend: 40 },
    ],
  });

  const NSM = {
    1: ["A new request wins", "Pressing a side starts a fresh TURN, cancelling a comfort blink. The opposite side cannot interrupt a side that is still held."],
    2: ["Tap or hold", "Held less than 500 ms: comfort blink (TL-REQ-004). Longer: stop at release."],
    3: ["Hazard toggles", "The debounced press is an edge; the state machine toggles on it (TL-REQ-003)."],
    4: ["Count complete cycles", "One on and one off phase. Comfort mode stops after three."],
    5: ["In phase", "Both lamps use the same hazard phase counter, each at its own rate if a lamp has failed."],
  };
  explore("#ex-tl-stalk", "src-tl-stalk", NSM);
  explore("#ex-tl-step", "src-tl-step", NSM);
  const N1 = {
    1: ["Debounce every button", "Example 01's debouncer, fed with the raw level and the time."],
    2: ["Latch the hazard edge", "The logic job consumes it; latching keeps it even if the logic job runs a little later."],
    3: ["Step the state machine", "10 ms at a time; it returns true when any output changed."],
    4: ["Edge consumed", "So one press toggles hazard exactly once."],
    5: ["Supervise ClusterAck", "500 ms without an acknowledgement: report, keep the lamps working (TL-REQ-007)."],
    6: ["On change or every 100 ms", "TL-REQ-006's two triggers in one condition."],
    7: ["Pack the frame", "The layout of docs/can-matrix.md, tested on the host."],
    8: ["Check-ins", "Every job sets a bit; only when all bits are set is the watchdog fed (TL-REQ-009)."],
  };
  ["input", "logic", "can", "sup"].forEach((r) => explore(`#ex-s1-${r}`, `src-s1-${r}`, N1));
  explore("#ex-hw-ramp", "src-hw-ramp", {
    1: ["20 ms ramp", "Called every 5 ms: four steps from 0 to 100 % (TL-REQ-008), gentler on a real bulb's filament and on EMC."],
    2: ["Preloaded compare", "The new duty takes effect at the next timer update, so no output glitch."],
  });

  Checklist($("#ck-cap1"), [
    "<code>ctest --preset host-tests</code> passes the TurnLight state-machine and lamp-monitor tests.",
    "The acceptance suite passes for stage 1 in Renode: <code>python3 tools/run-renode-tests.py capstone/turnlight/test/turnlight.robot</code>.",
    "On hardware, the left lamp flashes at 1.5 Hz with the stalk held, and a tap gives exactly three flashes.",
    "Turning the pot to GND while a side flashes doubles its rate and logs <code>dem: TL_E_LAMP_OUT_…</code>.",
    "With the cluster node connected, the OLED telltales follow the lamps; holding PA0 on the cluster logs <code>TL_E_CLUSTER_LOST</code>.",
  ], { key: "capstone-baremetal" });
})();
