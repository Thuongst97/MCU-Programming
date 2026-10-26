/* SPDX-License-Identifier: MIT
   Module 15 · Fault Handling and Debugging. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  StateMachine($("#sm-escalate"), {
    ariaLabel: "How a Cortex-M4 fault escalates",
    initial: "fault", height: 300, boxW: 180,
    states: [
      { id: "fault", label: "Fault detected", sub: "e.g. divide by zero", x: 20, y: 120, tone: "hw", desc: "<p>The core detects a problem while executing an instruction, fetching one, or stacking registers. It records the reason in <code>CFSR</code> before choosing a handler.</p>" },
      { id: "own", label: "UsageFault_Handler", sub: "own handler runs", x: 400, y: 10, tone: "svc", desc: "<p>Only when its enable bit in <code>SHCSR</code> is set <i>and</i> its priority is higher than the code that faulted. The handler sees the same <code>CFSR</code> bits.</p>" },
      { id: "hard", label: "HardFault_Handler", sub: "HFSR.FORCED = 1", x: 400, y: 230, tone: "cdd", desc: "<p>The fault escalated: the configurable handler was disabled (the default after reset), or could not preempt. <code>FORCED</code> tells you to look at <code>CFSR</code> for the real cause.</p>" },
      { id: "lockup", label: "Lockup", sub: "core stops", x: 790, y: 230, tone: "mcal", desc: "<p>A fault while running the HardFault handler (or NMI) cannot be handled by anything. The core stops fetching instructions. A debugger can still halt it; otherwise only a reset helps.</p>" },
      { id: "reset", label: "Reset", sub: "NVIC_SystemReset()", x: 790, y: 10, tone: "tool", desc: "<p>The usual way out: record, report, then reset to a known state. The next boot finds the record and reports it.</p>" },
    ],
    transitions: [
      { from: "fault", to: "own", label: "enabled + priority OK" },
      { from: "fault", to: "hard", label: "disabled or blocked" },
      { from: "own", to: "hard", label: "fault in handler" },
      { from: "own", to: "reset", label: "record + reset" },
      { from: "hard", to: "reset", label: "record + reset" },
      { from: "hard", to: "lockup", label: "fault in HardFault" },
    ],
  });
  Register($("#reg-shcsr"), { reg: "SCB_SHCSR", value: 0x00000000 });

  const cfsr = Register($("#reg-cfsr"), { reg: "SCB_CFSR", value: 0x02000000, show: ["DIVBYZERO", "UNALIGNED", "NOCP", "INVSTATE", "UNDEFINSTR", "BFARVALID", "LSPERR", "STKERR", "IMPRECISERR", "PRECISERR"] });
  const hfsr = Register($("#reg-hfsr"), { reg: "SCB_HFSR", value: 0x40000000 });
  const PRESETS = [
    ["d: divide by zero", 0x02000000, 0x40000000, "<code>DIVBYZERO</code>, escalated (<code>FORCED</code>). The stacked PC is the <code>UDIV</code> instruction."],
    ["u: undefined instruction", 0x00010000, 0x40000000, "<code>UNDEFINSTR</code>: the core fetched a bit pattern that is not an instruction. In real bugs: a jump into data or erased flash (<code>0xFFFF</code>)."],
    ["i: invalid state", 0x00020000, 0x40000000, "<code>INVSTATE</code>: a branch to an address with bit 0 clear asks for ARM state, which the Cortex-M4 does not have. Typical cause: a corrupted function pointer."],
    ["b: bus fault", 0x00008200, 0x40000000, "<code>PRECISERR</code> + <code>BFARVALID</code>: <code>BFAR</code> = <code>0x10008000</code>, the first address after the 32 KB CCM SRAM, where nothing answers."],
    ["FPU still off", 0x00080000, 0x40000000, "<code>NOCP</code>: a floating-point instruction ran before CP10/CP11 were enabled in <code>SCB-&gt;CPACR</code>. The course's startup code enables them before <code>main</code>; a custom startup that forgets it faults on the first <code>float</code>."],
    ["vector table", 0x00000000, 0x00000002, "<code>VECTTBL</code> with an empty <code>CFSR</code>: the vector fetch itself failed, for example after setting <code>VTOR</code> to a wrong address."],
  ];
  const btns = $("#fault-presets");
  btns.innerHTML = PRESETS.map(([t], i) => `<button type="button" class="btn sm${i ? "" : " on"}" data-i="${i}">${t}</button>`).join("");
  const show = (i) => {
    const [, c, h, why] = PRESETS[i];
    cfsr.set(c);
    hfsr.set(h);
    $("#fault-why").innerHTML = why;
    btns.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
  };
  btns.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(+b.dataset.i); });
  show(0);

  const N08 = {
    1: ["Same order as the hardware", "One table entry per status bit, grouped by sub-register, in the order they are printed."],
    2: ["HardFault reasons", "Only three bits matter in <code>HFSR</code>."],
    6: ["Which stack?", "<code>EXC_RETURN</code> bit 2: 0 = the frame is on MSP, 1 = on PSP. The naked function has no prologue, so no register or stack has changed yet."],
    7: ["Copy the evidence first", "Status registers, then the fault address registers. Printing could cause another fault and change them."],
    8: ["The faulting PC", "Word 6 of the frame, with or without an FPU extension behind it. For precise faults it points at the instruction that failed."],
    9: ["Reset", "<code>NVIC_SystemReset()</code> sets <code>SYSRESETREQ</code> in <code>AIRCR</code>. The record survives in <code>.noinit</code>."],
  };
  explore("#ex-tables", "src-08-tables", N08);
  explore("#ex-handler", "src-08-handler", N08);
  explore("#ex-record", "src-08-record", {
    1: ["section(\".noinit\")", "The linker script places <code>.noinit</code> in RAM after <code>.bss</code> but outside the ranges <code>Reset_Handler</code> copies or zeroes, so its contents survive a reset (not a power cycle). A magic number tells valid data from random power-up contents."],
  });
  explore("#ex-boot2", "src-08-boot2", {
    14: ["Reset cause first", "Then the stored fault, printed once and invalidated so it is not reported again on the next boot."],
  });
  explore("#ex-faults", "src-08-faults", {
    10: ["Trap divide by zero", "By default the Cortex-M4 returns 0 for an integer division by zero. <code>CCR.DIV_0_TRP</code> turns it into a UsageFault, which is what you want while developing."],
    11: ["UDF", "An instruction encoding that is guaranteed to be undefined."],
    12: ["Thumb bit cleared", "Branching to an even address requests ARM state: INVSTATE."],
    13: ["Nothing at 0x10008000", "CCM SRAM ends at <code>0x10007FFF</code> on the G474 and the next range is reserved (RM0440 memory map), so the bus reports an error."],
  });
  const NG = {
    1: ["EXC_RETURN", "Same test as in the handler, done in GDB."],
    2: ["Back to source", "<code>info symbol</code> names the function, <code>list *addr</code> shows the line (needs the ELF with debug info)."],
    3: ["Watchpoint", "Halts on the instruction after the write, with the full call stack available."],
    4: ["Ignore counts", "Cheaper than a condition, which the debugger evaluates on every hit while the target is halted."],
    5: ["Break on the handler", "Stop before the handler resets the chip, then run <code>fault</code>."],
  };
  explore("#ex-gdb-fault", "src-gdb-fault", NG);
  explore("#ex-gdb-watch", "src-gdb-watch", NG);

  Checklist($("#ck-faults"), [
    "With example 08, each of <kbd>d</kbd>, <kbd>u</kbd> and <kbd>i</kbd> prints a different fault reason, and the next boot reports it once.",
    "You can name the four fault exceptions and say why all of them arrive in HardFault in example 08.",
    "You can find the faulting PC by hand from <code>MSP</code>/<code>PSP</code> and <code>EXC_RETURN</code>, and turn it into a source line with <code>addr2line</code>.",
    "You know why an <code>IMPRECISERR</code> PC is misleading and how to make the fault precise.",
    "You set a watchpoint in the debugger and caught the write to a variable.",
  ], { key: "faults-debug" });
})();
