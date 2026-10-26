/* SPDX-License-Identifier: MIT
   Module 23 · Code That Passes an OEM / Tier-1 Review. */
(function () {
  "use strict";
  const { $, Compare, Checklist, renderCodeExplorer, embedded } = window.MCU;

  Checklist($("#ck-review-list"), [
    "<b>Banner</b>: every file states its spec reference and whether it is generated, vendor-supplied or hand-written.",
    "<b>Naming</b>: public symbols use the module abbreviation (<code>Dio_WriteChannel</code>, <code>DIO_E_…</code>, <code>DioConf_…</code>).",
    "<b>Types</b>: BSW interfaces use platform types and <code>Std_ReturnType</code>; no home-made error codes.",
    "<b>Configuration</b>: values live in <code>&lt;Ma&gt;_Cfg.h</code> / <code>_PBcfg.c</code>, never in the driver's <code>.c</code>.",
    "<b>Memory mapping</b>: every section is bracketed by a START/STOP pair and the module's MemMap include.",
    "<b>Errors</b>: development errors go to DET under <code>&lt;MA&gt;_DEV_ERROR_DETECT</code>; production errors go to DEM.",
    "<b>Layering</b>: SWCs include only <code>Rte_&lt;Swc&gt;.h</code>; no register access above the MCAL.",
    "<b>Scheduling</b>: main functions run from tasks in a documented order, never from interrupts.",
    "<b>Robustness</b>: every hardware wait has a timeout; no dynamic memory; no recursion.",
    "<b>MISRA</b>: zero findings without a recorded deviation; every suppression names its record.",
    "<b>Tests</b>: every requirement has a test, and the tests pass on every stage (CI).",
    "<b>Honesty</b>: anything simplified says what was left out, and R4.x differences are marked.",
  ], { key: "autosar-review" });

  Compare($("#cmp-swc"), { bad: "src-r-swc-bad", good: "src-r-swc-good", rule: ["SWC through ports only", "AUTOSAR_CP_EXP_LayeredSoftwareArchitecture"],
    why: "Reading <code>GPIOB-&gt;IDR</code> ties the function to one pin of one chip and makes it impossible to test against a simulated RTE. The SWC gets the debounced stalk state through a client-server port; the RTE connects it to IoHwAb, which owns the pin." });
  Compare($("#cmp-wait"), { bad: "src-r-wait-bad", good: "src-r-wait-good", rule: ["Bounded hardware waits", "MISRA C:2012 Dir 4.1"],
    why: "If the crystal never starts, the bad version hangs before the watchdog even runs, and the ECU is dead with no diagnosis. The Mcu driver gives up after a bounded number of polls and returns an error the caller can act on (stay on HSI, report a DEM event)." });

  const REQ = {
    "TL-REQ-001": ["Stalk inputs, 20 ms debounce", ["logic/turnlight_sm.c: stalk_logic()", "stage 1/2: debounce.c (example 01)", "stage 3: IoHwAb_MainFunction (debounce), Rte_Call_StalkLeft_Get"], ["host: test_left_stalk_flashes_left_only", "hardware checklist (acceptance.md): stalk and hazard buttons"]],
    "TL-REQ-002": ["Flash rate 1.5 Hz, 50 % duty", ["logic/turnlight_sm.h: TL_PERIOD_MS, TL_ON_MS"], ["host: test_flash_rate_is_1_5_hz", "hardware checklist (acceptance.md): logic analyser on PA6"]],
    "TL-REQ-003": ["Hazard overrides, in phase", ["logic/turnlight_sm.c: tl_step() hazard branch"], ["host: test_hazard_overrides_and_is_in_phase", "hardware checklist (acceptance.md): stalk and hazard buttons"]],
    "TL-REQ-004": ["Comfort blink: tap gives 3 flashes", ["logic/turnlight_sm.c: TL_MODE_COMFORT"], ["host: test_tap_gives_exactly_three_flashes", "hardware checklist (acceptance.md): tap the right stalk"]],
    "TL-REQ-005": ["Lamp-out detection, double rate, DEM event", ["logic/lampmon.c", "stage 3: SWC LampMonitor, Dem_SetEventStatus"], ["host: test_lamp_out_judged_once_per_phase_after_settling, test_failed_lamp_flashes_twice_as_fast", "hardware checklist (acceptance.md): pot to GND"]],
    "TL-REQ-006": ["TurnLightStatus 0x3A0, 100 ms + on change", ["logic/tl_msg.c: tl_status_pack()", "stage 3: Com mixed mode, CanIf, Can"], ["host: test_status_round_trip", "hardware checklist (acceptance.md): second board with the cluster"]],
    "TL-REQ-007": ["ClusterAck supervision 500 ms", ["logic/tl_msg.c: tl_comm_step()", "stage 3: Com deadline monitoring → RTE_E_MAX_AGE_EXCEEDED"], ["host: test_cluster_lost_after_500_ms", "hardware checklist (acceptance.md): hold B1 on the cluster"]],
    "TL-REQ-008": ["PWM lamps, 20 ms soft ramp", ["hw/tl_hw.c: tl_hw_lamp_ramp()", "stage 3: IoHwAb_MainFunction_Fast"], ["hardware checklist (acceptance.md): scope on PA6"]],
    "TL-REQ-009": ["IWDG 100 ms, fed only when all checked in", ["stage 1: job_supervisor()", "stage 2: supervisor_task + event group", "stage 3: WdgM alive supervision → WdgIf → Wdg"], ["hardware checklist (acceptance.md): stall a task, watch the reset"]],
    "TL-REQ-010": ["Reset cause logged and sent", ["hw/tl_hw.c: tl_hw_reset_code()", "stage 3: Mcu_GetResetReason, Rte_Call_ResetReason_Get"], ["hardware checklist (acceptance.md): press B2 (RESET)"]],
  };
  const tr = $("#trace");
  tr.innerHTML = `<div class="calc-title"><b>Requirement → code → test</b></div>
    <div class="calc-inputs"><label for="tr-req">Requirement <select id="tr-req">${Object.keys(REQ).map((k) => `<option>${k}</option>`).join("")}</select></label></div>
    <div class="calc-out" aria-live="polite"></div>`;
  const show = () => {
    const [title, code, tests] = REQ[$("#tr-req").value];
    $(".calc-out", tr).innerHTML = `<p><b>${title}</b></p><table class="t"><tbody>
      <tr><td>Implemented in</td><td>${code.map((c) => `<code>${c}</code>`).join("<br>")}</td></tr>
      <tr><td>Verified by</td><td>${tests.map((c) => `<code>${c}</code>`).join("<br>")}</td></tr></tbody></table>`;
  };
  renderCodeExplorer($("#ex-r-lm"), { ...embedded("src-r-lm"), notes: {
    1: ["Input: the lamp commands", "What TurnLight asked for this cycle (sender-receiver)."],
    2: ["Input: the measured current", "From IoHwAb, which owns the ADC group."],
    3: ["The requirement's logic", "The same host-tested function as stages 1 and 2; TL-REQ-005 is verified there and on the hardware checklist."],
    4: ["Output to TurnLight and the bus", "TurnLight doubles the flash rate; the cluster shows the fault."],
    5: ["Output to diagnostics", "The DTC a workshop will read (module 22)."],
  } });
  $("#tr-req").addEventListener("change", show);
  show();
})();
