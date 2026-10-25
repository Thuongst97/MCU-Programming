/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_MemoryMapping
 * In production  : GENERATED (one <Msn>_MemMap.h per module, with compiler-specific pragmas)
 *
 * Shared body of every <Msn>_MemMap.h in this project. The module header translates its own
 * <MSN>_START_SEC_<SEC> / <MSN>_STOP_SEC_<SEC> into MEMMAP_DO_START / MEMMAP_DO_STOP and includes
 * this file. GCC has no "section for everything that follows" pragma on ARM, so this teaching
 * version places nothing; it enforces the part tools can check: every START has its STOP, and
 * sections never nest. A production MemMap emits #pragma section / attribute changes here.
 * (No include guard on purpose: it is included many times per file.)
 */
#if defined(MEMMAP_DO_START)
#  undef MEMMAP_DO_START
#  if defined(MEMMAP_SECTION_OPEN)
#    error "MemMap: START_SEC without STOP_SEC of the previous section"
#  endif
#  define MEMMAP_SECTION_OPEN
#elif defined(MEMMAP_DO_STOP)
#  undef MEMMAP_DO_STOP
#  if !defined(MEMMAP_SECTION_OPEN)
#    error "MemMap: STOP_SEC without START_SEC"
#  endif
#  undef MEMMAP_SECTION_OPEN
#else
#  error "MemMap: included without a recognised START_SEC / STOP_SEC define"
#endif
