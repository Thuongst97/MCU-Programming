/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_PortDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Port-lite for the STM32F1: every pin's mode comes from the configuration as the 4-bit
 * CNF[1:0] MODE[1:0] value of GPIOx_CRL/CRH (RM0008 §9.2.1), plus the AFIO remap register.
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

/* F1 pin modes: CNF[1:0] << 2 | MODE[1:0] */
#define PORT_F1_ANALOG          0x0U
#define PORT_F1_IN_FLOATING     0x4U
#define PORT_F1_IN_PULL         0x8U      /* pull-up or pull-down, chosen by the initial level */
#define PORT_F1_OUT_PP_2MHZ     0x2U
#define PORT_F1_OUT_OD_2MHZ     0x6U
#define PORT_F1_AF_PP_2MHZ      0xAU
#define PORT_F1_AF_PP_50MHZ     0xBU

typedef struct
{
    Port_PinType pin;
    uint8 mode;                           /* PORT_F1_... */
    uint8 initialLevel;                   /* STD_HIGH / STD_LOW: output level, or pull-up/down */
} Port_PinConfigType;

typedef struct
{
    P2CONST(Port_PinConfigType, TYPEDEF, PORT_APPL_CONST) pins;
    uint8 numPins;
    uint32 afioMapr;                      /* remaps; SWJ_CFG must never disable SWD */
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
