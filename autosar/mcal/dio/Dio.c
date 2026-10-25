/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DIODriver
 * In production  : VENDOR-SUPPLIED (MCAL from the silicon vendor)
 */
#include "Dio.h"
#include "stm32f103xb.h"
#if (DIO_DEV_ERROR_DETECT == STD_ON)
#include "Det.h"
#define DIO_DET(api, err) ((void)Det_ReportError(DIO_MODULE_ID, 0U, (api), (err)))
#else
#define DIO_DET(api, err) ((void)0)
#endif

#if (DIO_AR_RELEASE_MAJOR_VERSION != STD_TYPES_AR_RELEASE_MAJOR_VERSION) || \
    (DIO_AR_RELEASE_MINOR_VERSION != STD_TYPES_AR_RELEASE_MINOR_VERSION)
#error "Dio.c: AUTOSAR release of Std_Types.h does not match"
#endif

#define DIO_NUM_PORTS 3U

#define DIO_START_SEC_CODE
#include "Dio_MemMap.h"

static FUNC(GPIO_TypeDef *, DIO_CODE) Dio_Gpio(uint8 port)
{
    static GPIO_TypeDef *const gpio[DIO_NUM_PORTS] = {GPIOA, GPIOB, GPIOC};
    return gpio[port];
}

static FUNC(boolean, DIO_CODE) Dio_ValidChannel(Dio_ChannelType ChannelId, uint8 api)
{
    if ((ChannelId / 16U) >= DIO_NUM_PORTS)
    {
        DIO_DET(api, DIO_E_PARAM_INVALID_CHANNEL_ID);
        return FALSE;
    }
    return TRUE;
}

// [region:channel]
FUNC(Dio_LevelType, DIO_CODE) Dio_ReadChannel(Dio_ChannelType ChannelId)
{
    if (!Dio_ValidChannel(ChannelId, DIO_READCHANNEL_SID))   // «1»
    {
        return STD_LOW;                                   /* the SWS asks for a defined value */   // «2»
    }
    const uint32 bit = 1UL << (ChannelId % 16U);
    return ((Dio_Gpio(ChannelId / 16U)->IDR & bit) != 0U) ? (Dio_LevelType)STD_HIGH : (Dio_LevelType)STD_LOW;
}

FUNC(void, DIO_CODE) Dio_WriteChannel(Dio_ChannelType ChannelId, Dio_LevelType Level)
{
    if (!Dio_ValidChannel(ChannelId, DIO_WRITECHANNEL_SID))
    {
        return;
    }
    const uint32 n = (uint32)ChannelId % 16U;
    Dio_Gpio(ChannelId / 16U)->BSRR = (Level == STD_HIGH) ? (1UL << n) : (1UL << (n + 16U));   /* atomic */   // «3»
}
// [endregion]

FUNC(Dio_PortLevelType, DIO_CODE) Dio_ReadPort(Dio_PortType PortId)
{
    if (PortId >= DIO_NUM_PORTS)
    {
        DIO_DET(DIO_READPORT_SID, DIO_E_PARAM_INVALID_PORT_ID);
        return 0U;
    }
    return (Dio_PortLevelType)(Dio_Gpio(PortId)->IDR & 0xFFFFU);
}

FUNC(void, DIO_CODE) Dio_WritePort(Dio_PortType PortId, Dio_PortLevelType Level)
{
    if (PortId >= DIO_NUM_PORTS)
    {
        DIO_DET(DIO_WRITEPORT_SID, DIO_E_PARAM_INVALID_PORT_ID);
        return;
    }
    Dio_Gpio(PortId)->ODR = Level;
}

FUNC(Dio_LevelType, DIO_CODE) Dio_FlipChannel(Dio_ChannelType ChannelId)
{
    if (!Dio_ValidChannel(ChannelId, DIO_FLIPCHANNEL_SID))
    {
        return STD_LOW;
    }
    const uint32 bit = 1UL << (ChannelId % 16U);
    const Dio_LevelType next = ((Dio_Gpio(ChannelId / 16U)->ODR & bit) != 0U) ? (Dio_LevelType)STD_LOW : (Dio_LevelType)STD_HIGH;
    Dio_WriteChannel(ChannelId, next);
    return next;
}

FUNC(void, DIO_CODE) Dio_GetVersionInfo(P2VAR(Std_VersionInfoType, AUTOMATIC, DIO_APPL_DATA) VersionInfo)
{
    if (VersionInfo == NULL_PTR)
    {
        DIO_DET(DIO_GETVERSIONINFO_SID, DIO_E_PARAM_POINTER);
        return;
    }
    VersionInfo->vendorID = DIO_VENDOR_ID;
    VersionInfo->moduleID = DIO_MODULE_ID;
    VersionInfo->sw_major_version = DIO_SW_MAJOR_VERSION;
    VersionInfo->sw_minor_version = DIO_SW_MINOR_VERSION;
    VersionInfo->sw_patch_version = DIO_SW_PATCH_VERSION;
}

#define DIO_STOP_SEC_CODE
#include "Dio_MemMap.h"
