/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_ECUStateManager
 * In production  : VENDOR-SUPPLIED (BSW stack vendor); the callouts are HAND-WRITTEN by the integrator
 *
 * EcuM-lite (fixed start-up only): EcuM_Init runs driver init list zero and one through the
 * integrator's callouts, then StartOS(); EcuM_StartupTwo runs list two from the first task.
 * Left out: shutdown and sleep, wake-up validation, BswM mode handling, the RUN request protocol.
 */
#ifndef ECUM_H
#define ECUM_H

#include "Std_Types.h"

#define ECUM_VENDOR_ID                    0xFFFFU
#define ECUM_MODULE_ID                    10U
#define ECUM_AR_RELEASE_MAJOR_VERSION     4U
#define ECUM_AR_RELEASE_MINOR_VERSION     11U
#define ECUM_AR_RELEASE_REVISION_VERSION  0U
#define ECUM_SW_MAJOR_VERSION             1U
#define ECUM_SW_MINOR_VERSION             0U
#define ECUM_SW_PATCH_VERSION             0U

#define ECUM_START_SEC_CODE
#include "EcuM_MemMap.h"
FUNC(void, ECUM_CODE) EcuM_Init(void);
FUNC(void, ECUM_CODE) EcuM_StartupTwo(void);

/* Callouts: written by the integrator for this ECU (EcuM_Callout_Stubs.c in production) */
FUNC(void, ECUM_CODE) EcuM_AL_DriverInitZero(void);
FUNC(void, ECUM_CODE) EcuM_AL_DriverInitOne(void);
FUNC(void, ECUM_CODE) EcuM_AL_DriverInitTwo(void);
#define ECUM_STOP_SEC_CODE
#include "EcuM_MemMap.h"

#endif
