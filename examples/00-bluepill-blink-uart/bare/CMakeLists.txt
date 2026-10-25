# SPDX-License-Identifier: MIT
# Example 00, bare-metal path: own startup, system file and linker script, no shared BSP,
# so the whole program is in this folder.
#   Standalone:  cmake -S . -B build -G Ninja -DCMAKE_TOOLCHAIN_FILE=../../common/cmake/arm-none-eabi.cmake
#                cmake --build build
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../../common/cmake/arm-none-eabi.cmake")
endif()
project(ex00_bare LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../../common/cmake/bluepill.cmake")

bluepill_add_executable(00-bluepill-blink-uart
  SOURCES src/main.c src/startup.c src/system.c
  LINKER_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/ld/stm32f103c8_64k.ld"
  OWN_STARTUP NO_BSP
  RENODE_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/renode/00.resc")
