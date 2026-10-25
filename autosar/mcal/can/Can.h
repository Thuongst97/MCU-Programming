/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CANDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Can-lite on bxCAN (RM0008 §24), one controller, polling mode: one HTH over the three transmit
 * mailboxes, one HRH on FIFO 0 accepting every standard ID. Can_MainFunction_Write/_Read do the
 * work and call CanIf; there is no interrupt. Not supported: extended IDs, CAN FD, wake-up,
 * Can_SetBaudrate, Can_MainFunction_Mode (mode changes complete synchronously, with a timeout).
 */
#ifndef CAN_H
#define CAN_H

#include "Std_Types.h"
#include "Can_GeneralTypes.h"
#include "Can_Cfg.h"

#define CAN_VENDOR_ID                     0xFFFFU
#define CAN_MODULE_ID                     80U
#define CAN_AR_RELEASE_MAJOR_VERSION      4U
#define CAN_AR_RELEASE_MINOR_VERSION      11U
#define CAN_AR_RELEASE_REVISION_VERSION   0U
#define CAN_SW_MAJOR_VERSION              1U
#define CAN_SW_MINOR_VERSION              0U
#define CAN_SW_PATCH_VERSION              0U

#define CAN_E_PARAM_POINTER               0x01U
#define CAN_E_PARAM_HANDLE                0x02U
#define CAN_E_PARAM_DATA_LENGTH           0x03U
#define CAN_E_PARAM_CONTROLLER            0x04U
#define CAN_E_UNINIT                      0x05U
#define CAN_E_TRANSITION                  0x06U
#define CAN_INIT_SID                      0x00U
#define CAN_MAINFUNCTION_WRITE_SID        0x01U
#define CAN_SETCONTROLLERMODE_SID         0x03U
#define CAN_WRITE_SID                     0x06U
#define CAN_GETVERSIONINFO_SID            0x07U
#define CAN_MAINFUNCTION_READ_SID         0x08U
#define CAN_GETCONTROLLERERRORSTATE_SID   0x11U

typedef struct
{
    uint32 btr;                           /* CAN_BTR: bit timing (module 12's calculator) */
    boolean silentLoopback;               /* self-test without a bus */
} Can_ConfigType;

#define CAN_START_SEC_CODE
#include "Can_MemMap.h"
FUNC(void, CAN_CODE) Can_Init(P2CONST(Can_ConfigType, AUTOMATIC, CAN_APPL_CONST) Config);
FUNC(Std_ReturnType, CAN_CODE) Can_SetControllerMode(uint8 Controller, Can_ControllerStateType Transition);
FUNC(Std_ReturnType, CAN_CODE) Can_Write(Can_HwHandleType Hth, P2CONST(Can_PduType, AUTOMATIC, CAN_APPL_DATA) PduInfo);
FUNC(Std_ReturnType, CAN_CODE) Can_GetControllerErrorState(uint8 ControllerId,
                                                            P2VAR(Can_ErrorStateType, AUTOMATIC, CAN_APPL_DATA) ErrorStatePtr);
FUNC(void, CAN_CODE) Can_MainFunction_Write(void);
FUNC(void, CAN_CODE) Can_MainFunction_Read(void);
FUNC(void, CAN_CODE) Can_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, CAN_APPL_DATA) versioninfo);
#define CAN_STOP_SEC_CODE
#include "Can_MemMap.h"

extern CONST(Can_ConfigType, CAN_CONST) Can_Config;

#endif
