/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CANDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Can.h"
#include "CanIf_Cbk.h"
#include "stm32g474xx.h"
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
#define CAN_TX_ELEMS   3U

/* FDCAN1 message RAM (RM0440 "FDCAN message RAM"): a fixed layout on the G4, 0x350 bytes per
 * instance from SRAMCAN_BASE. Element layout bits (RM0440 "Rx/Tx buffer element") have no CMSIS
 * names, so they get named constants here, as in example 11. */
#define CAN_MRAM_RXF0  (SRAMCAN_BASE + 0x0B0U)   /* RX FIFO 0: 3 elements */
#define CAN_MRAM_TXQ   (SRAMCAN_BASE + 0x278U)   /* TX FIFO: 3 elements */
#define CAN_MRAM_SIZE  0x350U
#define CAN_ELEM_WORDS 18U                       /* 2 header words + 64 data bytes */
#define CAN_ELEM_XTD   (1UL << 30)              /* word 0: extended ID */
#define CAN_ELEM_STDID_Pos 18U                   /* word 0: standard ID in bits 28:18 */
#define CAN_ELEM_DLC_Pos   16U                   /* word 1: DLC in bits 19:16 */

#define CAN_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Can_MemMap.h"
static VAR(Can_ControllerStateType, CAN_VAR) Can_State;
static VAR(PduIdType, CAN_VAR) Can_TxPdu[CAN_TX_ELEMS];    /* which PDU sits in which TX element */
static VAR(boolean, CAN_VAR) Can_TxBusy[CAN_TX_ELEMS];
#define CAN_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Can_MemMap.h"

#define CAN_START_SEC_CODE
#include "Can_MemMap.h"

static FUNC(boolean, CAN_CODE) Can_WaitCccr(uint32 mask, uint32 value)
{
    for (uint32 n = 0U; n < CAN_WAIT_LOOPS; ++n)
    {
        if ((FDCAN1->CCCR & mask) == value)
        {
            return TRUE;
        }
    }
    return FALSE;
}

static FUNC(volatile uint32*, CAN_CODE) Can_Elem(uint32 base, uint32 index)
{
    return (volatile uint32*)(base + (index * CAN_ELEM_WORDS * 4U));
}

FUNC(void, CAN_CODE) Can_Init(P2CONST(Can_ConfigType, AUTOMATIC, CAN_APPL_CONST) Config)
{
    if (Config == NULL_PTR)
    {
        CAN_DET(CAN_INIT_SID, CAN_E_PARAM_POINTER);
        return;
    }
    RCC->CCIPR = (RCC->CCIPR & ~RCC_CCIPR_FDCANSEL) | RCC_CCIPR_FDCANSEL_1;   /* kernel clock = PCLK1 */
    RCC->APB1ENR1 |= RCC_APB1ENR1_FDCANEN;
    (void)RCC->APB1ENR1;
    FDCAN1->CCCR |= FDCAN_CCCR_INIT;                        /* off the bus while configuring */
    if (!Can_WaitCccr(FDCAN_CCCR_INIT, FDCAN_CCCR_INIT))
    {
        return;                                             /* stays CAN_CS_UNINIT */
    }
    FDCAN1->CCCR |= FDCAN_CCCR_CCE;                         /* unlock the configuration registers */
    FDCAN1->NBTP = Config->nbtp;
    for (uint32 a = 0U; a < CAN_MRAM_SIZE; a += 4U)          /* the message RAM is not cleared by reset */
    {
        *(volatile uint32*)(SRAMCAN_BASE + a) = 0U;
    }
    FDCAN1->RXGFC = 0U;                                     /* no filters: every standard ID -> FIFO 0 */
    FDCAN1->TXBC = 0U;                                      /* TX elements work as a FIFO */
    if (Config->internalLoopback == TRUE)
    {
        FDCAN1->CCCR |= FDCAN_CCCR_TEST | FDCAN_CCCR_MON;
        FDCAN1->TEST |= FDCAN_TEST_LBCK;
    }
    for (uint8 i = 0U; i < CAN_TX_ELEMS; ++i)
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
        FDCAN1->CCCR &= ~FDCAN_CCCR_INIT;                   /* join the bus after 11 recessive bits */
        if (!Can_WaitCccr(FDCAN_CCCR_INIT, 0U))
        {
            return E_NOT_OK;
        }
    }
    else if ((Transition == CAN_CS_STOPPED) && (Can_State == CAN_CS_STARTED))
    {
        FDCAN1->CCCR |= FDCAN_CCCR_INIT;
        if (!Can_WaitCccr(FDCAN_CCCR_INIT, FDCAN_CCCR_INIT))
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
    const uint32 txfqs = FDCAN1->TXFQS;
    const uint32 put = (txfqs & FDCAN_TXFQS_TFQPI) >> FDCAN_TXFQS_TFQPI_Pos;
    if (((txfqs & FDCAN_TXFQS_TFQF) != 0U) || (put >= CAN_TX_ELEMS) || (Can_TxBusy[put] == TRUE))
    {
        return CAN_BUSY;                                     /* CanIf may buffer and retry */   // «1»
    }
    uint8 d[8] = {0U};
    for (uint8 i = 0U; i < PduInfo->length; ++i)
    {
        d[i] = PduInfo->sdu[i];
    }
    volatile uint32* e = Can_Elem(CAN_MRAM_TXQ, put);
    e[0] = (PduInfo->id & 0x7FFU) << CAN_ELEM_STDID_Pos;    /* standard ID, classic data frame */
    e[1] = (uint32)PduInfo->length << CAN_ELEM_DLC_Pos;
    e[2] = (uint32)d[0] | ((uint32)d[1] << 8) | ((uint32)d[2] << 16) | ((uint32)d[3] << 24);
    e[3] = (uint32)d[4] | ((uint32)d[5] << 8) | ((uint32)d[6] << 16) | ((uint32)d[7] << 24);
    Can_TxPdu[put] = PduInfo->swPduHandle;
    Can_TxBusy[put] = TRUE;
    FDCAN1->TXBAR = 1UL << put;                              /* request transmission */   // «2»
    return E_OK;
}
// [endregion]

