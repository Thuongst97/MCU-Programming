/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_MCUDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Mcu.h"
#include "stm32f103xb.h"
#if (MCU_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#endif

#if (MCU_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (MCU_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Mcu.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define MCU_WAIT_LOOPS 200000UL

#if (MCU_DEV_ERROR_DETECT == STD_ON)
#define MCU_DET(api, err) ((void)Det_ReportError(MCU_MODULE_ID, 0U, (api), (err)))
#else
#define MCU_DET(api, err) ((void)0)
#endif

#define MCU_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Mcu_MemMap.h"
static P2CONST(Mcu_ConfigType, MCU_VAR, MCU_APPL_CONST) Mcu_ConfigPtr;
static VAR(uint32, MCU_VAR) Mcu_ResetRaw;
#define MCU_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Mcu_MemMap.h"

#define MCU_START_SEC_CODE
#include "Mcu_MemMap.h"

static FUNC(boolean, MCU_CODE) Mcu_WaitSet(volatile uint32 *reg, uint32 mask, uint32 value)
{
    for (uint32 n = 0U; n < MCU_WAIT_LOOPS; ++n)
    {
        if ((*reg & mask) == value)
        {
            return TRUE;
        }
    }
    return FALSE;                                         /* every hardware wait has a timeout */
}

FUNC(void, MCU_CODE) Mcu_Init(P2CONST(Mcu_ConfigType, AUTOMATIC, MCU_APPL_CONST) ConfigPtr)
{
    if (ConfigPtr == NULL_PTR)
    {
        MCU_DET(MCU_INIT_SID, MCU_E_PARAM_POINTER);
        return;
    }
    Mcu_ResetRaw = RCC->CSR;                              /* keep the reset flags, then clear them */
    RCC->CSR |= RCC_CSR_RMVF;
    Mcu_ConfigPtr = ConfigPtr;
}

// [region:initclock]
FUNC(Std_ReturnType, MCU_CODE) Mcu_InitClock(Mcu_ClockType ClockSetting)
{
    if (Mcu_ConfigPtr == NULL_PTR)
    {
        MCU_DET(MCU_INITCLOCK_SID, MCU_E_UNINIT);
        return E_NOT_OK;
    }
    if (ClockSetting >= Mcu_ConfigPtr->numClockSettings)
    {
        MCU_DET(MCU_INITCLOCK_SID, MCU_E_PARAM_CLOCK);
        return E_NOT_OK;
    }
    P2CONST(Mcu_ClockSettingConfigType, AUTOMATIC, MCU_APPL_CONST) c = &Mcu_ConfigPtr->clockSettings[ClockSetting];
    RCC->CR |= RCC_CR_HSEON;
    if (!Mcu_WaitSet(&RCC->CR, RCC_CR_HSERDY, RCC_CR_HSERDY))
    {
        return E_NOT_OK;                                  /* production: Dem event MCU_E_CLOCK_FAILURE */
    }
    FLASH->ACR = FLASH_ACR_PRFTBE | ((uint32)c->flashLatency << FLASH_ACR_LATENCY_Pos);
    RCC->CFGR = (RCC->CFGR & ~(RCC_CFGR_HPRE | RCC_CFGR_PPRE1 | RCC_CFGR_PPRE2 | RCC_CFGR_PLLMULL | RCC_CFGR_PLLSRC |
                               RCC_CFGR_PLLXTPRE | RCC_CFGR_ADCPRE)) |
                ((uint32)c->ahbDiv << RCC_CFGR_HPRE_Pos) | ((uint32)c->apb1Div << RCC_CFGR_PPRE1_Pos) |
                ((uint32)c->apb2Div << RCC_CFGR_PPRE2_Pos) | RCC_CFGR_PLLSRC | RCC_CFGR_ADCPRE_DIV6 |
                ((uint32)(c->pllMul - 2U) << RCC_CFGR_PLLMULL_Pos);
    RCC->CR |= RCC_CR_PLLON;                              /* Mcu_GetPllStatus() reports the lock */
    return E_OK;
}
// [endregion]

FUNC(Mcu_PllStatusType, MCU_CODE) Mcu_GetPllStatus(void)
{
    if (Mcu_ConfigPtr == NULL_PTR)
    {
        MCU_DET(MCU_GETPLLSTATUS_SID, MCU_E_UNINIT);
        return MCU_PLL_STATUS_UNDEFINED;
    }
    return ((RCC->CR & RCC_CR_PLLRDY) != 0U) ? MCU_PLL_LOCKED : MCU_PLL_UNLOCKED;
}

FUNC(Std_ReturnType, MCU_CODE) Mcu_DistributePllClock(void)
{
    if (Mcu_GetPllStatus() != MCU_PLL_LOCKED)
    {
        MCU_DET(MCU_DISTRIBUTEPLLCLOCK_SID, MCU_E_PLL_NOT_LOCKED);
        return E_NOT_OK;
    }
    RCC->CFGR = (RCC->CFGR & ~RCC_CFGR_SW) | RCC_CFGR_SW_PLL;
    if (!Mcu_WaitSet(&RCC->CFGR, RCC_CFGR_SWS, RCC_CFGR_SWS_PLL))
    {
        return E_NOT_OK;
    }
    SystemCoreClockUpdate();
    return E_OK;
}

FUNC(Mcu_ResetType, MCU_CODE) Mcu_GetResetReason(void)
{
    if (Mcu_ConfigPtr == NULL_PTR)
    {
        MCU_DET(MCU_GETRESETREASON_SID, MCU_E_UNINIT);
        return MCU_RESET_UNDEFINED;
    }
    if ((Mcu_ResetRaw & (RCC_CSR_IWDGRSTF | RCC_CSR_WWDGRSTF)) != 0U) { return MCU_WATCHDOG_RESET; }
    if ((Mcu_ResetRaw & RCC_CSR_SFTRSTF) != 0U) { return MCU_SW_RESET; }
    if ((Mcu_ResetRaw & RCC_CSR_PORRSTF) != 0U) { return MCU_POWER_ON_RESET; }
    if ((Mcu_ResetRaw & RCC_CSR_PINRSTF) != 0U) { return MCU_RESET_PIN; }
    return MCU_RESET_UNDEFINED;
}

FUNC(Mcu_RawResetType, MCU_CODE) Mcu_GetResetRawValue(void)
{
    return Mcu_ResetRaw;
}

FUNC(void, MCU_CODE) Mcu_PerformReset(void)
{
    NVIC_SystemReset();
}

FUNC(void, MCU_CODE) Mcu_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, MCU_APPL_DATA) versioninfo)
{
    if (versioninfo == NULL_PTR)
    {
        MCU_DET(MCU_GETVERSIONINFO_SID, MCU_E_PARAM_POINTER);
        return;
    }
    versioninfo->vendorID = MCU_VENDOR_ID;
    versioninfo->moduleID = MCU_MODULE_ID;
    versioninfo->sw_major_version = MCU_SW_MAJOR_VERSION;
    versioninfo->sw_minor_version = MCU_SW_MINOR_VERSION;
    versioninfo->sw_patch_version = MCU_SW_PATCH_VERSION;
}

#define MCU_STOP_SEC_CODE
#include "Mcu_MemMap.h"
