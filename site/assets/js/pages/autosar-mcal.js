/* SPDX-License-Identifier: MIT
   Module 20 · Writing MCAL Drivers the AUTOSAR Way. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Compare, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  explore("#ex-port", "src-ar-port", {
    1: ["NULL configuration", "A development error: reported to DET, then the function returns without touching the hardware."],
    2: ["Refuse a lock-out", "A configuration that would disable SWD is rejected. This check is our addition: the F1 lets software lock out its own debugger."],
    3: ["Remaps from the table", "<code>AFIO_MAPR</code> comes from the configuration: here the bxCAN remap to PB8/PB9."],
    4: ["One entry per pin", "Each entry is the F1's 4-bit CNF/MODE value plus an initial level."],
    5: ["Only the pointer is kept", "The driver stores the address of the <code>const</code> table; it never copies or changes it."],
  });
  explore("#ex-cmp", "src-ar-cmp", {
    1: ["FUNC(rettype, memclass)", "Declares a function's return type and the memory class of its code. Expands to just <code>rettype</code> here."],
    2: ["P2VAR(type, memclass, ptrclass)", "A pointer to variable data: <code>memclass</code> is where the pointer lives, <code>ptrclass</code> where it points."],
    3: ["P2CONST", "The same for pointers to constant data, typical for configuration pointers."],
  });
  explore("#ex-det", "src-ar-det", {
    1: ["Four numbers say it all", "Module ID (from the BSW module list), instance, API (service ID) and error code. Enough to find the call site."],
    2: ["Callout", "A project hook: the capstone prints the error on the UART; others halt for the debugger or log to RAM."],
    3: ["Never fails the caller", "The caller already handles the error by returning; DET only records it."],
  });
  const NDIO = {
    1: ["Validate in development builds", "An unknown channel is reported to DET; with DET switched off the check disappears."],
    2: ["A defined result", "Even on error the function returns a valid level."],
    3: ["Atomic write", "BSRR sets (low half) or resets (high half) a pin in one store. No read-modify-write, so no race with an interrupt."],
  };
  explore("#ex-dio", "src-ar-dio", NDIO);
  explore("#ex-pwm", "src-ar-pwm", {
    3: ["The SWS scale", "<code>0x8000</code> is 100 %; larger values are clamped."],
    4: ["To timer counts", "Scaled to the configured period; the new value takes effect at the next timer update (preload), so no glitch."],
  });
  explore("#ex-adc", "src-ar-adc", {
    1: ["Buffer first", "The caller must have set up a result buffer with <code>Adc_SetupResultBuffer</code>."],
    2: ["One group at a time", "The F1's single regular sequence is busy; a second start is a development error."],
    3: ["Polling advances the group", "Each status query collects a finished channel and starts the next one."],
    4: ["Completed", "A one-shot group reports stream-completed; <code>Adc_ReadGroup</code> copies the results and returns it to idle."],
  });
  const NCAN = {
    1: ["CAN_BUSY", "All three mailboxes are occupied. Not an error: the caller (CanIf) may retry."],
    2: ["Request transmission", "The 11-bit ID into <code>TIxR</code> together with <code>TXRQ</code>: from here the hardware arbitrates on the bus."],
    3: ["Transmit confirmation", "Only for frames the bus acknowledged (<code>TXOK</code>); CanIf passes it up to Com."],
    4: ["Receive indication", "Hardware object, ID and data go to CanIf, in task context."],
  };
  explore("#ex-canw", "src-ar-canw", NCAN);
  explore("#ex-canm", "src-ar-canm", NCAN);
  explore("#ex-wdg", "src-ar-wdg", {
    1: ["The only place that kicks", "Called by WdgM through WdgIf, and only while every supervised entity is alive."],
  });

  Compare($("#cmp-ret"), { bad: "src-g-ret-bad", good: "src-g-ret-good", rule: ["Std_ReturnType", "AUTOSAR_CP_SWS_StandardTypes"],
    why: "The home-made version invents its own error numbers and mixes argument checks into normal results. The MCAL version checks in development builds only, reports through DET, uses the SWS duty scale and AUTOSAR types, and never writes a register when an argument is invalid." });
  Compare($("#cmp-det"), { bad: "src-g-det-bad", good: "src-g-det-good", rule: ["DET only in development", "<MA>_DEV_ERROR_DETECT"],
    why: "Unconditional DET calls cost time and flash in production, and the missing NULL check dereferences a bad pointer anyway. The Port driver checks first, reports only when DET is enabled, and returns without touching hardware." });
  Compare($("#cmp-dio"), { bad: "src-g-dio-bad", good: "src-g-dio-good", rule: ["Dio_WriteChannel", "GPIOx_BSRR"],
    why: "<code>ODR |=</code> is a read-modify-write: an interrupt that writes the same port between the read and the write loses its change. The Dio driver uses <code>BSRR</code>, which changes one pin in a single store, and AUTOSAR types and names." });

  Checklist($("#ck-mcal"), [
    "You can list the files of a module and say which ones are generated per ECU.",
    "You can expand <code>FUNC(Std_ReturnType, DIO_CODE)</code> and <code>P2CONST(Port_ConfigType, AUTOMATIC, PORT_APPL_CONST)</code> by hand.",
    "You can explain why <code>Dio_WriteChannel</code> needs no critical section on the F1.",
    "You know when a problem goes to DET and when to DEM.",
    "<code>python3 tools/check-autosar.py</code> passes, and you know what three of its checks look for.",
  ], { key: "autosar-mcal" });
})();
