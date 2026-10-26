# TurnLight acceptance

## On the host (CI, every push)
`logic/test/` runs the state machine, lamp monitor and message packing on the PC. It covers the
logic of TL-REQ-001 to 007. There is no simulator for the STM32G4, so everything else is checked
on hardware, with the same procedure for stage 1, 2 and 3.

## On hardware (manual, before marking a stage `tested_on`)

| Req | Procedure | Pass |
|---|---|---|
| TL-REQ-002 | Logic analyser on PA6 with the left stalk held for 10 s. | 1.47–1.53 Hz, duty 40–60 % |
| TL-REQ-005 | Turn the pot to the GND end while the right side flashes. | Right flashes at about 3 Hz within one period; `dem: TL_E_LAMP_OUT_R failed` on the log; cluster shows LAMP R OUT |
| TL-REQ-006 | Second board with the cluster firmware and OLED. | Telltales follow the lamps within 100 ms |
| TL-REQ-001/003 | Press the left stalk, then the hazard button. | Left lamp flashes; hazard flashes both in phase |
| TL-REQ-004 | Tap the right stalk for less than 0.5 s. | Exactly 3 flashes |
| TL-REQ-007 | Hold B1 (USER) on the cluster node. | `dem: TL_E_CLUSTER_LOST failed` after about 0.5 s; lamps keep flashing |
| TL-REQ-008 | Scope on PA6 at turn-on. | Duty rises from 0 to 100 % in about 20 ms (4 steps of 5 ms) |
| TL-REQ-009 | In the debugger, halt one task/job with a breakpoint while `DBG_IWDG_STOP` is cleared, or comment out its check-in. | Reset within about 100 ms; next boot reports `independent watchdog` |
| TL-REQ-010 | Press B2 (RESET, the black button). | Boot line reports `reset pin` |

Record each run in `docs/verification.md` with the board revision used.
