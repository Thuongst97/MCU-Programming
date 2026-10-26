# TurnLight requirements

Project requirements written for the course (not from a real OEM). Flash timing follows the
direction-indicator flashing frequency range of UN ECE Regulation No. 48 (90 ± 30 flashes per minute);
the project tightens it to 1.5 Hz ± 2 %.

| ID | Requirement | Verified by |
|---|---|---|
| TL-REQ-001 | Left/right stalk inputs (buttons PB12/PB13, active-low, debounced 20 ms) request the turn indicator of that side. | host; hardware |
| TL-REQ-002 | Flash frequency 1.5 Hz ± 2 %, duty 50 % ± 10 %. | host; hardware (logic analyser) |
| TL-REQ-003 | The hazard button (PB14) toggles hazard mode, which overrides turn requests; both sides flash in phase. | host; hardware |
| TL-REQ-004 | Comfort blink: a stalk tap shorter than 500 ms produces exactly 3 flash cycles. | host; hardware |
| TL-REQ-005 | Lamp-out detection: lamp current (pot on PA1) below threshold while the lamp is on → double flash frequency on that side and DEM event `TL_E_LAMP_OUT_<side>`. | host; hardware |
| TL-REQ-006 | The ECU sends `TurnLightStatus` (ID 0x3A0, hypothetical) every 100 ms and on change; the cluster node shows telltales. | host; hardware (two boards) |
| TL-REQ-007 | The cluster node sends `ClusterAck` (ID 0x3A1, hypothetical). Missing for more than 500 ms → DEM event `TL_E_CLUSTER_LOST`; lamps keep working. | host; hardware |
| TL-REQ-008 | Lamps are PWM-dimmed outputs (TIM3) with a soft on/off ramp of 20 ms. | hardware (scope) |
| TL-REQ-009 | IWDG timeout 100 ms; the watchdog is fed only after all supervised activities have checked in. | hardware |
| TL-REQ-010 | After any reset, the reason is logged and reported in `TurnLightStatus.ResetCause`. | hardware |
