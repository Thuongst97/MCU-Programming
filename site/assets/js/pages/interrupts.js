/* SPDX-License-Identifier: MIT
   Module 06 · Interrupts, NVIC, EXTI and SysTick. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, SequenceDiagram, Register, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  SequenceDiagram($("#seq-entry"), {
    ariaLabel: "Exception entry and return on the Cortex-M3",
    lanes: [
      { title: "Peripheral", sub: "USART1", tone: "hw" },
      { title: "NVIC", sub: "priorities", tone: "hw" },
      { title: "Core", sub: "main() running", tone: "hw" },
      { title: "Stack", sub: "MSP in SRAM", tone: "tool" },
      { title: "Handler", sub: "USART1_IRQHandler", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "irq", label: "IRQ 37 pending", title: "The peripheral raises its request", detail: "<p>A byte arrived: USART1 sets <code>RXNE</code>, and with <code>RXNEIE</code> enabled it asserts its interrupt line. The NVIC marks IRQ 37 pending.</p>" },
      { from: 1, to: 2, kind: "irq", label: "higher priority?", title: "The NVIC compares priorities", detail: "<p>If IRQ 37 is enabled and its priority is higher than whatever runs now (thread code has the lowest), the core takes the exception at the next instruction boundary.</p>" },
      { from: 2, to: 3, kind: "bus", label: "push 8 words", title: "Stacking", detail: "<p>The core pushes <code>xPSR, PC, LR, R12, R3, R2, R1, R0</code>: exactly the registers a C function may change without saving them (AAPCS). At the same time it fetches the handler address from the vector table.</p>", analogy: "Putting a bookmark in before you answer the door." },
      { from: 2, to: 4, kind: "call", label: "LR = EXC_RETURN", title: "The handler starts", detail: "<p>The core loads PC from the vector and puts a magic value in LR, such as <code>0xFFFFFFF9</code> (\"return to thread mode, use MSP\"). On the Cortex-M3 this whole entry takes 12 cycles with zero-wait-state memory (ARM DDI 0337).</p>" },
      { from: 4, to: 4, label: "clear the cause", title: "The handler does its work", detail: "<p>An ordinary C function. It must clear the cause (here: read <code>DR</code>, which clears <code>RXNE</code>); otherwise the interrupt fires again immediately after returning.</p>" },
      { from: 4, to: 2, kind: "ret", label: "bx lr (EXC_RETURN)", title: "Return", detail: "<p>The compiler's normal <code>bx lr</code> jumps to the EXC_RETURN value. The core recognises it and starts the return sequence instead of a jump.</p>" },
      { from: 3, to: 2, kind: "ret", label: "pop 8 words", title: "Unstacking", detail: "<p>The 8 registers come back and <code>main()</code> continues exactly where it was. If another interrupt is pending at this moment, the core skips the pop and push and goes straight to the next handler: <b>tail-chaining</b>, 6 cycles.</p>" },
    ],
  });

  SequenceDiagram($("#seq-preempt"), {
    ariaLabel: "A higher-priority interrupt preempts a lower-priority handler",
    laneW: 190,
    lanes: [
      { title: "main()", sub: "thread mode", tone: "asw" },
      { title: "EXTI0 handler", sub: "priority 5", tone: "mcal" },
      { title: "USART1 handler", sub: "priority 2", tone: "svc" },
    ],
    steps: [
      { from: 0, to: 1, kind: "irq", label: "button edge", title: "EXTI0 interrupts main()", detail: "<p>Priority 5 is higher than thread code, so the EXTI0 handler starts.</p>" },
      { from: 1, to: 2, kind: "irq", label: "byte received (2 < 5)", title: "USART1 preempts EXTI0", detail: "<p>Priority 2 is numerically lower, so it is more urgent: the core stacks EXTI0's state and runs the USART1 handler at once. This is <b>nesting</b>.</p>" },
      { from: 2, to: 1, kind: "ret", label: "return", title: "Back to EXTI0", detail: "<p>The EXTI0 handler continues where it was interrupted.</p>" },
      { from: 1, to: 0, kind: "ret", label: "return", title: "Back to main()", detail: "<p>Had both been pending at the same time instead, the USART1 handler would have run first and EXTI0 would have tail-chained after it.</p>" },
    ],
  });

  SequenceDiagram($("#seq-exti"), {
    ariaLabel: "From a pin edge to the EXTI0 interrupt handler",
    laneW: 150,
    lanes: [
      { title: "PA0 pin", sub: "button to GND", tone: "hw" },
      { title: "AFIO", sub: "EXTICR1", tone: "hw" },
      { title: "EXTI", sub: "line 0", tone: "hw" },
      { title: "NVIC", sub: "IRQ 6", tone: "hw" },
      { title: "EXTI0_IRQHandler", sub: "example 01", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "bus", label: "level falls", title: "The button pulls PA0 low", detail: "<p>The input buffer sees the falling edge, regardless of how the pin is configured as input.</p>" },
      { from: 1, to: 2, kind: "bus", label: "EXTI0 ← PA0", title: "AFIO picks the port", detail: "<p><code>AFIO_EXTICR1.EXTI0 = 0000</code> connects port A's pin 0 to EXTI line 0.</p>" },
      { from: 2, to: 2, label: "FTSR0 = 1 → PR0 = 1", title: "EXTI detects the edge", detail: "<p>Falling-edge trigger enabled, so the pending bit <code>PR0</code> is set. With <code>IMR0</code> = 1 the line requests an interrupt.</p>" },
      { from: 2, to: 3, kind: "irq", label: "IRQ 6", title: "The NVIC sees IRQ 6 pending", detail: "<p>If enabled and of sufficient priority, the core enters the handler.</p>" },
      { from: 3, to: 4, kind: "call", label: "vector 16 + 6", title: "Handler runs", detail: "<p>It writes 1 to <code>EXTI-&gt;PR</code> bit 0 to clear the pending flag, then records the event for <code>main()</code>.</p>" },
    ],
  });

  explore("#ex-exti", "src-01-exti", {
    4: ["Route PA0 to line 0", "Clear the 4-bit field for line 0, then select port A. AFIO's clock was enabled in <code>button_init()</code>."],
    5: ["Falling edge", "Pressing the button pulls the pin from 3.3 V (pull-up) to GND."],
    6: ["Priority, then enable", "Set the priority before enabling, so the IRQ never runs at the default priority 0."],
    7: ["Clear the pending bit first", "<code>PR</code> is cleared by writing 1. If the handler forgot this, the NVIC would see the line still pending and re-enter the handler forever."],
    8: ["Keep handlers short", "Set a flag and leave. The 20 ms of debouncing happens in <code>main()</code>, where waiting doesn't block other interrupts."],
  });
  Register($("#reg-exticr"), { reg: "AFIO_EXTICR1", value: 0x00000000 });
  explore("#ex-tick", "src-bsp-tick", {
    1: ["volatile", "Written by the handler, read by everyone else."],
    2: ["One increment per millisecond", "The only work in the handler. Everything else derives from this counter."],
    3: ["SysTick_Config()", "CMSIS: loads <code>LOAD = ticks − 1</code>, sets SysTick to the lowest priority, clears the counter and enables counter + interrupt with the processor clock as source."],
    4: ["Atomic read", "A 32-bit aligned load is a single access, so <code>main()</code> can never see half of an update. A 64-bit counter would need a critical section."],
  });
  Register($("#reg-systick"), { reg: "SysTick_CTRL", value: 0x00000007 });
  explore("#ex-ring", "src-04-ring", {
    2: ["Count without locks", "Both indices only grow. Their difference is the fill level, correct even after they wrap around at 2<sup>32</sup>."],
    3: ["Mask, don't divide", "The buffer size is a power of two, so <code>index &amp; (SIZE − 1)</code> is the slot."],
    4: ["Publish after writing", "The ISR stores the byte first and moves <code>head</code> second. <code>main()</code> never sees a slot before its data is there."],
    5: ["Free after reading", "<code>main()</code> reads the byte, then moves <code>tail</code>, handing the slot back to the ISR."],
  });
  explore("#ex-write", "src-04-write", {
    6: ["Bounded wait", "If the TX buffer is full, wait for the ISR to drain it, but never forever."],
    7: ["Critical section", "<code>__get_PRIMASK()</code> saves the current state, <code>__disable_irq()</code> masks interrupts for the three instructions of the read-modify-write, and <code>__set_PRIMASK()</code> restores whatever it was before."],
  });
  explore("#ex-run", "src-02-run", {
    1: ["Due?", "Compare with a signed difference, so the test still works when <code>millis()</code> wraps after about 49 days."],
    2: ["Overrun", "If a whole period was missed (a task ran too long), count it and resynchronise rather than running the task several times in a burst."],
    3: ["Fixed rate", "Add the period to the old deadline, not to \"now\": a task that is late once does not shift every later run."],
    4: ["Run to completion", "The task returns before the next one starts. A task that blocks blocks everything."],
  });
  Checklist($("#ck-irq"), [
    "You can name the 8 registers the core stacks and explain why handlers need no assembly.",
    "You set an explicit priority for every interrupt you enable, before enabling it.",
    "Example 01's handler clears <code>EXTI-&gt;PR</code> first; you know what happens if it doesn't.",
    "You can spot the race in <code>USART1-&gt;CR1 |= USART_CR1_TXEIE;</code> and fix it.",
    "Example 02 prints <code>overruns=0</code>, and you can make it overrun by adding a slow loop to a task.",
  ], { key: "interrupts" });
})();