// [region:mainfunctions]
FUNC(void, CAN_CODE) Can_MainFunction_Write(void)
{
    const uint32 done = FDCAN1->TXBTO;                       /* one bit per element: sent and acknowledged */
    const uint32 cancelled = FDCAN1->TXBCF;
    for (uint8 m = 0U; m < CAN_TX_ELEMS; ++m)
    {
        const uint32 bit = 1UL << m;
        if ((Can_TxBusy[m] == TRUE) && (((done | cancelled) & bit) != 0U))
        {
            Can_TxBusy[m] = FALSE;
            if ((done & bit) != 0U)
            {
                CanIf_TxConfirmation(Can_TxPdu[m]);          /* acknowledged on the bus */   // «3»
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
    for (uint8 guard = 0U; (guard < 3U) && ((FDCAN1->RXF0S & FDCAN_RXF0S_F0FL) != 0U); ++guard)   /* FIFO depth 3 */
    {
        const uint32 get = (FDCAN1->RXF0S & FDCAN_RXF0S_F0GI) >> FDCAN_RXF0S_F0GI_Pos;
        const volatile uint32* e = Can_Elem(CAN_MRAM_RXF0, get);
        const uint32 w0 = e[0];
        const uint32 w1 = e[1];
        const uint32 lo = e[2];
        const uint32 hi = e[3];
        FDCAN1->RXF0A = get << FDCAN_RXF0A_F0AI_Pos;         /* release the FIFO element */
        if ((w0 & CAN_ELEM_XTD) != 0U)
        {
            continue;                                        /* extended IDs are not configured */
        }
        uint8 data[8];
        for (uint8 i = 0U; i < 4U; ++i)
        {
            data[i] = (uint8)(lo >> (8U * i));
            data[i + 4U] = (uint8)(hi >> (8U * i));
        }
        const Can_HwType mailbox = {(w0 >> CAN_ELEM_STDID_Pos) & 0x7FFU, CanConf_CanHardwareObject_Rx, 0U};
        const uint8 dlc = (uint8)((w1 >> CAN_ELEM_DLC_Pos) & 0xFU);
        const PduInfoType pdu = {data, NULL_PTR, (PduLengthType)((dlc > 8U) ? 8U : dlc)};
        CanIf_RxIndication(&mailbox, &pdu);                  /* up the stack, in task context */   // «4»
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
    const uint32 psr = FDCAN1->PSR;
    *ErrorStatePtr = ((psr & FDCAN_PSR_BO) != 0U)   ? CAN_ERRORSTATE_BUSOFF
                     : ((psr & FDCAN_PSR_EP) != 0U) ? CAN_ERRORSTATE_PASSIVE
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
