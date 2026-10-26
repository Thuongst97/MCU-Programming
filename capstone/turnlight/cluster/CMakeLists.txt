# SPDX-License-Identifier: MIT
set(EX "${MCU_ROOT}/examples")
set(TL "${CMAKE_CURRENT_SOURCE_DIR}/..")
nucleo_add_executable(tl-cluster
  SOURCES src/main.c ${TL}/logic/tl_msg.c ${EX}/11-can-two-nodes/src/can.c ${EX}/11-can-two-nodes/src/canfd.c
          ${EX}/06-i2c-oled-ssd1306/src/i2c.c ${EX}/06-i2c-oled-ssd1306/src/i2c_timing.c ${EX}/06-i2c-oled-ssd1306/src/ssd1306.c
          ${EX}/06-i2c-oled-ssd1306/src/gfx.c ${EX}/06-i2c-oled-ssd1306/src/font5x7.c
  INCLUDES ${TL}/logic ${EX}/11-can-two-nodes/src ${EX}/06-i2c-oled-ssd1306/src)
