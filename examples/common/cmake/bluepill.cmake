# SPDX-License-Identifier: MIT
# Shared build rules for every Blue Pill example (PLAN.md §2).
#
#   bluepill_add_executable(<name>
#       SOURCES a.c b.c
#       [LINKER_SCRIPT path]        default: examples/common/ld/stm32f103c8_64k.ld
#       [OWN_STARTUP]               the example brings its own startup + system code (example 00)
#       [NO_BSP]                    do not link the shared BSP library
#       [STARTFILES]                keep the C runtime start files (ST's assembly startup calls __libc_init_array)
#       [RENODE_SCRIPT path.resc]   adds target renode-<name>
#       [INCLUDES dirs] [DEFINES defs] [LIBS libs])
#
# Produces <name>.elf/.hex/.bin/.map, prints the size, and adds the targets
# flash-<name> (OpenOCD + ST-Link) and renode-<name> (Renode GUI).
include_guard(GLOBAL)

get_filename_component(MCU_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../.." ABSOLUTE)
set(MCU_COMMON "${MCU_ROOT}/examples/common")

set(MCU_CPU_FLAGS -mcpu=cortex-m3 -mthumb)
set(MCU_C_FLAGS
  ${MCU_CPU_FLAGS} -std=c11 -ffunction-sections -fdata-sections -fno-common -ffreestanding
  -Wall -Wextra -Werror -Wshadow -Wundef -Wstrict-prototypes -Wmissing-prototypes -Wconversion -g3)

# CMSIS: core + device headers, used as SYSTEM includes so vendor headers never trip -Werror.
if(NOT TARGET bluepill_cmsis)
  add_library(bluepill_cmsis INTERFACE)
  target_include_directories(bluepill_cmsis SYSTEM INTERFACE
    "${MCU_ROOT}/third_party/cmsis_core/Include"
    "${MCU_ROOT}/third_party/cmsis_device_f1/Include")
  target_compile_definitions(bluepill_cmsis INTERFACE STM32F103xB)

  # Shared startup (vector table + Reset_Handler) and system file: an OBJECT library so the
  # vector table is never dropped by the linker.
  add_library(bluepill_startup OBJECT
    "${MCU_COMMON}/startup/startup_stm32f103.c"
    "${MCU_COMMON}/startup/system_stm32f103.c")
  target_compile_options(bluepill_startup PRIVATE ${MCU_C_FLAGS})
  target_link_libraries(bluepill_startup PUBLIC bluepill_cmsis)

  # Shared board support: clocks, SysTick, LED, UART log.
  file(GLOB _bsp_sources "${MCU_COMMON}/bsp/*.c")
  add_library(bluepill_bsp STATIC ${_bsp_sources})
  target_include_directories(bluepill_bsp PUBLIC "${MCU_COMMON}/bsp")
  target_compile_options(bluepill_bsp PRIVATE ${MCU_C_FLAGS})
  target_link_libraries(bluepill_bsp PUBLIC bluepill_cmsis)
endif()

find_program(OPENOCD openocd)
find_program(RENODE renode)

function(bluepill_add_executable name)
  cmake_parse_arguments(BP "OWN_STARTUP;NO_BSP;STARTFILES" "LINKER_SCRIPT;RENODE_SCRIPT" "SOURCES;INCLUDES;DEFINES;LIBS" ${ARGN})
  if(NOT BP_LINKER_SCRIPT)
    set(BP_LINKER_SCRIPT "${MCU_COMMON}/ld/stm32f103c8_64k.ld")
  endif()
  add_executable(${name} ${BP_SOURCES})
  set_target_properties(${name} PROPERTIES SUFFIX ".elf" LINK_DEPENDS "${BP_LINKER_SCRIPT}")
  target_compile_options(${name} PRIVATE ${MCU_C_FLAGS})
  target_include_directories(${name} PRIVATE ${BP_INCLUDES})
  target_compile_definitions(${name} PRIVATE ${BP_DEFINES})
  target_link_libraries(${name} PRIVATE bluepill_cmsis ${BP_LIBS})
  if(NOT BP_OWN_STARTUP)
    target_link_libraries(${name} PRIVATE bluepill_startup)
  endif()
  if(NOT BP_NO_BSP)
    target_link_libraries(${name} PRIVATE bluepill_bsp)
  endif()
  if(NOT BP_STARTFILES)
    target_link_options(${name} PRIVATE -nostartfiles)
  endif()
  target_link_options(${name} PRIVATE ${MCU_CPU_FLAGS}
    -T "${BP_LINKER_SCRIPT}" --specs=nano.specs --specs=nosys.specs
    -Wl,--gc-sections -Wl,-Map=$<TARGET_FILE_DIR:${name}>/${name}.map -Wl,--print-memory-usage)
  add_custom_command(TARGET ${name} POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O ihex $<TARGET_FILE:${name}> $<TARGET_FILE_DIR:${name}>/${name}.hex
    COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:${name}> $<TARGET_FILE_DIR:${name}>/${name}.bin
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:${name}>
    VERBATIM)
  if(OPENOCD)
    add_custom_target(flash-${name}
      COMMAND ${OPENOCD} -f "${MCU_COMMON}/openocd/bluepill.cfg"
              -c "program $<TARGET_FILE:${name}> verify reset exit"
      DEPENDS ${name} USES_TERMINAL VERBATIM)
  endif()
  if(RENODE AND BP_RENODE_SCRIPT)
    add_custom_target(renode-${name}
      COMMAND ${RENODE} -e "$$bin=@$<TARGET_FILE:${name}>; include @${BP_RENODE_SCRIPT}"
      DEPENDS ${name} USES_TERMINAL VERBATIM)
  endif()
endfunction()
