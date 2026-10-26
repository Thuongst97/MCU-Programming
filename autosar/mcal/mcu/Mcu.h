/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_MCUDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Mcu-lite for the STM32G474: clock tree (HSI16 -> PLL -> SYSCLK at 170 MHz, range 1 boost, RM0440
 * "RCC" and "PWR"), reset reason
 * (RCC_CSR) and software reset. Not supported (listed, not stubbed): Mcu_InitRamSection,
 * Mcu_SetMode (low-power modes), Mcu_GetRamState.
 */
#ifndef MCU_H
#define MCU_H

#include "Std_Types.h"
#include "Mcu_Cfg.h"

#define MCU_VENDOR_ID                     0xFFFFU
#define MCU_MODULE_ID                     101U
#define MCU_AR_RELEASE_MAJOR_VERSION      4U
#define MCU_AR_RELEASE_MINOR_VERSION      11U
#define MCU_AR_RELEASE_REVISION_VERSION   0U
#define MCU_SW_MAJOR_VERSION              1U
#define MCU_SW_MINOR_VERSION              0U
#define MCU_SW_PATCH_VERSION              0U

/* Development error codes and service IDs (values: see docs/autosar-self-review.md) */
#define MCU_E_PARAM_CONFIG                0x0AU
#define MCU_E_PARAM_CLOCK                 0x0BU
#define MCU_E_PLL_NOT_LOCKED              0x0EU
#define MCU_E_UNINIT                      0x0FU
#define MCU_E_PARAM_POINTER               0x10U
#define MCU_INIT_SID                      0x00U
#define MCU_INITCLOCK_SID                 0x02U
#define MCU_DISTRIBUTEPLLCLOCK_SID        0x03U
#define MCU_GETPLLSTATUS_SID              0x04U
#define MCU_GETRESETREASON_SID            0x05U
#define MCU_GETVERSIONINFO_SID            0x09U

typedef uint8 Mcu_ClockType;
typedef uint32 Mcu_RawResetType;
typedef enum { MCU_PLL_LOCKED = 0, MCU_PLL_UNLOCKED, MCU_PLL_STATUS_UNDEFINED } Mcu_PllStatusType;
typedef enum
{
    MCU_POWER_ON_RESET = 0, MCU_WATCHDOG_RESET, MCU_SW_RESET, MCU_RESET_PIN, MCU_RESET_UNDEFINED
} Mcu_ResetType;

typedef struct
{
    uint8 pllM;            /* PLL input divider M, 1..16 (HSI16 / M) */
    uint8 pllN;            /* VCO multiplier N, 8..127 */
    uint8 pllR;            /* system output divider R: 2, 4, 6 or 8 */
    uint8 ahbDiv;          /* RCC_CFGR HPRE value */
    uint8 apb1Div;         /* RCC_CFGR PPRE1 value */
    uint8 apb2Div;         /* RCC_CFGR PPRE2 value */
    uint8 flashLatency;    /* FLASH_ACR LATENCY: 4 wait states at 170 MHz in boost mode */
    boolean boost;         /* regulator range 1 boost (PWR_CR5.R1MODE = 0): needed above 150 MHz */
} Mcu_ClockSettingConfigType;

typedef struct
{
    P2CONST(Mcu_ClockSettingConfigType, TYPEDEF, MCU_APPL_CONST) clockSettings;
    uint8 numClockSettings;
} Mcu_ConfigType;

#define MCU_START_SEC_CODE
#include "Mcu_MemMap.h"
FUNC(void, MCU_CODE) Mcu_Init(P2CONST(Mcu_ConfigType, AUTOMATIC, MCU_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, MCU_CODE) Mcu_InitClock(Mcu_ClockType ClockSetting);
FUNC(Std_ReturnType, MCU_CODE) Mcu_DistributePllClock(void);
FUNC(Mcu_PllStatusType, MCU_CODE) Mcu_GetPllStatus(void);
FUNC(Mcu_ResetType, MCU_CODE) Mcu_GetResetReason(void);
FUNC(Mcu_RawResetType, MCU_CODE) Mcu_GetResetRawValue(void);
FUNC(void, MCU_CODE) Mcu_PerformReset(void);
FUNC(void, MCU_CODE) Mcu_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, MCU_APPL_DATA) versioninfo);
#define MCU_STOP_SEC_CODE
#include "Mcu_MemMap.h"

extern CONST(Mcu_ConfigType, MCU_CONST) Mcu_Config;   /* Mcu_PBcfg.c */

#endif
