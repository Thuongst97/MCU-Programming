# SPDX-License-Identifier: MIT
# TurnLight stage 1: bare metal, built from the course's own example drivers.
set(EX "${MCU_ROOT}/examples")
set(TL "${CMAKE_CURRENT_SOURCE_DIR}/..")
bluepill_add_executable(tl-stage1-baremetal
  SOURCES src/main.c
          ${TL}/logic/turnlight_sm.c ${TL}/logic/lampmon.c ${TL}/logic/tl_msg.c ${TL}/hw/tl_hw.c
          ${EX}/01-exti-button-debounce/src/debounce.c ${EX}/02-systick-scheduler/src/scheduler.c
          ${EX}/11-can-two-nodes/src/can.c
  INCLUDES ${TL}/logic ${TL}/hw ${EX}/01-exti-button-debounce/src ${EX}/02-systick-scheduler/src
           ${EX}/11-can-two-nodes/src)
