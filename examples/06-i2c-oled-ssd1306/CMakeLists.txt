# SPDX-License-Identifier: MIT
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../common/cmake/arm-none-eabi.cmake")
endif()
project(ex06 LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../common/cmake/bluepill.cmake")
bluepill_add_executable(06-i2c-oled-ssd1306
  SOURCES src/main.c src/i2c.c src/ssd1306.c src/gfx.c src/font5x7.c
  INCLUDES src
  RENODE_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/renode/06.resc")
