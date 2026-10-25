/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_RTE (RTE API), AUTOSAR_CP_TPS_SoftwareComponentTemplate
 * In production  : HAND-WRITTEN (application software component)
 *
 * SWC LampMonitor (TL-REQ-005): compares the lamp commands with the measured lamp current and
 * reports failures to TurnLight, to Com and to Dem. The plan's 100 ms period became 10 ms: the
 * current must be judged within each 330 ms on-phase, after the 20 ms soft start.
 */
#include "Rte_LampMonitor.h"
#include "lampmon.h"

#define LAMPMONITOR_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "LampMonitor_MemMap.h"
static lampmon_t LampMonitor_State;
#define LAMPMONITOR_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "LampMonitor_MemMap.h"

#define LAMPMONITOR_START_SEC_CODE
#include "LampMonitor_MemMap.h"

FUNC(void, LAMPMONITOR_CODE) RE_LampMonitor_Init(void)
{
    lampmon_init(&LampMonitor_State);
}

// [region:runnable]
FUNC(void, LAMPMONITOR_CODE) RE_LampMonitor_10ms(void)
{
    boolean onL = FALSE;
    boolean onR = FALSE;
    uint16 raw = 0U;
    (void)Rte_Read_LampState_Left(&onL);   // «1»
    (void)Rte_Read_LampState_Right(&onR);
    (void)Rte_Call_LampCurrent_Get(&raw);   // «2»
    const bool on[TL_SIDES] = {onL == TRUE, onR == TRUE};
    lampmon_event_t ev[TL_SIDES];
    lampmon_step(&LampMonitor_State, on, raw, 10U, ev);   // «3»
    if (ev[TL_LEFT] != LAMPMON_NO_CHANGE)
    {
        const boolean f = LampMonitor_State.failed[TL_LEFT] ? TRUE : FALSE;
        (void)Rte_Write_LampFailed_Left(f);                                    /* to TurnLight and Com */   // «4»
        (void)Rte_Call_EvLampOutLeft_SetEventStatus((f == TRUE) ? DEM_EVENT_STATUS_FAILED : DEM_EVENT_STATUS_PASSED);   // «5»
    }
    if (ev[TL_RIGHT] != LAMPMON_NO_CHANGE)
    {
        const boolean f = LampMonitor_State.failed[TL_RIGHT] ? TRUE : FALSE;
        (void)Rte_Write_LampFailed_Right(f);
        (void)Rte_Call_EvLampOutRight_SetEventStatus((f == TRUE) ? DEM_EVENT_STATUS_FAILED : DEM_EVENT_STATUS_PASSED);
    }
}
// [endregion]

#define LAMPMONITOR_STOP_SEC_CODE
#include "LampMonitor_MemMap.h"
