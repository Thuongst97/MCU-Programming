# SPDX-License-Identifier: MIT
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../common/cmake/arm-none-eabi.cmake")
endif()
project(ex13 LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../common/cmake/bluepill.cmake")
bluepill_add_executable(13-lin-master SOURCES src/main.c src/lin.c INCLUDES src DEFINES NODE_MASTER)
bluepill_add_executable(13-lin-slave SOURCES src/main.c src/lin.c INCLUDES src DEFINES NODE_SLAVE)
