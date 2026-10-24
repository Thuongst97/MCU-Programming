# SPDX-License-Identifier: MIT
# Example 00, LL path (Appendix D): ST's header-only LL functions from ../hal/Drivers, with the
# course's C startup and 64 KB linker script.
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../../common/cmake/arm-none-eabi.cmake")
endif()
project(ex00_ll LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../../common/cmake/bluepill.cmake")

bluepill_add_executable(00-bluepill-blink-uart-ll
  SOURCES src/main.c
  NO_BSP)
# LL headers are vendor code: SYSTEM include so their internals never trip our -Werror.
target_include_directories(00-bluepill-blink-uart-ll SYSTEM PRIVATE
  "${CMAKE_CURRENT_SOURCE_DIR}/../hal/Drivers/STM32F1xx_HAL_Driver/Inc")
