# SPDX-License-Identifier: MIT
# GDB helpers for Cortex-M4 faults (PM0214 "Fault handling"; ARM DDI 0403 B1.5.6). With an FPU frame
# (EXC_RETURN bit 4 = 0) the first eight stacked words are the same, so $frame[0..7] still apply.
# Load with:  (gdb) source examples/08-iwdg-hardfault/debug/fault.gdb
# then, stopped at the first instruction of HardFault_Handler (LR still holds EXC_RETURN):  (gdb) fault

# [region:fault]
define fault
  printf "CFSR  0x%08x\n", *(unsigned int *)0xE000ED28
  printf "HFSR  0x%08x\n", *(unsigned int *)0xE000ED2C
  printf "MMFAR 0x%08x\n", *(unsigned int *)0xE000ED34
  printf "BFAR  0x%08x\n", *(unsigned int *)0xE000ED38
  # EXC_RETURN bit 2: frame on PSP (task) or MSP (main/handler)                 # «1»
  if ($lr & 4)
    set $frame = (unsigned int *)$psp
  else
    set $frame = (unsigned int *)$msp
  end
  printf "stacked r0 0x%08x  r1 0x%08x  r2 0x%08x  r3 0x%08x\n", $frame[0], $frame[1], $frame[2], $frame[3]
  printf "stacked r12 0x%08x  lr 0x%08x  pc 0x%08x  xpsr 0x%08x\n", $frame[4], $frame[5], $frame[6], $frame[7]
  info symbol $frame[6]                                                          # «2»
  list *$frame[6]
end
document fault
Print the fault status registers and the stacked exception frame, then show the faulting line.
end
# [endregion]

# [region:watch]
# Stop when anything writes the fault record (a hardware watchpoint: DWT, 4 comparators)
# watch s_last_fault.magic                                                     # «3»
# Stop on the 100th call only: skip the first 99 hits of breakpoint 2
# break iwdg_feed                                                              # «4»
# ignore 2 99
# Catch every fault before the handler resets the chip
# break HardFault_Handler                                                      # «5»
# [endregion]
