/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_ECUStateManager
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#include "EcuM.h"
#include "Mcu.h"
#include "Os.h"

#define ECUM_START_SEC_CODE
#include "EcuM_MemMap.h"

// [region:init]
FUNC(void, ECUM_CODE) EcuM_Init(void)
{
    EcuM_AL_DriverInitZero();                       /* Det: before anything can report an error */
    Mcu_Init(&Mcu_Config);
    if (Mcu_InitClock(0U) == E_OK)                  /* clock setting 0: HSE 8 MHz x 9 = 72 MHz */
    {
        for (uint32 n = 0U; (n < 200000UL) && (Mcu_GetPllStatus() != MCU_PLL_LOCKED); ++n)
        {
            /* bounded wait for the PLL */
        }
        (void)Mcu_DistributePllClock();             /* on failure the ECU keeps running on HSI */
    }
    EcuM_AL_DriverInitOne();                        /* Port, Dio, ... : everything the OS needs */
    StartOS(OSDEFAULTAPPMODE);                      /* does not return */
}

FUNC(void, ECUM_CODE) EcuM_StartupTwo(void)
{
    EcuM_AL_DriverInitTwo();                        /* drivers needing the OS tick, the stack, the RTE */
}
// [endregion]

#define ECUM_STOP_SEC_CODE
#include "EcuM_MemMap.h"
