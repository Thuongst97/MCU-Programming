# SPDX-License-Identifier: MIT
# Example 12 builds two images: the bootloader (0x08000000, 16 KB slot) and an application
# linked for 0x08004000. Flash both with OpenOCD, or the application alone through the
# bootloader with host/upload.py.
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../common/cmake/arm-none-eabi.cmake")
endif()
project(ex12 LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../common/cmake/bluepill.cmake")
bluepill_add_executable(12-bootloader
  SOURCES src/bootloader.c src/proto.c src/flash.c
  INCLUDES src
  LINKER_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/ld/bootloader.ld"
  RENODE_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/renode/12.resc")
bluepill_add_executable(12-application
  SOURCES src/application.c
  INCLUDES src
  LINKER_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/ld/application.ld")
