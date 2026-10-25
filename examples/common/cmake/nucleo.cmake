# SPDX-License-Identifier: MIT
# Shared build rules for every NUCLEO-G474RE example (PLAN.md §2).
#
#   nucleo_add_executable(<name>
#       SOURCES a.c b.c
#       [LINKER_SCRIPT path]        default: examples/common/ld/stm32g474re.ld
#       [OWN_STARTUP]               the example brings its own startup + system code (example 00)
#       [NO_BSP]                    do not link the shared BSP library
#       [STARTFILES]                keep the C runtime start files (ST's assembly startup calls __libc_init_array)
#       [INCLUDES dirs] [DEFINES defs] [LIBS libs])
#
# Produces <name>.elf/.hex/.bin/.map, prints the size, and adds the targets
# flash-<name> (OpenOCD + the NUCLEO's on-board ST-LINK).
include_guard(GLOBAL)

get_filename_component(MCU_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../.." ABSOLUTE)
set(MCU_COMMON "${MCU_ROOT}/examples/common")

# [region:flags]
set(MCU_CPU_FLAGS -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard)   # «5»
set(MCU_C_FLAGS
  ${MCU_CPU_FLAGS} -std=c11 -ffunction-sections -fdata-sections -fno-common -ffreestanding
  -Wall -Wextra -Werror -Wshadow -Wundef -Wstrict-prototypes -Wmissing-prototypes -Wconversion -g3)   # «6»
# [endregion]

# CMSIS: core + device headers, used as SYSTEM includes so vendor headers never trip -Werror.
if(NOT TARGET nucleo_cmsis)
  add_library(nucleo_cmsis INTERFACE)
  target_include_directories(nucleo_cmsis SYSTEM INTERFACE
    "${MCU_ROOT}/third_party/cmsis_core/Include"
    "${MCU_ROOT}/third_party/cmsis_device_g4/Include")
  target_compile_definitions(nucleo_cmsis INTERFACE STM32G474xx)

  # Shared startup (vector table + Reset_Handler) and system file: an OBJECT library so the
  # vector table is never dropped by the linker.
  add_library(nucleo_startup OBJECT
    "${MCU_COMMON}/startup/startup_stm32g474.c"
    "${MCU_COMMON}/startup/system_stm32g474.c")
  target_compile_options(nucleo_startup PRIVATE ${MCU_C_FLAGS})
  target_link_libraries(nucleo_startup PUBLIC nucleo_cmsis)

  # Shared board support: board pins, GPIO helpers, clocks, SysTick, LED, UART log.
  file(GLOB _bsp_sources "${MCU_COMMON}/bsp/*.c")
  add_library(nucleo_bsp STATIC ${_bsp_sources})
  target_include_directories(nucleo_bsp PUBLIC "${MCU_COMMON}/bsp")
  target_compile_options(nucleo_bsp PRIVATE ${MCU_C_FLAGS})
  target_link_libraries(nucleo_bsp PUBLIC nucleo_cmsis)
endif()

find_program(OPENOCD openocd)

function(nucleo_add_executable name)
  cmake_parse_arguments(BP "OWN_STARTUP;NO_BSP;STARTFILES" "LINKER_SCRIPT" "SOURCES;INCLUDES;DEFINES;LIBS" ${ARGN})
  if(NOT BP_LINKER_SCRIPT)
    set(BP_LINKER_SCRIPT "${MCU_COMMON}/ld/stm32g474re.ld")
  endif()
  add_executable(${name} ${BP_SOURCES})
  set_target_properties(${name} PROPERTIES SUFFIX ".elf" LINK_DEPENDS "${BP_LINKER_SCRIPT};${MCU_COMMON}/ld/stm32g474_sections.ld")
  target_compile_options(${name} PRIVATE ${MCU_C_FLAGS})
  target_include_directories(${name} PRIVATE ${BP_INCLUDES})
  target_compile_definitions(${name} PRIVATE ${BP_DEFINES})
  target_link_libraries(${name} PRIVATE nucleo_cmsis ${BP_LIBS})
  if(NOT BP_OWN_STARTUP)
    target_link_libraries(${name} PRIVATE nucleo_startup)
  endif()
  if(NOT BP_NO_BSP)
    target_link_libraries(${name} PRIVATE nucleo_bsp)
  endif()
  if(NOT BP_STARTFILES)
    target_link_options(${name} PRIVATE -nostartfiles)
  endif()
  # [region:link]
  target_link_options(${name} PRIVATE ${MCU_CPU_FLAGS} -L "${MCU_COMMON}/ld"
    -T "${BP_LINKER_SCRIPT}" --specs=nano.specs --specs=nosys.specs                # «7»
    -Wl,--gc-sections -Wl,-Map=$<TARGET_FILE_DIR:${name}>/${name}.map -Wl,--print-memory-usage)   # «8»
  add_custom_command(TARGET ${name} POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O ihex $<TARGET_FILE:${name}> $<TARGET_FILE_DIR:${name}>/${name}.hex   # «9»
    COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:${name}> $<TARGET_FILE_DIR:${name}>/${name}.bin
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:${name}>
    VERBATIM)
  if(OPENOCD)
    add_custom_target(flash-${name}                                                  # «10»
      COMMAND ${OPENOCD} -f "${MCU_COMMON}/openocd/nucleo-g474re.cfg"
              -c "program $<TARGET_FILE:${name}> verify reset exit"
      DEPENDS ${name} USES_TERMINAL VERBATIM)
  endif()
  # [endregion]
endfunction()

# nucleo_freertos(<target> CONFIG_DIR <dir>)
# Compiles the vendored FreeRTOS kernel (third_party/freertos_kernel, Cortex-M4F port, static
# allocation only: no heap_x.c) with the FreeRTOSConfig.h found in <dir>, and links it into
# <target>. Vendor code is built without our warning flags; its headers are SYSTEM includes.
function(nucleo_freertos target)
  cmake_parse_arguments(FR "" "CONFIG_DIR" "" ${ARGN})
  set(K "${MCU_ROOT}/third_party/freertos_kernel")
  add_library(${target}_freertos STATIC
    "${K}/tasks.c" "${K}/queue.c" "${K}/list.c" "${K}/timers.c" "${K}/event_groups.c"
    "${K}/portable/GCC/ARM_CM4F/port.c")
  target_include_directories(${target}_freertos SYSTEM PUBLIC
    "${K}/include" "${K}/portable/GCC/ARM_CM4F" "${FR_CONFIG_DIR}")
  target_compile_options(${target}_freertos PRIVATE ${MCU_CPU_FLAGS} -std=c11 -ffunction-sections -fdata-sections -g3 -w)
  target_link_libraries(${target}_freertos PUBLIC nucleo_cmsis)
  target_link_libraries(${target} PRIVATE ${target}_freertos)
endfunction()
