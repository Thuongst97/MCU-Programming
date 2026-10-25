/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_IOHardwareAbstraction (structure; the API is project-specific)
 * In production  : HAND-WRITTEN per ECU (often partly generated), then wrapped as an
 *                  ECU-abstraction SWC so the RTE can connect application ports to it
 *
 * The ECU's view of its I/O in physical terms: "stalk left pressed", "lamp left on", "lamp
 * current" instead of pins, timer channels and ADC groups. Debouncing and the soft lamp ramp
 * live here, so application SWCs see clean signals.
 */
#ifndef IOHWAB_H
#define IOHWAB_H

#include "Std_Types.h"
#include "Dio.h"
#include "Pwm.h"
#include "Adc.h"
#include "IoHwAb_Cfg.h"

#define IOHWAB_VENDOR_ID                  0xFFFFU
#define IOHWAB_MODULE_ID                  254U
#define IOHWAB_AR_RELEASE_MAJOR_VERSION   4U
#define IOHWAB_AR_RELEASE_MINOR_VERSION   11U
#define IOHWAB_AR_RELEASE_REVISION_VERSION 0U
#define IOHWAB_SW_MAJOR_VERSION           1U
#define IOHWAB_SW_MINOR_VERSION           0U
#define IOHWAB_SW_PATCH_VERSION           0U

typedef uint8 IoHwAb_SignalType;

typedef struct
{
    Dio_ChannelType channel;
    boolean activeLow;
    uint8 debounceMs;
} IoHwAb_DigitalInConfigType;

typedef struct
{
    Pwm_ChannelType channel;
    uint8 rampMs;                         /* 0 -> 100 % in this time */
} IoHwAb_LampConfigType;

typedef struct
{
    P2CONST(IoHwAb_DigitalInConfigType, TYPEDEF, IOHWAB_APPL_CONST) inputs;
    uint8 numInputs;
    P2CONST(IoHwAb_LampConfigType, TYPEDEF, IOHWAB_APPL_CONST) lamps;
    uint8 numLamps;
    Adc_GroupType currentGroup;
} IoHwAb_ConfigType;

#define IOHWAB_START_SEC_CODE
#include "IoHwAb_MemMap.h"
FUNC(void, IOHWAB_CODE) IoHwAb_Init(P2CONST(IoHwAb_ConfigType, AUTOMATIC, IOHWAB_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, IOHWAB_CODE) IoHwAb_Digital_Get(IoHwAb_SignalType Signal, P2VAR(boolean, AUTOMATIC, IOHWAB_APPL_DATA) Value);
FUNC(Std_ReturnType, IOHWAB_CODE) IoHwAb_Lamp_Set(IoHwAb_SignalType Lamp, boolean On);
FUNC(Std_ReturnType, IOHWAB_CODE) IoHwAb_LampCurrent_Get(P2VAR(uint16, AUTOMATIC, IOHWAB_APPL_DATA) Raw);
FUNC(void, IOHWAB_CODE) IoHwAb_MainFunction_Fast(void);   /* 5 ms: lamp ramps */
FUNC(void, IOHWAB_CODE) IoHwAb_MainFunction(void);        /* 10 ms: debouncing, current measurement */
#define IOHWAB_STOP_SEC_CODE
#include "IoHwAb_MemMap.h"

extern CONST(IoHwAb_ConfigType, IOHWAB_CONST) IoHwAb_Config;

#endif
