/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CANDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Can.h"
#include "CanIf_Cbk.h"
#include "stm32f103xb.h"
#if (CAN_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define CAN_DET(api, err) ((void)Det_ReportError(CAN_MODULE_ID, 0U, (api), (err)))
#else
#define CAN_DET(api, err) ((void)0)
#endif

#if (CAN_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (CAN_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Can.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define CAN_WAIT_LOOPS 100000UL
#define CAN_MAILBOXES  3U

#define CAN_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Can_MemMap.h"
static VAR(Can_ControllerStateType, CAN_VAR) Can_State;
static VAR(PduIdType, CAN_VAR) Can_TxPdu[CAN_MAILBOXES];   /* which PDU sits in which mailbox */
static VAR(boolean, CAN_VAR) Can_TxBusy[CAN_MAILBOXES];
#define CAN_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Can_MemMap.h"

#define CAN_START_SEC_CODE
#include "Can_MemMap.h"

static FUNC(boolean, CAN_CODE) Can_WaitMsr(uint32 mask, uint32 value)
{
    for (uint32 n = 0U; n < CAN_WAIT_LOOPS; ++n)
    {
        if ((CAN1->MSR & mask) == value)
        {
            return TRUE;
        }
    }
    return FALSE;
}

FUNC(void, CAN_CODE) Can_Init(P2CONST(Can_ConfigType, AUTOMATIC, CAN_APPL_CONST) Config)
{
    if (Config == NULL_PTR)
    {
        CAN_DET(CAN_INIT_SID, CAN_E_PARAM_POINTER);
        return;
    }
    RCC->APB1ENR |= RCC_APB1ENR_CAN1EN;
    CAN1->MCR = CAN_MCR_INRQ | CAN_MCR_ABOM | CAN_MCR_TXFP;  /* init mode, auto bus-off recovery, FIFO order */
    if (!Can_WaitMsr(CAN_MSR_INAK, CAN_MSR_INAK))
    {
        return;                                            /* stays CAN_CS_UNINIT */
    }
    CAN1->BTR = Config->btr | ((Config->silentLoopback == TRUE) ? (CAN_BTR_SILM | CAN_BTR_LBKM) : 0U);
    CAN1->FMR |= CAN_FMR_FINIT;                             /* filter bank 0: mask 0 = accept all */
    CAN1->FA1R &= ~CAN_FA1R_FACT0;
    CAN1->FS1R |= CAN_FS1R_FSC0;
    CAN1->FM1R &= ~CAN_FM1R_FBM0;
    CAN1->FFA1R &= ~CAN_FFA1R_FFA0;
    CAN1->sFilterRegister[0].FR1 = 0U;
    CAN1->sFilterRegister[0].FR2 = 0U;
    CAN1->FA1R |= CAN_FA1R_FACT0;
    CAN1->FMR &= ~CAN_FMR_FINIT;
    for (uint8 i = 0U; i < CAN_MAILBOXES; ++i)
    {
        Can_TxBusy[i] = FALSE;
    }
    Can_State = CAN_CS_STOPPED;                             /* SWS: after init the controller is stopped */
}

FUNC(Std_ReturnType, CAN_CODE) Can_SetControllerMode(uint8 Controller, Can_ControllerStateType Transition)
{
    if (Controller != 0U)
    {
        CAN_DET(CAN_SETCONTROLLERMODE_SID, CAN_E_PARAM_CONTROLLER);
        return E_NOT_OK;
    }
    if (Can_State == CAN_CS_UNINIT)
    {
        CAN_DET(CAN_SETCONTROLLERMODE_SID, CAN_E_UNINIT);
        return E_NOT_OK;
    }
    if ((Transition == CAN_CS_STARTED) && (Can_State == CAN_CS_STOPPED))
    {
        CAN1->MCR &= ~CAN_MCR_INRQ;                         /* leave init: synchronise to the bus */
        if (!Can_WaitMsr(CAN_MSR_INAK, 0U))
        {
            return E_NOT_OK;
        }
    }
    else if ((Transition == CAN_CS_STOPPED) && (Can_State == CAN_CS_STARTED))
    {
        CAN1->MCR |= CAN_MCR_INRQ;
        if (!Can_WaitMsr(CAN_MSR_INAK, CAN_MSR_INAK))
        {
            return E_NOT_OK;
        }
    }
    else
    {
        CAN_DET(CAN_SETCONTROLLERMODE_SID, CAN_E_TRANSITION);   /* sleep and invalid transitions */
        return E_NOT_OK;
    }
    Can_State = Transition;
    CanIf_ControllerModeIndication(Controller, Transition);
    return E_OK;
}

