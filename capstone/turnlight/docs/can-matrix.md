# TurnLight CAN matrix

500 kbit/s, standard 11-bit IDs. **All IDs, signals and DTC numbers are hypothetical**, made up for
the course. Signals are unsigned, little-endian (Intel), bit positions counted from bit 0 of byte 0.

## TurnLightStatus — ID 0x3A0, DLC 4, ECU → cluster, 100 ms cycle + on change

| Signal | Start bit | Length | Values |
|---|---|---|---|
| LampLeft | 0 | 1 | 1 = lamp lit now |
| LampRight | 1 | 1 | |
| IndLeft | 2 | 1 | 1 = left indication active (also during the off phase) |
| IndRight | 3 | 1 | |
| Hazard | 4 | 1 | 1 = hazard mode |
| LampOutLeft | 5 | 1 | 1 = left lamp failed (TL-REQ-005) |
| LampOutRight | 6 | 1 | |
| ClusterLost | 7 | 1 | 1 = no ClusterAck for > 500 ms |
| ResetCause | 8 | 8 | 0 power-on, 1 reset pin, 2 software, 3 IWDG, 4 WWDG, 5 low-power, 6 unknown |
| AliveCounter | 16 | 8 | +1 per frame, wraps |
| (reserved) | 24 | 8 | always 0 |

## ClusterAck — ID 0x3A1, DLC 1, cluster → ECU, 100 ms cycle

| Signal | Start bit | Length | Values |
|---|---|---|---|
| AckAlive | 0 | 8 | the last AliveCounter the cluster received |

## Diagnostic events (stage 3, Dem)

| Event | DTC (hypothetical) |
|---|---|
| TL_E_LAMP_OUT_L | 0x930011 |
| TL_E_LAMP_OUT_R | 0x930012 |
| TL_E_CLUSTER_LOST | 0xC14087 |
