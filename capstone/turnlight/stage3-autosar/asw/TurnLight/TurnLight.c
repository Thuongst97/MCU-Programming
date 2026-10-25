/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_RTE (RTE API), AUTOSAR_CP_TPS_SoftwareComponentTemplate
 * In production  : HAND-WRITTEN (application software component)
 *
 * SWC TurnLight: the turn-signal function. It sees only its RTE contract (Rte_TurnLight.h):
 * stalk and hazard inputs and lamp outputs through ports to the I/O hardware abstraction, lamp
 * failures from LampMonitor, the status message through Com, ClusterAck supervision through the
 * age of the received data, and the Dem event for a lost cluster. The behaviour is the same
 * state machine as stages 1 and 2 (../../logic), used here as an application library.
 */
#include "Rte_TurnLight.h"
#include "turnlight_sm.h"

#define TURNLIGHT_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "TurnLight_MemMap.h"
static turnlight_t TurnLight_Sm;
static tl_outputs_t TurnLight_Out;
static boolean TurnLight_PrevHazard;
static boolean TurnLight_ClusterLost;
#define TURNLIGHT_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "TurnLight_MemMap.h"

#define TURNLIGHT_START_SEC_CODE
#include "TurnLight_MemMap.h"

FUNC(void, TURNLIGHT_CODE) RE_TurnLight_Init(void)
{
    uint8 cause = 0U;
    tl_init(&TurnLight_Sm);
    TurnLight_PrevHazard = FALSE;
    TurnLight_ClusterLost = FALSE;
    (void)Rte_Call_ResetReason_Get(&cause);                                   /* TL-REQ-010 */
    (void)Rte_Write_TurnStatus_ResetCause(cause);
}

// [region:runnable]
FUNC(void, TURNLIGHT_CODE) RE_TurnLight_10ms(void)
{
    boolean left = FALSE;
    boolean right = FALSE;
    boolean hazard = FALSE;
    boolean failedL = FALSE;
    boolean failedR = FALSE;
    (void)Rte_Call_StalkLeft_Get(&left);                                      /* client-server to IoHwAb */
    (void)Rte_Call_StalkRight_Get(&right);
    (void)Rte_Call_HazardSwitch_Get(&hazard);
    (void)Rte_Read_LampFailed_Left(&failedL);                                 /* sender-receiver from LampMonitor */
    (void)Rte_Read_LampFailed_Right(&failedR);

    tl_inputs_t in;
    in.stalk[TL_LEFT] = (left == TRUE);
    in.stalk[TL_RIGHT] = (right == TRUE);
    in.hazard_pressed = (hazard == TRUE) && (TurnLight_PrevHazard == FALSE);   /* edge */
    in.lamp_failed[TL_LEFT] = (failedL == TRUE);
    in.lamp_failed[TL_RIGHT] = (failedR == TRUE);
    TurnLight_PrevHazard = hazard;
    (void)tl_step(&TurnLight_Sm, &in, 10U, &TurnLight_Out);

    const boolean lampL = TurnLight_Out.lamp[TL_LEFT] ? TRUE : FALSE;
    const boolean lampR = TurnLight_Out.lamp[TL_RIGHT] ? TRUE : FALSE;
    (void)Rte_Call_LampLeft_Set(lampL);                                       /* to IoHwAb -> Pwm */
    (void)Rte_Call_LampRight_Set(lampR);
    (void)Rte_Write_LampState_Left(lampL);                                    /* to LampMonitor (and Com) */
    (void)Rte_Write_LampState_Right(lampR);
    (void)Rte_Write_TurnStatus_IndLeft(TurnLight_Out.indicating[TL_LEFT] ? TRUE : FALSE);
    (void)Rte_Write_TurnStatus_IndRight(TurnLight_Out.indicating[TL_RIGHT] ? TRUE : FALSE);
    (void)Rte_Write_TurnStatus_Hazard(TurnLight_Out.hazard ? TRUE : FALSE);

    uint8 alive = 0U;
    const Std_ReturnType ack = Rte_Read_ClusterAck_Alive(&alive);              /* TL-REQ-007 */
    const boolean lost = ((ack & RTE_E_MAX_AGE_EXCEEDED) != 0U) ? TRUE : FALSE;
    if (lost != TurnLight_ClusterLost)
    {
        TurnLight_ClusterLost = lost;
        (void)Rte_Write_TurnStatus_ClusterLost(lost);
        (void)Rte_Call_EvClusterLost_SetEventStatus((lost == TRUE) ? DEM_EVENT_STATUS_FAILED : DEM_EVENT_STATUS_PASSED);
    }
    (void)Rte_Call_Alive_CheckpointReached(0U);                               /* WdgM alive supervision */
}
// [endregion]

#define TURNLIGHT_STOP_SEC_CODE
#include "TurnLight_MemMap.h"
