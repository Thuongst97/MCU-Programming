/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_COM
 * In production  : VENDOR-SUPPLIED (BSW stack vendor)
 */
#include "Com.h"
#include "Com_Cbk.h"
#include "PduR_Com.h"
#include "SchM_Com.h"
#if (COM_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define COM_DET(api, err) ((void)Det_ReportError(COM_MODULE_ID, 0U, (api), (err)))
#else
#define COM_DET(api, err) ((void)0)
#endif

typedef struct
{
    uint8 data[8];
    uint16 timerMs;                       /* TX: until the next periodic send; RX: since the last frame */
    boolean pending;                      /* TX: send at the next main function */
    boolean timedOut;                     /* RX: deadline missed and reported */
} Com_IPduStateType;

#define COM_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Com_MemMap.h"
static P2CONST(Com_ConfigType, COM_VAR, COM_APPL_CONST) Com_ConfigPtr;
static VAR(Com_IPduStateType, COM_VAR) Com_IPdu[COM_MAX_IPDUS];
#define COM_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Com_MemMap.h"

#define COM_START_SEC_CODE
#include "Com_MemMap.h"

FUNC(void, COM_CODE) Com_Init(P2CONST(Com_ConfigType, AUTOMATIC, COM_APPL_CONST) config)
{
    if (config == NULL_PTR)
    {
        COM_DET(0x01U, COM_E_PARAM_POINTER);
        return;
    }
    for (uint16 i = 0U; i < config->numIPdus; ++i)
    {
        for (uint8 b = 0U; b < 8U; ++b)
        {
            Com_IPdu[i].data[b] = 0U;                       /* init values: all signals 0 */
        }
        Com_IPdu[i].timerMs = 0U;
        Com_IPdu[i].pending = FALSE;
        Com_IPdu[i].timedOut = FALSE;
    }
    Com_ConfigPtr = config;
}

// [region:pack]
FUNC(uint8, COM_CODE) Com_SendSignal(Com_SignalIdType SignalId, P2CONST(void, AUTOMATIC, COM_APPL_DATA) SignalDataPtr)
{
    if (Com_ConfigPtr == NULL_PTR)
    {
        COM_DET(COM_SENDSIGNAL_SID, COM_E_UNINIT);
        return COM_SERVICE_NOT_AVAILABLE;
    }
    if ((SignalId >= Com_ConfigPtr->numSignals) || (SignalDataPtr == NULL_PTR))
    {
        COM_DET(COM_SENDSIGNAL_SID, (SignalDataPtr == NULL_PTR) ? COM_E_PARAM_POINTER : COM_E_PARAM);
        return COM_SERVICE_NOT_AVAILABLE;
    }
    P2CONST(Com_SignalConfigType, AUTOMATIC, COM_APPL_CONST) s = &Com_ConfigPtr->signals[SignalId];
    const uint32 mask = (1UL << s->bitSize) - 1U;
    // cppcheck-suppress misra-c2012-11.5 ; DEV-002
    const uint32 value = (uint32)(*(const uint8 *)SignalDataPtr) & mask;     /* 1..8 bit unsigned */
    P2VAR(uint8, AUTOMATIC, COM_VAR) d = Com_IPdu[s->ipdu].data;
    SchM_Enter_Com_COM_EXCLUSIVE_AREA_0();                                     /* vs. the main function */
    uint32 word = (uint32)d[0] | ((uint32)d[1] << 8U) | ((uint32)d[2] << 16U) | ((uint32)d[3] << 24U);   /* bytes 0..3 */
    const uint32 old = (word >> s->bitPosition) & mask;
    word = (word & ~(mask << s->bitPosition)) | (value << s->bitPosition);
    d[0] = (uint8)word;
    d[1] = (uint8)(word >> 8U);
    d[2] = (uint8)(word >> 16U);
    d[3] = (uint8)(word >> 24U);
    if ((s->triggeredOnChange == TRUE) && (old != value))
    {
        Com_IPdu[s->ipdu].pending = TRUE;                                     /* mixed mode: send now */
    }
    SchM_Exit_Com_COM_EXCLUSIVE_AREA_0();
    return E_OK;
}

FUNC(uint8, COM_CODE) Com_ReceiveSignal(Com_SignalIdType SignalId, P2VAR(void, AUTOMATIC, COM_APPL_DATA) SignalDataPtr)
{
    if (Com_ConfigPtr == NULL_PTR)
    {
        COM_DET(COM_RECEIVESIGNAL_SID, COM_E_UNINIT);
        return COM_SERVICE_NOT_AVAILABLE;
    }
    if ((SignalId >= Com_ConfigPtr->numSignals) || (SignalDataPtr == NULL_PTR))
    {
        COM_DET(COM_RECEIVESIGNAL_SID, (SignalDataPtr == NULL_PTR) ? COM_E_PARAM_POINTER : COM_E_PARAM);
        return COM_SERVICE_NOT_AVAILABLE;
    }
    P2CONST(Com_SignalConfigType, AUTOMATIC, COM_APPL_CONST) s = &Com_ConfigPtr->signals[SignalId];
    P2CONST(uint8, AUTOMATIC, COM_VAR) d = Com_IPdu[s->ipdu].data;
    SchM_Enter_Com_COM_EXCLUSIVE_AREA_0();
    const uint32 word = (uint32)d[0] | ((uint32)d[1] << 8) | ((uint32)d[2] << 16) | ((uint32)d[3] << 24);
    SchM_Exit_Com_COM_EXCLUSIVE_AREA_0();
    // cppcheck-suppress misra-c2012-11.5 ; DEV-002
    *(uint8 *)SignalDataPtr = (uint8)((word >> s->bitPosition) & ((1UL << s->bitSize) - 1U));
    return E_OK;
}
// [endregion]

