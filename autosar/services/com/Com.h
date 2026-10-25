/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_COM
 * In production  : VENDOR-SUPPLIED (BSW stack vendor), signal/I-PDU tables GENERATED from the CAN matrix
 *
 * Com-lite: unsigned signals of 1..8 bits, little-endian bit positions, packed into I-PDUs of up
 * to 8 bytes. TX I-PDUs are sent periodically and, for signals with the "triggered on change"
 * property, at once when the value changes (mixed mode). RX I-PDUs have deadline monitoring
 * with a timeout notification. Left out: signal groups, big-endian signals, gateways, update
 * bits, filters, minimum delay time, I-PDU groups, invalidation, TP.
 */
#ifndef COM_H
#define COM_H

#include "ComStack_Types.h"
#include "Com_Cfg.h"

#define COM_VENDOR_ID                     0xFFFFU
#define COM_MODULE_ID                     50U
#define COM_AR_RELEASE_MAJOR_VERSION      4U
#define COM_AR_RELEASE_MINOR_VERSION      11U
#define COM_AR_RELEASE_REVISION_VERSION   0U
#define COM_SW_MAJOR_VERSION              1U
#define COM_SW_MINOR_VERSION              0U
#define COM_SW_PATCH_VERSION              0U

#define COM_SERVICE_NOT_AVAILABLE         0x80U
#define COM_BUSY                          0x81U
#define COM_E_PARAM                       0x01U
#define COM_E_UNINIT                      0x02U
#define COM_E_PARAM_POINTER               0x03U
#define COM_SENDSIGNAL_SID                0x0AU
#define COM_RECEIVESIGNAL_SID             0x0BU

typedef uint16 Com_SignalIdType;

typedef enum { COM_TX = 0, COM_RX } Com_DirectionType;

typedef struct
{
    PduIdType ipdu;
    uint8 bitPosition;                    /* LSB of the signal inside the I-PDU (little-endian) */
    uint8 bitSize;                        /* 1..8 */
    boolean triggeredOnChange;            /* TX: a new value sends the I-PDU at once */
} Com_SignalConfigType;

typedef struct
{
    Com_DirectionType direction;
    uint8 length;                         /* bytes */
    PduIdType lowerPduId;                 /* PduR handle */
    uint16 periodMs;                      /* TX: cycle time */
    uint16 timeoutMs;                     /* RX: deadline; 0 = not monitored */
    P2FUNC(void, COM_APPL_CODE, timeoutNotification)(void);    /* RX deadline missed */
    P2FUNC(void, COM_APPL_CODE, rxNotification)(void);         /* RX I-PDU received */
    P2FUNC(boolean, COM_APPL_CODE, txCallout)(PduIdType id, P2VAR(PduInfoType, AUTOMATIC, COM_APPL_DATA) pdu);
} Com_IPduConfigType;

typedef struct
{
    P2CONST(Com_SignalConfigType, TYPEDEF, COM_APPL_CONST) signals;
    uint16 numSignals;
    P2CONST(Com_IPduConfigType, TYPEDEF, COM_APPL_CONST) ipdus;
    uint16 numIPdus;
    uint16 mainFunctionPeriodMs;
} Com_ConfigType;

#define COM_START_SEC_CODE
#include "Com_MemMap.h"
FUNC(void, COM_CODE) Com_Init(P2CONST(Com_ConfigType, AUTOMATIC, COM_APPL_CONST) config);
FUNC(uint8, COM_CODE) Com_SendSignal(Com_SignalIdType SignalId, P2CONST(void, AUTOMATIC, COM_APPL_DATA) SignalDataPtr);
FUNC(uint8, COM_CODE) Com_ReceiveSignal(Com_SignalIdType SignalId, P2VAR(void, AUTOMATIC, COM_APPL_DATA) SignalDataPtr);
FUNC(void, COM_CODE) Com_MainFunctionTx(void);
FUNC(void, COM_CODE) Com_MainFunctionRx(void);
#define COM_STOP_SEC_CODE
#include "Com_MemMap.h"

extern CONST(Com_ConfigType, COM_CONST) Com_Config;

#endif
