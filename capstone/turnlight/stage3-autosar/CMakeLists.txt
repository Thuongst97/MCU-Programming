# SPDX-License-Identifier: MIT
# TurnLight stage 3: AUTOSAR-style layers. SWCs and RTE here, BSW/MCAL/OS shim from autosar/,
# configuration ("generated" files) in cfg/, the state machine library from ../logic.
set(TL "${CMAKE_CURRENT_SOURCE_DIR}/..")
file(GLOB _cfg_sources "${CMAKE_CURRENT_SOURCE_DIR}/cfg/*.c")
nucleo_add_executable(tl-stage3-autosar
  SOURCES integration/main.c rte/Rte.c asw/TurnLight/TurnLight.c asw/LampMonitor/LampMonitor.c
          ${_cfg_sources} ${TL}/logic/turnlight_sm.c ${TL}/logic/lampmon.c ${TL}/logic/tl_msg.c
  INCLUDES rte cfg ${TL}/logic)
autosar_add(tl-stage3-autosar CFG_DIR "${CMAKE_CURRENT_SOURCE_DIR}/cfg")
