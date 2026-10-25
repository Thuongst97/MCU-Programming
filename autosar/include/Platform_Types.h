/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PlatformTypes
 * In production  : VENDOR-SUPPLIED (per CPU and compiler)
 * Cortex-M3 (ARMv7-M), little-endian, 32-bit int, arm-none-eabi-gcc.
 */
#ifndef PLATFORM_TYPES_H
#define PLATFORM_TYPES_H

#define CPU_TYPE_8          8U
#define CPU_TYPE_16         16U
#define CPU_TYPE_32         32U
#define CPU_TYPE_64         64U
#define MSB_FIRST           0U
#define LSB_FIRST           1U
#define HIGH_BYTE_FIRST     0U
#define LOW_BYTE_FIRST      1U

#define CPU_TYPE            CPU_TYPE_32
#define CPU_BIT_ORDER       LSB_FIRST
#define CPU_BYTE_ORDER      LOW_BYTE_FIRST

typedef unsigned char       boolean;        /* only TRUE and FALSE */
typedef signed char         sint8;
typedef unsigned char       uint8;
typedef signed short        sint16;
typedef unsigned short      uint16;
typedef signed long         sint32;
typedef unsigned long       uint32;
typedef signed long long    sint64;
typedef unsigned long long  uint64;
typedef signed long         sint8_least;    /* "at least N bits", fastest type: the native word */
typedef unsigned long       uint8_least;
typedef signed long         sint16_least;
typedef unsigned long       uint16_least;
typedef signed long         sint32_least;
typedef unsigned long       uint32_least;
typedef float               float32;
typedef double              float64;

#ifndef TRUE
#define TRUE                ((boolean)1U)
#endif
#ifndef FALSE
#define FALSE               ((boolean)0U)
#endif

#endif
