# SPDX-License-Identifier: MIT
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../common/cmake/arm-none-eabi.cmake")
endif()
project(ex04 LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../common/cmake/bluepill.cmake")
bluepill_add_executable(04-uart-shell-ringbuffer
  SOURCES src/main.c src/ringbuf.c src/shell.c
  INCLUDES src
  RENODE_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/renode/04.resc")
