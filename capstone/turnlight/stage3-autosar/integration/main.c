/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_ECUStateManager (callouts), AUTOSAR_CP_SWS_OS (hooks)
 * In production  : HAND-WRITTEN by the integrator
 *
 * TurnLight stage 3: the integration layer. main() only calls EcuM_Init(). Everything else here
 * is a callout or hook that the BSW configuration names: driver init lists, the OS hooks, the
 * Det callout, the Dem status callback, the Com TX callout and the RTE's VFB trace hooks.
 * The UART log (examples/common/bsp) is a debug channel outside the AUTOSAR architecture; it
 * prints the same lines as stages 1 and 2, so one acceptance suite tests all three.
 */
#include "Adc.h"
#include "Can.h"
#include "CanIf.h"
#include "Com.h"
#include "Dem.h"
#include "Det.h"
#include "EcuM.h"
#include "Integration_Callouts.h"
#include "IoHwAb.h"
#include "Mcu.h"
#include "Os.h"
#include "PduR.h"
#include "Port.h"
#include "Pwm.h"
#include "Rte_Cbk.h"
#include "Wdg.h"
#include "WdgM.h"

#include "tl_msg.h"
#include "uart_log.h"

DeclareTask(Init);

int main(void)
{
    EcuM_Init();                                         /* never returns: the OS takes over */
    return 0;
}

// [region:initlists]
void EcuM_AL_DriverInitZero(void)
{
    Det_Init(NULL_PTR);
    Dem_PreInit();
}

void EcuM_AL_DriverInitOne(void)
{
    Port_Init(&Port_Config);                             /* pins first: everything else uses them */
    uart_log_init(115200U);                              /* debug channel (not AUTOSAR) */
    uint8 cause = 0U;
    static const uint8 map[] = {0U, 3U, 2U, 1U, 6U};     /* Mcu_ResetType -> message coding */
    const Mcu_ResetType r = Mcu_GetResetReason();
    cause = map[((uint32)r < 5U) ? (uint32)r : 4U];
    uart_puts("\nTurnLight stage 3 (AUTOSAR-style), reset cause: ");
    uart_puts(tl_reset_name(cause));
    uart_puts("\n");
}

void EcuM_AL_DriverInitTwo(void)
{
    Pwm_Init(&Pwm_Config);
    Adc_Init(&Adc_Config);
    Can_Init(&Can_Config);
    CanIf_Init(&CanIf_Config);
    PduR_Init(&PduR_Config);
    Com_Init(&Com_Config);
    Dem_Init(&Dem_Config);
    IoHwAb_Init(&IoHwAb_Config);
    Wdg_Init(&Wdg_Config);
    WdgM_Init(&WdgM_Config);
    (void)CanIf_SetControllerMode(CanConf_CanController_0, CAN_CS_STARTED);   /* production: CanSM via BswM */
    (void)Rte_Start();
}

TASK(Init)
{
    EcuM_StartupTwo();
    (void)SetRelAlarm(OsAlarm_5ms_ID, 5U, 5U);           /* production: autostart alarms in the OS config */
    (void)SetRelAlarm(OsAlarm_10ms_ID, 10U, 10U);
    (void)SetRelAlarm(OsAlarm_50ms_ID, 50U, 50U);
    (void)TerminateTask();
}
// [endregion]

/* --------------------------------------------------------------------- callouts and hooks */
// [region:callouts]
boolean Integration_TurnLightStatusTxCallout(PduIdType id, PduInfoType *pdu)
{
    static uint8 alive;
    (void)id;
    alive++;
    pdu->SduDataPtr[2] = alive;                          /* byte 2: alive counter, every frame */
    return TRUE;                                         /* TRUE: send it */
}

void Integration_DemStatusChanged(uint16 EventId, uint8 oldStatus, uint8 newStatus)
{
    if (((oldStatus ^ newStatus) & DEM_UDS_STATUS_TF) != 0U)    /* testFailed changed */
    {
        uart_puts("dem: ");
        uart_puts(Dem_Config.events[EventId - 1U].name);
        uart_puts(((newStatus & DEM_UDS_STATUS_TF) != 0U) ? " failed\n" : " passed\n");
    }
}

static void Integration_LogLamp(char side, boolean on, boolean *prev)
{
    if (on != *prev)
    {
        *prev = on;
        uart_puts("lamp ");
        uart_putc(side);
        uart_puts((on == TRUE) ? " 1\n" : " 0\n");
    }
}

void Rte_WriteHook_TurnLight_LampState_Left_Start(boolean data)
{
    static boolean prev;
    Integration_LogLamp('L', data, &prev);
}

void Rte_WriteHook_TurnLight_LampState_Right_Start(boolean data)
{
    static boolean prev;
    Integration_LogLamp('R', data, &prev);
}

void Rte_WriteHook_TurnLight_TurnStatus_Hazard_Start(boolean data)
{
    static boolean prev;
    if (data != prev)
    {
        prev = data;
        uart_puts((data == TRUE) ? "tl: hazard on\n" : "tl: hazard off\n");
    }
}
// [endregion]

void Integration_DetCallout(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId)
{
    uart_puts("det: module ");
    uart_put_dec(ModuleId);
    uart_puts(" instance ");
    uart_put_dec(InstanceId);
    uart_puts(" api ");
    uart_put_dec(ApiId);
    uart_puts(" error ");
    uart_put_dec(ErrorId);
    uart_puts("\n");
}

void ErrorHook(StatusType Error)
{
    uart_puts("os: error ");
    uart_put_dec(Error);
    uart_puts("\n");
}

void ShutdownHook(StatusType Error)
{
    uart_puts("os: shutdown, error ");
    uart_put_dec(Error);
    uart_puts("\n");
}
