/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DIODriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Dio on the STM32G4: channels are 16 * port + pin; writes go through GPIOx_BSRR, which sets
 * and clears bits atomically, so no read-modify-write and no critical section is needed
 * (RM0440 "GPIO port bit set/reset register"). Dio has no init function: Port configures the pins.
 * Not supported: channel groups (Dio_ReadChannelGroup / Dio_WriteChannelGroup).
 */
#ifndef DIO_H
#define DIO_H

#include "Std_Types.h"
#include "Dio_Cfg.h"

#define DIO_VENDOR_ID                     0xFFFFU
#define DIO_MODULE_ID                     120U
#define DIO_AR_RELEASE_MAJOR_VERSION      4U
#define DIO_AR_RELEASE_MINOR_VERSION      11U
#define DIO_AR_RELEASE_REVISION_VERSION   0U
#define DIO_SW_MAJOR_VERSION              1U
#define DIO_SW_MINOR_VERSION              0U
#define DIO_SW_PATCH_VERSION              0U

#define DIO_E_PARAM_INVALID_CHANNEL_ID    0x0AU
#define DIO_E_PARAM_INVALID_PORT_ID       0x14U
#define DIO_E_PARAM_POINTER               0x20U
#define DIO_READCHANNEL_SID               0x00U
#define DIO_WRITECHANNEL_SID              0x01U
#define DIO_READPORT_SID                  0x02U
#define DIO_WRITEPORT_SID                 0x03U
#define DIO_FLIPCHANNEL_SID               0x11U
#define DIO_GETVERSIONINFO_SID            0x12U

typedef uint8 Dio_ChannelType;
typedef uint8 Dio_PortType;
typedef uint8 Dio_LevelType;              /* STD_HIGH or STD_LOW */
typedef uint16 Dio_PortLevelType;

#define DIO_START_SEC_CODE
#include "Dio_MemMap.h"
FUNC(Dio_LevelType, DIO_CODE) Dio_ReadChannel(Dio_ChannelType ChannelId);
FUNC(void, DIO_CODE) Dio_WriteChannel(Dio_ChannelType ChannelId, Dio_LevelType Level);
FUNC(Dio_PortLevelType, DIO_CODE) Dio_ReadPort(Dio_PortType PortId);
FUNC(void, DIO_CODE) Dio_WritePort(Dio_PortType PortId, Dio_PortLevelType Level);
FUNC(Dio_LevelType, DIO_CODE) Dio_FlipChannel(Dio_ChannelType ChannelId);
FUNC(void, DIO_CODE) Dio_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, DIO_APPL_DATA) VersionInfo);
#define DIO_STOP_SEC_CODE
#include "Dio_MemMap.h"

#endif
