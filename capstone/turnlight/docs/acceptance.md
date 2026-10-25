# TurnLight acceptance

## In Renode (CI, every push)
`test/turnlight.robot` runs every test against the ELF of stage 1, 2 and 3, and fails if any stage
differs. It covers TL-REQ-001, 003, 004, 005, 006, 007 and 010 (power-on only).

## On hardware (manual, before marking a stage `tested_on`)

| Req | Procedure | Pass |
|---|---|---|
| TL-REQ-002 | Logic analyser on PA6 with the left stalk held for 10 s. | 1.47–1.53 Hz, duty 40–60 % |
| TL-REQ-005 | Turn the pot to the GND end while the right side flashes. | Right flashes at about 3 Hz within one period; `dem: TL_E_LAMP_OUT_R failed` on the log; cluster shows LAMP R OUT |
| TL-REQ-006 | Second board with the cluster firmware and OLED. | Telltales follow the lamps within 100 ms |
| TL-REQ-007 | Hold PA0 on the cluster node. | `dem: TL_E_CLUSTER_LOST failed` after about 0.5 s; lamps keep flashing |
| TL-REQ-008 | Scope on PA6 at turn-on. | Duty rises from 0 to 100 % in about 20 ms (4 steps of 5 ms) |
| TL-REQ-009 | In the debugger, halt one task/job with a breakpoint while `DBG_IWDG_STOP` is cleared, or comment out its check-in. | Reset within about 100 ms; next boot reports `independent watchdog` |
| TL-REQ-010 | Press the reset button. | Boot line reports `reset pin` |

Record each run in `docs/verification.md` with the board and clone chip used.
