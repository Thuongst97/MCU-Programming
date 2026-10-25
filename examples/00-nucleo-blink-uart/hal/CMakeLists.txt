# SPDX-License-Identifier: MIT
# Example 00, HAL path: ST's assembly startup + ST's system_stm32g4xx.c (as CubeMX generates),
# the HAL driver subset in Drivers/, and the course's linker script.
cmake_minimum_required(VERSION 3.25)
if(NOT CMAKE_TOOLCHAIN_FILE AND NOT CMAKE_CROSSCOMPILING)
  set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/../../common/cmake/arm-none-eabi.cmake")
endif()
project(ex00_hal LANGUAGES C ASM)
include("${CMAKE_CURRENT_LIST_DIR}/../../common/cmake/nucleo.cmake")

set(HAL "${CMAKE_CURRENT_SOURCE_DIR}/Drivers/STM32G4xx_HAL_Driver")
file(GLOB hal_sources "${HAL}/Src/*.c")
# Vendor code: compiled with its own, relaxed warning set (our -Werror applies to Core/ only).
add_library(ex00_hal_drivers STATIC ${hal_sources})
target_include_directories(ex00_hal_drivers SYSTEM PUBLIC "${HAL}/Inc" "${CMAKE_CURRENT_SOURCE_DIR}/Core/Inc")
target_compile_definitions(ex00_hal_drivers PUBLIC USE_HAL_DRIVER)
target_compile_options(ex00_hal_drivers PRIVATE ${MCU_CPU_FLAGS} -std=c11 -ffunction-sections -fdata-sections -w)
target_link_libraries(ex00_hal_drivers PUBLIC nucleo_cmsis)

set(DEV "${MCU_ROOT}/third_party/cmsis_device_g4/Source/Templates")
set_source_files_properties("${DEV}/gcc/startup_stm32g474xx.s" PROPERTIES COMPILE_OPTIONS "-x;assembler-with-cpp")
add_library(ex00_hal_system OBJECT "${DEV}/gcc/startup_stm32g474xx.s" "${DEV}/system_stm32g4xx.c")
target_compile_options(ex00_hal_system PRIVATE ${MCU_CPU_FLAGS} -w)
target_link_libraries(ex00_hal_system PUBLIC nucleo_cmsis)

nucleo_add_executable(00-nucleo-blink-uart-hal
  SOURCES Core/Src/main.c Core/Src/stm32g4xx_it.c
  OWN_STARTUP NO_BSP STARTFILES
  LIBS ex00_hal_system ex00_hal_drivers)
