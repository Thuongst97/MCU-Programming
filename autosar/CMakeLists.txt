# SPDX-License-Identifier: MIT
# The course's AUTOSAR-style library (teaching code, not AUTOSAR-conformant). It is compiled into
# each project together with that project's configuration, as BSW is in a real ECU build:
#   autosar_add(<target> CFG_DIR <dir>)   # <dir> holds *_Cfg.h, *_PBcfg.c, *_MemMap.h, Os_Cfg.*, FreeRTOSConfig.h
set(AUTOSAR_ROOT "${CMAKE_CURRENT_SOURCE_DIR}" CACHE INTERNAL "")

function(autosar_add target)
  cmake_parse_arguments(AR "" "CFG_DIR" "" ${ARGN})
  set(A "${AUTOSAR_ROOT}")
  file(GLOB _bsw "${A}/det/*.c" "${A}/mcal/*/*.c" "${A}/ecual/*/*.c" "${A}/services/*/*.c" "${A}/os_shim/*.c")
  target_sources(${target} PRIVATE ${_bsw})
  file(GLOB _inc LIST_DIRECTORIES true "${A}/include" "${A}/det" "${A}/mcal/*" "${A}/ecual/*" "${A}/services/*" "${A}/os_shim")
  target_include_directories(${target} PRIVATE ${AR_CFG_DIR} ${_inc})
  bluepill_freertos(${target} CONFIG_DIR "${AR_CFG_DIR}")
  target_include_directories(${target}_freertos SYSTEM PUBLIC "${A}/include" "${A}/os_shim")
endfunction()
