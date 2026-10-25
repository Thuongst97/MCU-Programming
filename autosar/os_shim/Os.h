/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * NOT A REAL AUTOSAR OS: an OSEK/AUTOSAR-OS-like API implemented over FreeRTOS.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_OS (API names from OSEK/VDX OS 2.2.3, ISO 17356-3)
 * In production  : VENDOR-SUPPLIED (a certified AUTOSAR OS), configuration GENERATED
 *
 * Mapping: basic task -> FreeRTOS task waiting for a task notification; extended task ->
 * FreeRTOS task with an event group; alarm -> FreeRTOS software timer on the 1 ms tick;
 * resource -> mutex. Differences from a real AUTOSAR OS (autosar-os-com.html#os-concepts):
 * no conformance classes, activation limit 1, priority inheritance instead of the OSEK
 * priority ceiling, no protection hooks, timing protection, OS-Applications or IOC, no
 * non-preemptive tasks or Schedule(), and TerminateTask() returns (it must be the last call).
 */
#ifndef OS_H
#define OS_H

#include "Std_Types.h"
#include "Os_Cfg.h"

#define OS_VENDOR_ID                      0xFFFFU
#define OS_MODULE_ID                      1U
#define OS_AR_RELEASE_MAJOR_VERSION       4U
#define OS_AR_RELEASE_MINOR_VERSION       11U
#define OS_AR_RELEASE_REVISION_VERSION    0U
#define OS_SW_MAJOR_VERSION               1U
#define OS_SW_MINOR_VERSION               0U
#define OS_SW_PATCH_VERSION               0U

/* StatusType values (OSEK) */
#define E_OS_ACCESS       ((StatusType)1U)
#define E_OS_CALLEVEL     ((StatusType)2U)
#define E_OS_ID           ((StatusType)3U)
#define E_OS_LIMIT        ((StatusType)4U)
#define E_OS_NOFUNC       ((StatusType)5U)
#define E_OS_RESOURCE     ((StatusType)6U)
#define E_OS_STATE        ((StatusType)7U)
#define E_OS_VALUE        ((StatusType)8U)
#define E_OS_STACKFAULT   ((StatusType)12U)   /* shim: stack overflow detected by the kernel */

typedef uint8 TaskType;
typedef TaskType *TaskRefType;
typedef uint32 EventMaskType;
typedef EventMaskType *EventMaskRefType;
typedef uint8 AlarmType;
typedef uint32 TickType;
typedef uint8 ResourceType;
typedef uint8 AppModeType;

#define OSDEFAULTAPPMODE  ((AppModeType)0U)
#define INVALID_TASK      ((TaskType)0xFFU)

#define TASK(name)            void OsTask_##name(void)
#define ALARMCALLBACK(name)   void OsAlarmCallback_##name(void)
#define DeclareTask(name)     extern void OsTask_##name(void)
#define DeclareAlarm(name)
#define DeclareEvent(name)
#define DeclareResource(name)

typedef enum { OS_ALARM_ACTIVATETASK = 0, OS_ALARM_SETEVENT, OS_ALARM_CALLBACK } Os_AlarmActionType;

typedef struct
{
    P2CONST(char, TYPEDEF, OS_CONST) name;
    P2FUNC(void, OS_CODE, entry)(void);
    uint8 priority;                       /* higher = more important, as in OSEK */
    boolean extended;                     /* may wait for events */
    boolean autostart;
} Os_TaskConfigType;

typedef struct
{
    Os_AlarmActionType action;
    TaskType task;
    EventMaskType event;
    P2FUNC(void, OS_CODE, callback)(void);
} Os_AlarmConfigType;

extern CONST(Os_TaskConfigType, OS_CONST) Os_TaskConfig[OS_NUM_TASKS];
extern CONST(Os_AlarmConfigType, OS_CONST) Os_AlarmConfig[OS_NUM_ALARMS];

void StartOS(AppModeType Mode);
void ShutdownOS(StatusType Error);
StatusType ActivateTask(TaskType TaskID);
StatusType TerminateTask(void);
StatusType ChainTask(TaskType TaskID);
StatusType GetTaskID(TaskRefType TaskID);
StatusType SetRelAlarm(AlarmType AlarmID, TickType increment, TickType cycle);
StatusType CancelAlarm(AlarmType AlarmID);
StatusType SetEvent(TaskType TaskID, EventMaskType Mask);
StatusType ClearEvent(EventMaskType Mask);
StatusType GetEvent(TaskType TaskID, EventMaskRefType Event);
StatusType WaitEvent(EventMaskType Mask);
StatusType GetResource(ResourceType ResID);
StatusType ReleaseResource(ResourceType ResID);
void SuspendAllInterrupts(void);
void ResumeAllInterrupts(void);

/* Hooks implemented by the integrator when enabled in Os_Cfg.h */
void ShutdownHook(StatusType Error);
void Os_AssertFailed(const char *file, int line);   /* configASSERT of the kernel underneath */
void ErrorHook(StatusType Error);

#endif
