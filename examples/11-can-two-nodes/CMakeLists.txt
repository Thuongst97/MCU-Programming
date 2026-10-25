# SPDX-License-Identifier: MIT
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../common/cmake/arm-none-eabi.cmake")
endif()
project(ex11 LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../common/cmake/bluepill.cmake")
bluepill_add_executable(11-can-node-a
  SOURCES src/main.c src/can.c
  INCLUDES src
  DEFINES NODE_A
  RENODE_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/renode/11.resc")
bluepill_add_executable(11-can-node-b
  SOURCES src/main.c src/can.c
  INCLUDES src
  DEFINES NODE_B)
