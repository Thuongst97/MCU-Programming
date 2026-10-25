/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_ADCDriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 *
 * Adc-lite on ADC1 (RM0008 §11): one-shot, software-triggered groups, converted channel by
 * channel and advanced by polling in Adc_GetGroupStatus (no interrupts, no DMA).
 * Not supported: hardware triggers, continuous and streaming modes, priorities, notifications,
 * Adc_EnableHardwareTrigger, power-state control.
 */
#ifndef ADC_H
#define ADC_H

#include "Std_Types.h"
#include "Adc_Cfg.h"

#define ADC_VENDOR_ID                     0xFFFFU
#define ADC_MODULE_ID                     123U
#define ADC_AR_RELEASE_MAJOR_VERSION      4U
#define ADC_AR_RELEASE_MINOR_VERSION      11U
#define ADC_AR_RELEASE_REVISION_VERSION   0U
#define ADC_SW_MAJOR_VERSION              1U
#define ADC_SW_MINOR_VERSION              0U
#define ADC_SW_PATCH_VERSION              0U

#define ADC_E_UNINIT                      0x0AU
#define ADC_E_BUSY                        0x0BU
#define ADC_E_IDLE                        0x0CU
#define ADC_E_ALREADY_INITIALIZED         0x0DU
#define ADC_E_PARAM_POINTER               0x14U
#define ADC_E_PARAM_GROUP                 0x15U
#define ADC_E_BUFFER_UNINIT               0x19U
#define ADC_INIT_SID                      0x00U
#define ADC_STARTGROUPCONVERSION_SID      0x02U
#define ADC_READGROUP_SID                 0x04U
#define ADC_GETGROUPSTATUS_SID            0x09U
#define ADC_GETVERSIONINFO_SID            0x0AU
#define ADC_SETUPRESULTBUFFER_SID         0x0CU

typedef uint8 Adc_GroupType;
typedef uint8 Adc_ChannelType;
typedef uint16 Adc_ValueGroupType;
typedef enum { ADC_IDLE = 0, ADC_BUSY, ADC_COMPLETED, ADC_STREAM_COMPLETED } Adc_StatusType;

typedef struct
{
    P2CONST(Adc_ChannelType, TYPEDEF, ADC_APPL_CONST) channels;
    uint8 numChannels;
} Adc_GroupDefType;

typedef struct
{
    P2CONST(Adc_GroupDefType, TYPEDEF, ADC_APPL_CONST) groups;
    uint8 numGroups;
    uint8 sampleTime;                     /* ADC_SMPRx code 0..7, same for every channel */
} Adc_ConfigType;

#define ADC_START_SEC_CODE
#include "Adc_MemMap.h"
FUNC(void, ADC_CODE) Adc_Init(P2CONST(Adc_ConfigType, AUTOMATIC, ADC_APPL_CONST) ConfigPtr);
FUNC(Std_ReturnType, ADC_CODE) Adc_SetupResultBuffer(Adc_GroupType Group,
                                                     P2VAR(Adc_ValueGroupType, AUTOMATIC, ADC_APPL_DATA) DataBufferPtr);
FUNC(void, ADC_CODE) Adc_StartGroupConversion(Adc_GroupType Group);
FUNC(Adc_StatusType, ADC_CODE) Adc_GetGroupStatus(Adc_GroupType Group);
FUNC(Std_ReturnType, ADC_CODE) Adc_ReadGroup(Adc_GroupType Group,
                                             P2VAR(Adc_ValueGroupType, AUTOMATIC, ADC_APPL_DATA) DataBufferPtr);
FUNC(void, ADC_CODE) Adc_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, ADC_APPL_DATA) versioninfo);
#define ADC_STOP_SEC_CODE
#include "Adc_MemMap.h"

extern CONST(Adc_ConfigType, ADC_CONST) Adc_Config;

#endif