// [region:main]
FUNC(void, COM_CODE) Com_MainFunctionTx(void)
{
    if (Com_ConfigPtr == NULL_PTR)
    {
        return;
    }
    for (uint16 i = 0U; i < Com_ConfigPtr->numIPdus; ++i)
    {
        P2CONST(Com_IPduConfigType, AUTOMATIC, COM_APPL_CONST) c = &Com_ConfigPtr->ipdus[i];
        if (c->direction != COM_TX)
        {
            continue;
        }
        Com_IPdu[i].timerMs += Com_ConfigPtr->mainFunctionPeriodMs;
        if ((Com_IPdu[i].pending == TRUE) || (Com_IPdu[i].timerMs >= c->periodMs))       /* on change or cycle */
        {
            uint8 copy[8];
            SchM_Enter_Com_COM_EXCLUSIVE_AREA_0();
            for (uint8 b = 0U; b < 8U; ++b)
            {
                copy[b] = Com_IPdu[i].data[b];
            }
            Com_IPdu[i].pending = FALSE;
            SchM_Exit_Com_COM_EXCLUSIVE_AREA_0();
            PduInfoType pdu = {copy, NULL_PTR, c->length};
            if ((c->txCallout == NULL_PTR) || (c->txCallout((PduIdType)i, &pdu) == TRUE))   /* e.g. alive counter */
            {
                (void)PduR_ComTransmit(c->lowerPduId, &pdu);                    /* refused: next cycle repeats */
            }
            Com_IPdu[i].timerMs = 0U;
        }
    }
}

FUNC(void, COM_CODE) Com_MainFunctionRx(void)
{
    if (Com_ConfigPtr == NULL_PTR)
    {
        return;
    }
    for (uint16 i = 0U; i < Com_ConfigPtr->numIPdus; ++i)
    {
        P2CONST(Com_IPduConfigType, AUTOMATIC, COM_APPL_CONST) c = &Com_ConfigPtr->ipdus[i];
        if ((c->direction != COM_RX) || (c->timeoutMs == 0U) || (Com_IPdu[i].timedOut == TRUE))
        {
            continue;
        }
        SchM_Enter_Com_COM_EXCLUSIVE_AREA_0();
        Com_IPdu[i].timerMs += Com_ConfigPtr->mainFunctionPeriodMs;
        const boolean expired = (Com_IPdu[i].timerMs >= c->timeoutMs) ? TRUE : FALSE;
        SchM_Exit_Com_COM_EXCLUSIVE_AREA_0();
        if (expired == TRUE)                                                   /* deadline monitoring */
        {
            Com_IPdu[i].timedOut = TRUE;
            if (c->timeoutNotification != NULL_PTR)
            {
                c->timeoutNotification();                                      /* e.g. into the RTE */
            }
        }
    }
}
// [endregion]

FUNC(void, COM_CODE) Com_RxIndication(PduIdType RxPduId, P2CONST(PduInfoType, AUTOMATIC, COM_APPL_DATA) PduInfoPtr)
{
    if ((Com_ConfigPtr == NULL_PTR) || (RxPduId >= Com_ConfigPtr->numIPdus) || (PduInfoPtr == NULL_PTR))
    {
        return;
    }
    P2CONST(Com_IPduConfigType, AUTOMATIC, COM_APPL_CONST) c = &Com_ConfigPtr->ipdus[RxPduId];
    SchM_Enter_Com_COM_EXCLUSIVE_AREA_0();
    for (uint8 b = 0U; (b < c->length) && (b < PduInfoPtr->SduLength); ++b)
    {
        Com_IPdu[RxPduId].data[b] = PduInfoPtr->SduDataPtr[b];
    }
    Com_IPdu[RxPduId].timerMs = 0U;                                           /* deadline restarts */
    Com_IPdu[RxPduId].timedOut = FALSE;
    SchM_Exit_Com_COM_EXCLUSIVE_AREA_0();
    if (c->rxNotification != NULL_PTR)
    {
        c->rxNotification();
    }
}

FUNC(void, COM_CODE) Com_TxConfirmation(PduIdType TxPduId, Std_ReturnType result)
{
    (void)TxPduId;                                                             /* no TX deadline monitoring in Com-lite */
    (void)result;
}

#define COM_STOP_SEC_CODE
#include "Com_MemMap.h"
