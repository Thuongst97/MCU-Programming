# AUTOSAR self-review log (PLAN.md §8.5, CLAUDE.md "AUTOSAR self-review checklist")

## Status: requirement IDs pending

The AUTOSAR R25-11 PDFs could not be opened from the environment in which Phases 6–7 were
written (the build sandbox's network policy blocks autosar.org). CLAUDE.md rule 13b says requirement
IDs are **copied from the PDF and never made up**, so **no `SWS_`/`SRS_` ID is cited anywhere yet**,
and `tools/autosar-ids.txt` is still empty.

What was done instead, so the gap is visible and can be closed item by item:

- Every AUTOSAR page shows a "Verification status" note saying that APIs, types, values and
  behaviour are written from the R4.x-era specifications as the authors know them and are being
  checked against R25-11.
- Every file in `autosar/` and `capstone/turnlight/stage3-autosar/` carries the banner with its
  document name (`AUTOSAR_CP_SWS_<Module>`), so the document to check is always named.
- The table below lists every item that needs an ID. Close an item by copying the ID from the
  R25-11 PDF into `tools/autosar-ids.txt` (ID · document · section/page · date read), citing it on
  the page, and setting the row to ✅ with the date.

## Items to verify against R25-11

| # | Item | Where it appears | Document (R25-11) | ID | Checked | R4.x box needed? |
|---|---|---|---|---|---|---|
| 1 | `Std_ReturnType`, `E_OK`, `E_NOT_OK`, `STD_HIGH/LOW`, `STD_ON/OFF`, `Std_VersionInfoType` | `autosar/include/Std_Types.h`, autosar-mcal.html#std-types | AUTOSAR_CP_SWS_StandardTypes | pending | ⏳ | no |
| 2 | Platform types (`uint8` … `boolean`, `TRUE/FALSE`, `CPU_TYPE`, byte/bit order) | `Platform_Types.h`, #std-types | AUTOSAR_CP_SWS_PlatformTypes | pending | ⏳ | no |
| 3 | Compiler abstraction macro set and parameters (`FUNC`, `P2VAR`, `P2CONST`, `CONSTP2VAR`, `VAR`, `CONST`) | `Compiler.h`, #memmap | AUTOSAR_CP_SWS_CompilerAbstraction | pending | ⏳ | **likely**: newer releases simplified some macros; confirm |
| 4 | MemMap: `<MSN>_START_SEC_<X>` / `STOP` naming and section names | every BSW file, #memmap | AUTOSAR_CP_SWS_MemoryMapping | pending | ⏳ | no |
| 5 | `Det_ReportError` signature, DET module ID 15 | `Det.h`, #det | AUTOSAR_CP_SWS_DefaultErrorTracer | pending | ⏳ | no |
| 6 | Dio API set, no `Dio_Init`, DET error values (0x0A, 0x14, 0x20) and service IDs | `Dio.h`, #dio-port | AUTOSAR_CP_SWS_DIODriver | pending | ⏳ | no |
| 7 | Port API, `Port_Init` behaviour, DET error values, module ID 124 | `Port.h` | AUTOSAR_CP_SWS_PortDriver | pending | ⏳ | no |
| 8 | Pwm duty scale 0x0000–0x8000, API, DET values, module ID 121 | `Pwm.h`, #pwm-adc-gpt | AUTOSAR_CP_SWS_PWMDriver | pending | ⏳ | no |
| 9 | Adc group API, `Adc_StatusType` values, one-shot status sequence, DET values | `Adc.h` | AUTOSAR_CP_SWS_ADCDriver | pending | ⏳ | no |
| 10 | Mcu API (`Mcu_InitClock`, `Mcu_DistributePllClock`, PLL status, reset reason), DET values | `Mcu.h` | AUTOSAR_CP_SWS_MCUDriver | pending | ⏳ | no |
| 11 | Wdg API (`Wdg_SetMode`, `Wdg_SetTriggerCondition`), trigger-from-Gpt behaviour, DET values | `Wdg.h`, #can-wdg | AUTOSAR_CP_SWS_WatchdogDriver | pending | ⏳ | no |
| 12 | Can API, `Can_PduType`, `Can_HwType`, `Can_ControllerStateType`, `CAN_BUSY`, main functions, DET values | `Can.h`, `Can_GeneralTypes.h` | AUTOSAR_CP_SWS_CANDriver | pending | ⏳ | **yes**: R4.0–4.2 used `Can_ReturnType` and `Can_StateTransitionType` |
| 13 | CanIf API and callbacks (`CanIf_RxIndication(Mailbox, PduInfoPtr)`) | `CanIf.h`, `CanIf_Cbk.h` | AUTOSAR_CP_SWS_CANInterface | pending | ⏳ | **yes**: older RxIndication signature (Hrh, CanId, Dlc, SduPtr) |
| 14 | PduR API (`PduR_ComTransmit`, `PduR_CanIfRxIndication`, TX confirmation with result) | `PduR_*.h` | AUTOSAR_CP_SWS_PDURouter | pending | ⏳ | **yes**: TxConfirmation without `result` before R4.4 |
| 15 | Com API, return values `COM_SERVICE_NOT_AVAILABLE`/`COM_BUSY`, deadline monitoring, mixed TX mode | `Com.h` | AUTOSAR_CP_SWS_COM | pending | ⏳ | no |
| 16 | `PduInfoType` members, `PduIdType`, `PduLengthType` | `ComStack_Types.h` | AUTOSAR_CP_SWS_CommunicationStackTypes | pending | ⏳ | **yes**: `MetaDataPtr` added in R4.3 |
| 17 | Dem API (`Dem_SetEventStatus`, `Dem_GetEventUdsStatus`), event status values, UDS status bits | `Dem.h`, autosar-diag-nvm.html#dem | AUTOSAR_CP_SWS_DiagnosticEventManager; ISO 14229-1 | pending | ⏳ | **yes**: `Dem_GetEventStatus` before R4.4 |
| 18 | WdgM alive supervision, `WdgM_CheckpointReached`, status types | `WdgM.h` | AUTOSAR_CP_SWS_WatchdogManager | pending | ⏳ | **yes**: checkpoint API changed in R4.x |
| 19 | WdgIf mode type and API | `WdgIf.h` | AUTOSAR_CP_SWS_WatchdogInterface | pending | ⏳ | no |
| 20 | EcuM init sequence (init lists zero/one/two, `EcuM_StartupTwo`) | `EcuM.c`, autosar-os-com.html#ecum | AUTOSAR_CP_SWS_ECUStateManager | pending | ⏳ | **yes**: flexible vs fixed EcuM |
| 21 | OS API names, `StatusType` values, task states, alarms, events, resources | `Os.h`, autosar-os-com.html#os-concepts | AUTOSAR_CP_SWS_OS (+ ISO 17356-3) | pending | ⏳ | no |
| 22 | RTE API names (`Rte_Read/Write/Call/IRead`), return codes (`RTE_E_OK`, `RTE_E_MAX_AGE_EXCEEDED`), VFB trace hook names | `rte/`, autosar-swc.html | AUTOSAR_CP_SWS_RTE | pending | ⏳ | no |
| 23 | Module IDs used in the version macros (Det 15, Mcu 101, Port 124, Dio 120, Pwm 121, Adc 123, Wdg 102, Can 80, CanIf 60, PduR 51, Com 50, Dem 54, WdgM 13, WdgIf 43, EcuM 10, Os 1, IoHwAb 254) | every module header | AUTOSAR_CP_TR_BSWModuleList | pending | ⏳ | no |
| 24 | AR release version macros `4.11.0` for R25-11 | every module header | AUTOSAR_CP_TR_ReleaseOverview | pending | ⏳ | no |
| 25 | Layered architecture terms (ASW, RTE, Services, ECU abstraction, MCAL, CDD) | autosar-arch.html | AUTOSAR_CP_EXP_LayeredSoftwareArchitecture | pending | ⏳ | no |
| 26 | Methodology terms (ECU extract, ECU configuration, ARXML) | autosar-arch.html#methodology | AUTOSAR_CP_TR_Methodology | pending | ⏳ | no |

## Checklist status per page and module

| Page / module | Banner | Citations | IDs | API match | MemMap | DET/DEM | R4.x boxes | check-autosar | MISRA | No copied text |
|---|---|---|---|---|---|---|---|---|---|---|
| `autosar/` (all modules) | ✅ | ✅ document names | ⏳ | ⏳ (pending PDF) | ✅ | ✅ | — | ✅ | ✅ (DEV-001..005) | ✅ |
| `stage3-autosar/` | ✅ | ✅ | ⏳ | ⏳ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| autosar-arch.html … autosar-review.html, capstone-autosar.html | — | ✅ document names | ⏳ | ⏳ | — | — | ✅ where known | — | — | ✅ |
