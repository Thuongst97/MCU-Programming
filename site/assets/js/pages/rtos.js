/* SPDX-License-Identifier: MIT
   Module 14 · Bare Metal vs RTOS: FreeRTOS on Cortex-M3. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, StateMachine, Waveform, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  /* scheduler timeline: one cell ≈ 1 ms, task run times drawn wider than they are */
  const CELLS = 24;
  const row = (on) => {
    let s = "", prev = "";
    for (let i = 0; i < CELLS; i++) {
      const c = on.includes(i) ? "1" : "0";
      s += c === prev ? "." : c;
      prev = c;
    }
    return s;
  };
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  Waveform($("#wv-sched"), {
    title: "Example 10, first 24 ms (run times not to scale)",
    hscale: 30,
    signals: [
      { name: "EXTI0 ISR", wave: row([8]) },
      { name: "sensor (3)", wave: row([0, 10, 20]) },
      { name: "button (2)", wave: row([9]) },
      { name: "logger (1)", wave: row([1, 11, 21]) },
      { name: "blink (1)", wave: row([2]) },
      { name: "idle (0)", wave: row([...range(3, 7), ...range(12, 19), 22, 23]) },
    ],
    marks: [{ at: 0, text: "tick 0" }, { at: 8, text: "button" }, { at: 10, text: "tick 10" }, { at: 20, text: "tick 20" }],
  });

  SequenceDiagram($("#seq-switch"), {
    ariaLabel: "A FreeRTOS context switch on Cortex-M3",
    laneW: 165,
    lanes: [
      { title: "Task A", sub: "Thread mode, PSP", tone: "asw" },
      { title: "SysTick", sub: "kernel priority 15", tone: "hw" },
      { title: "PendSV handler", sub: "port.c", tone: "rte" },
      { title: "Scheduler", sub: "vTaskSwitchContext()", tone: "svc" },
      { title: "Task B", sub: "Thread mode, PSP", tone: "asw" },
    ],
    steps: [
      { from: 1, to: 0, kind: "irq", label: "tick", title: "The tick interrupts task A",
        detail: "<p>The core pushes R0–R3, R12, LR, PC and xPSR onto task A's stack (PSP) by itself, then runs the SysTick handler on the main stack (MSP).</p>" },
      { from: 1, to: 3, kind: "call", label: "xTaskIncrementTick()", title: "Count the tick",
        detail: "<p>The kernel advances its tick count and moves tasks whose delay has expired from Blocked to Ready. If one of them has a higher priority than task A, a switch is needed.</p>" },
      { from: 1, to: 2, kind: "irq", label: "set PENDSVSET", title: "Request a switch, don't do it",
        detail: "<p>SysTick only sets the PendSV pending bit in <code>SCB-&gt;ICSR</code> and returns. PendSV has the lowest priority, so it runs once no other interrupt is active (tail-chained if nothing else is pending).</p>" },
      { from: 2, to: 0, kind: "bus", label: "push R4–R11", title: "Save the rest of task A",
        detail: "<p>The handler reads PSP and pushes the eight registers the hardware did not save. Task A's stack now holds its complete context. The resulting stack pointer is stored in task A's control block (TCB).</p>",
        analogy: "Putting a bookmark in the book and writing the page number on the cover." },
      { from: 2, to: 3, kind: "call", label: "pick next", title: "Choose the next task",
        detail: "<p>With <code>BASEPRI</code> raised to <code>configMAX_SYSCALL_INTERRUPT_PRIORITY</code>, the scheduler selects the highest-priority Ready task and makes its TCB current. Interrupts more urgent than that limit still run.</p>" },
      { from: 2, to: 4, kind: "bus", label: "pop R4–R11", title: "Restore task B",
        detail: "<p>Load task B's saved stack pointer from its TCB, pop R4–R11, and write the result to PSP.</p>" },
      { from: 2, to: 4, kind: "irq", label: "exception return", title: "Return into task B",
        detail: "<p>Returning with <code>EXC_RETURN = 0xFFFFFFFD</code> (Thread mode, use PSP) makes the core pop the other eight registers from task B's stack. Task B continues exactly where it was interrupted, unaware that anything happened.</p>" },
    ],
  });

  StateMachine($("#sm-task"), {
    ariaLabel: "FreeRTOS task states",
    initial: "ready", height: 300, boxW: 170,
    states: [
      { id: "ready", label: "Ready", sub: "can run, waits for CPU", x: 40, y: 110, tone: "tool", desc: "<p>The task could run but a task of higher or equal priority is running. Tasks of equal priority share the CPU in turns at each tick (time slicing).</p>" },
      { id: "running", label: "Running", sub: "owns the CPU", x: 420, y: 10, tone: "svc", desc: "<p>Exactly one task is running. It stays there until it blocks, is suspended, or a higher-priority task becomes ready.</p>" },
      { id: "blocked", label: "Blocked", sub: "waits, with timeout", x: 800, y: 110, tone: "mcal", desc: "<p>Waiting for time (<code>vTaskDelay</code>, <code>vTaskDelayUntil</code>) or an object (queue, semaphore, mutex, notification). Uses no CPU. The timeout returns it to Ready even if the event never comes.</p>" },
      { id: "suspended", label: "Suspended", sub: "parked, no timeout", x: 600, y: 235, tone: "cdd", desc: "<p>Taken out of scheduling by <code>vTaskSuspend()</code> until another task calls <code>vTaskResume()</code>. Rarely needed; a blocked task with a timeout is usually what you want.</p>" },
    ],
    transitions: [
      { from: "ready", to: "running", label: "scheduled", desc: "It is the highest-priority Ready task." },
      { from: "running", to: "ready", label: "preempted", desc: "A higher-priority task became Ready (from a tick, an ISR or another task), or a time slice ended." },
      { from: "running", to: "blocked", label: "waits", desc: "<code>xQueueReceive</code>, <code>xSemaphoreTake</code>, <code>vTaskDelay</code>…" },
      { from: "blocked", to: "ready", label: "event or timeout", desc: "Data arrived, the semaphore was given, or the delay expired." },
      { from: "running", to: "suspended", label: "vTaskSuspend" },
      { from: "suspended", to: "ready", label: "vTaskResume" },
    ],
  });

  explore("#ex-config", "src-10-config", {
    1: ["CPU clock", "The port programs SysTick from this value. It is read when the scheduler starts, so the 72 MHz clock must be set up before."],
    2: ["Preemption", "A task that becomes ready with a higher priority runs immediately, not at the next yield."],
    3: ["Words, not bytes", "FreeRTOS stack sizes count <code>StackType_t</code> units: 32-bit words on Cortex-M. 128 words = 512 bytes."],
    4: ["Static allocation only", "Every TCB, stack and queue buffer is an array we declare. No heap, so no fragmentation and the linker reports the real RAM use."],
    5: ["Overflow check method 2", "A known pattern at the end of each stack is checked on every switch."],
    6: ["Kernel at the lowest priority", "SysTick and PendSV get NVIC priority 15 so they never delay an application interrupt."],
    7: ["The syscall limit", "Interrupts with NVIC priority 0–4 are never masked by the kernel and must not use FreeRTOS. 5–15 may call FromISR functions."],
    8: ["Handler names", "The port's handlers are renamed to the names in our vector table instead of editing the table."],
  });
  const N10 = {
    1: ["Take with a timeout", "Waiting forever for a lock hides deadlocks; a timeout turns them into a visible failure."],
    2: ["vTaskDelayUntil", "Wakes at fixed multiples of 10 ms from the previous wake time, so execution time does not add drift (vTaskDelay would)."],
    3: ["Don't block a periodic task", "Timeout 0: if the queue is full, the sample is dropped rather than delaying the next period."],
    4: ["Block until data", "<code>portMAX_DELAY</code>: the logger sleeps until the sensor sends something."],
    5: ["vTaskDelay", "Relative delay: fine for a blinking LED, where drift does not matter."],
    6: ["Wait for the ISR", "The task sleeps on the semaphore; the EXTI0 handler gives it."],
    7: ["High-water mark", "The minimum free stack space ever seen, in words."],
    8: ["FromISR", "Never blocks. Reports through <code>woken</code> whether a higher-priority task became ready."],
    9: ["Yield on exit", "If so, PendSV is set and the switch happens right after the ISR returns, so the button task runs without waiting for the next tick."],
    10: ["Priority 6", "Numerically at or above the syscall limit (5), so this ISR may call FromISR functions."],
    11: ["Grouping 0", "All 4 implemented priority bits are preemption bits; FreeRTOS expects no sub-priorities."],
    12: ["Priorities by deadline", "The task with the tightest deadline gets the highest priority (rate-monotonic thinking)."],
    13: ["Start", "Creates the idle and timer tasks, programs SysTick and starts the first task with SVC. It returns only if it could not start."],
    14: ["Overflow hook", "Called from the context switch with the overflowing task's name. The stack is corrupt; stop and report."],
  };
  ["tasks", "print", "isr", "main", "hooks"].forEach((r) => explore(`#ex-${r}`, `src-10-${r}`, N10));

  /* NVIC priority explorer: which levels the kernel masks, which may call FromISR */
  const host = $("#prio-bar");
  let limit = 5;
  const draw = () => {
    const cells = Array.from({ length: 16 }, (_, p) => {
      const cls = p < limit ? "never" : p === 15 ? "kernel" : "api";
      return `<div class="prio-cell ${cls}" title="NVIC priority ${p} (register value 0x${(p << 4).toString(16).toUpperCase().padStart(2, "0")})"><b>${p}</b></div>`;
    }).join("");
    host.innerHTML = `<div class="prio-head"><label for="prio-lim">configMAX_SYSCALL_INTERRUPT_PRIORITY <input id="prio-lim" type="range" min="1" max="15" value="${limit}"> <code>${limit} &lt;&lt; 4 = 0x${(limit << 4).toString(16).toUpperCase()}</code></label></div>
      <div class="prio-row">${cells}</div>
      <div class="prio-legend"><span class="prio-cell never"></span> 0–${limit - 1}: never masked by the kernel, <b>no FreeRTOS calls</b>
        <span class="prio-cell api"></span> ${limit}–14: masked in critical sections, FromISR allowed
        <span class="prio-cell kernel"></span> 15: SysTick and PendSV</div>`;
    $("#prio-lim", host).addEventListener("input", (e) => { limit = +e.target.value; draw(); $("#prio-lim", host).focus(); });
  };
  draw();

  Checklist($("#ck-rtos"), [
    "You can explain why the switch happens in PendSV and not in SysTick.",
    "You know which registers the hardware saves and which the port saves.",
    "Example 10 prints the logger means and the stack high-water marks, and pressing the button prints a line from the button task.",
    "You can say which NVIC priorities may call <code>xSemaphoreGiveFromISR()</code> with our configuration, and why priority 0 may not.",
    "You can explain priority inversion and why the UART lock is a mutex, not a binary semaphore.",
  ], { key: "rtos" });
})();