// [region:write]
FUNC(Std_ReturnType, CAN_CODE) Can_Write(Can_HwHandleType Hth, P2CONST(Can_PduType, AUTOMATIC, CAN_APPL_DATA) PduInfo)
{
    if (Can_State == CAN_CS_UNINIT)
    {
        CAN_DET(CAN_WRITE_SID, CAN_E_UNINIT);
        return E_NOT_OK;
    }
    if (Hth != CanConf_CanHardwareObject_Tx)
    {
        CAN_DET(CAN_WRITE_SID, CAN_E_PARAM_HANDLE);
        return E_NOT_OK;
    }
    if ((PduInfo == NULL_PTR) || ((PduInfo->sdu == NULL_PTR) && (PduInfo->length != 0U)))
    {
        CAN_DET(CAN_WRITE_SID, CAN_E_PARAM_POINTER);
        return E_NOT_OK;
    }
    if (PduInfo->length > 8U)
    {
        CAN_DET(CAN_WRITE_SID, CAN_E_PARAM_DATA_LENGTH);
        return E_NOT_OK;
    }
    const uint32 tme[CAN_MAILBOXES] = {CAN_TSR_TME0, CAN_TSR_TME1, CAN_TSR_TME2};
    for (uint8 m = 0U; m < CAN_MAILBOXES; ++m)
    {
        if (((CAN1->TSR & tme[m]) != 0U) && (Can_TxBusy[m] == FALSE))
        {
            uint8 d[8] = {0U};
            for (uint8 i = 0U; i < PduInfo->length; ++i)
            {
                d[i] = PduInfo->sdu[i];
            }
            CAN1->sTxMailBox[m].TDTR = PduInfo->length;
            CAN1->sTxMailBox[m].TDLR = (uint32)d[0] | ((uint32)d[1] << 8) | ((uint32)d[2] << 16) | ((uint32)d[3] << 24);
            CAN1->sTxMailBox[m].TDHR = (uint32)d[4] | ((uint32)d[5] << 8) | ((uint32)d[6] << 16) | ((uint32)d[7] << 24);
            Can_TxPdu[m] = PduInfo->swPduHandle;
            Can_TxBusy[m] = TRUE;
            CAN1->sTxMailBox[m].TIR = ((PduInfo->id & 0x7FFU) << CAN_TI0R_STID_Pos) | CAN_TI0R_TXRQ;   /* send */
            return E_OK;
        }
    }
    return CAN_BUSY;                                         /* CanIf may buffer and retry */
}
// [endregion]

// [region:mainfunctions]
FUNC(void, CAN_CODE) Can_MainFunction_Write(void)
{
    const uint32 rqcp[CAN_MAILBOXES] = {CAN_TSR_RQCP0, CAN_TSR_RQCP1, CAN_TSR_RQCP2};
    const uint32 txok[CAN_MAILBOXES] = {CAN_TSR_TXOK0, CAN_TSR_TXOK1, CAN_TSR_TXOK2};
    for (uint8 m = 0U; m < CAN_MAILBOXES; ++m)
    {
        const uint32 tsr = CAN1->TSR;
        if ((Can_TxBusy[m] == TRUE) && ((tsr & rqcp[m]) != 0U))
        {
            CAN1->TSR = rqcp[m];                             /* write 1 to clear */
            Can_TxBusy[m] = FALSE;
            if ((tsr & txok[m]) != 0U)
            {
                CanIf_TxConfirmation(Can_TxPdu[m]);          /* acknowledged on the bus */
            }
        }
    }
}

FUNC(void, CAN_CODE) Can_MainFunction_Read(void)
{
    if (Can_State != CAN_CS_STARTED)
    {
        return;
    }
    for (uint8 guard = 0U; (guard < 3U) && ((CAN1->RF0R & CAN_RF0R_FMP0) != 0U); ++guard)   /* FIFO depth 3 */
    {
        const uint32 rir = CAN1->sFIFOMailBox[0].RIR;
        const uint32 rdtr = CAN1->sFIFOMailBox[0].RDTR;
        const uint32 lo = CAN1->sFIFOMailBox[0].RDLR;
        const uint32 hi = CAN1->sFIFOMailBox[0].RDHR;
        CAN1->RF0R = CAN_RF0R_RFOM0;                         /* release the FIFO slot */
        if ((rir & CAN_RI0R_IDE) != 0U)
        {
            continue;                                        /* extended IDs are not configured */
        }
        uint8 data[8];
        for (uint8 i = 0U; i < 4U; ++i)
        {
            data[i] = (uint8)(lo >> (8U * i));
            data[i + 4U] = (uint8)(hi >> (8U * i));
        }
        const Can_HwType mailbox = {(rir >> CAN_RI0R_STID_Pos) & 0x7FFU, CanConf_CanHardwareObject_Rx, 0U};
        const uint8 dlc = (uint8)(rdtr & CAN_RDT0R_DLC);
        const PduInfoType pdu = {data, NULL_PTR, (PduLengthType)((dlc > 8U) ? 8U : dlc)};
        CanIf_RxIndication(&mailbox, &pdu);                  /* up the stack, in task context */
    }
}
// [endregion]

FUNC(Std_ReturnType, CAN_CODE) Can_GetControllerErrorState(uint8 ControllerId,
                                                            P2VAR(Can_ErrorStateType, AUTOMATIC, CAN_APPL_DATA) ErrorStatePtr)
{
    if ((ControllerId != 0U) || (ErrorStatePtr == NULL_PTR))
    {
        CAN_DET(CAN_GETCONTROLLERERRORSTATE_SID, (ControllerId != 0U) ? CAN_E_PARAM_CONTROLLER : CAN_E_PARAM_POINTER);
        return E_NOT_OK;
    }
    const uint32 esr = CAN1->ESR;
    *ErrorStatePtr = ((esr & CAN_ESR_BOFF) != 0U)   ? CAN_ERRORSTATE_BUSOFF
                     : ((esr & CAN_ESR_EPVF) != 0U) ? CAN_ERRORSTATE_PASSIVE
                                                    : CAN_ERRORSTATE_ACTIVE;
    return E_OK;
}

FUNC(void, CAN_CODE) Can_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, CAN_APPL_DATA) versioninfo)
{
    if (versioninfo == NULL_PTR)
    {
        CAN_DET(CAN_GETVERSIONINFO_SID, CAN_E_PARAM_POINTER);
        return;
    }
    versioninfo->vendorID = CAN_VENDOR_ID;
    versioninfo->moduleID = CAN_MODULE_ID;
    versioninfo->sw_major_version = CAN_SW_MAJOR_VERSION;
    versioninfo->sw_minor_version = CAN_SW_MINOR_VERSION;
    versioninfo->sw_patch_version = CAN_SW_PATCH_VERSION;
}

#define CAN_STOP_SEC_CODE
#include "Can_MemMap.h"
