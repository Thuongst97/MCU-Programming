# SPDX-License-Identifier: MIT
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../common/cmake/arm-none-eabi.cmake")
endif()
project(ex07 LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../common/cmake/nucleo.cmake")
nucleo_add_executable(07-spi-flash-w25q
  SOURCES src/main.c src/spi.c src/w25q.c src/jedec.c
  INCLUDES src)
