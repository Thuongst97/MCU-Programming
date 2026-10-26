/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PortDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Port-lite for the STM32G4: every pin's mode, pull, output type, speed and alternate function
 * come from the configuration and go into GPIOx_MODER/PUPDR/OTYPER/OSPEEDR/AFR (RM0440 "GPIO").
 * Port_SetPinDirection and Port_SetPinMode are not supported (configured STD_OFF); the
 * SWS makes both optional.
 */
#ifndef PORT_H
#define PORT_H

#include "Std_Types.h"
#include "Port_Cfg.h"

#define PORT_VENDOR_ID                    0xFFFFU
#define PORT_MODULE_ID                    124U
#define PORT_AR_RELEASE_MAJOR_VERSION     4U
#define PORT_AR_RELEASE_MINOR_VERSION     11U
#define PORT_AR_RELEASE_REVISION_VERSION  0U
#define PORT_SW_MAJOR_VERSION             1U
#define PORT_SW_MINOR_VERSION             0U
#define PORT_SW_PATCH_VERSION             0U

#define PORT_E_PARAM_PIN                  0x0AU
#define PORT_E_PARAM_CONFIG               0x0CU
#define PORT_E_UNINIT                     0x0FU
#define PORT_E_PARAM_POINTER              0x10U
#define PORT_INIT_SID                     0x00U
#define PORT_REFRESHPORTDIRECTION_SID     0x02U
#define PORT_GETVERSIONINFO_SID           0x03U

typedef uint8 Port_PinType;               /* 16 * port + pin: A0 = 0, B12 = 28, C13 = 45 */
typedef enum { PORT_PIN_IN = 0, PORT_PIN_OUT } Port_PinDirectionType;

/* GPIOx_MODER values (2 bits per pin) */
#define PORT_MODE_INPUT         0U
#define PORT_MODE_OUTPUT        1U
#define PORT_MODE_AF            2U
#define PORT_MODE_ANALOG        3U
/* GPIOx_PUPDR values */
#define PORT_PULL_NONE          0U
#define PORT_PULL_UP            1U
#define PORT_PULL_DOWN          2U

typedef struct
{
    Port_PinType pin;
    uint8 mode;                           /* PORT_MODE_... */
    uint8 pull;                           /* PORT_PULL_... */
    uint8 openDrain;                      /* 1: OTYPER open-drain */
    uint8 speed;                          /* OSPEEDR 0 (low) .. 3 (very high) */
    uint8 af;                             /* AFR value when mode is PORT_MODE_AF (DS12288 table) */
    uint8 initialLevel;                   /* STD_HIGH / STD_LOW: output level before the pin drives */
} Port_PinConfigType;

typedef struct
{
    P2CONST(Port_PinConfigType, TYPEDEF, PORT_APPL_CONST) pins;
    uint8 numPins;
} Port_ConfigType;

#define PORT_START_SEC_CODE
#include "Port_MemMap.h"
FUNC(void, PORT_CODE) Port_Init(P2CONST(Port_ConfigType, AUTOMATIC, PORT_APPL_CONST) ConfigPtr);
FUNC(void, PORT_CODE) Port_RefreshPortDirection(void);
FUNC(void, PORT_CODE) Port_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, PORT_APPL_DATA) versioninfo);
#define PORT_STOP_SEC_CODE
#include "Port_MemMap.h"

extern CONST(Port_ConfigType, PORT_CONST) Port_Config;   /* Port_PBcfg.c */

#endif
