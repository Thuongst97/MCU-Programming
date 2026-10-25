# SPDX-License-Identifier: MIT
# TurnLight stage 2: the same logic and drivers as stage 1, integrated on FreeRTOS.
set(EX "${MCU_ROOT}/examples")
set(TL "${CMAKE_CURRENT_SOURCE_DIR}/..")
nucleo_add_executable(tl-stage2-freertos
  SOURCES src/main.c
          ${TL}/logic/turnlight_sm.c ${TL}/logic/lampmon.c ${TL}/logic/tl_msg.c ${TL}/hw/tl_hw.c
          ${EX}/01-exti-button-debounce/src/debounce.c ${EX}/11-can-two-nodes/src/can.c
  INCLUDES src ${TL}/logic ${TL}/hw ${EX}/01-exti-button-debounce/src ${EX}/11-can-two-nodes/src)
nucleo_freertos(tl-stage2-freertos CONFIG_DIR "${CMAKE_CURRENT_SOURCE_DIR}/src")
