# SPDX-License-Identifier: MIT
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../common/cmake/arm-none-eabi.cmake")
endif()
project(ex01 LANGUAGES C)
include("${CMAKE_CURRENT_LIST_DIR}/../common/cmake/nucleo.cmake")
nucleo_add_executable(01-exti-button-debounce
  SOURCES src/main.c src/debounce.c
  INCLUDES src)
