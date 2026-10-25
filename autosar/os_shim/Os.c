/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * NOT A REAL AUTOSAR OS: an OSEK/AUTOSAR-OS-like API implemented over FreeRTOS.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_OS
 * In production  : VENDOR-SUPPLIED (a certified AUTOSAR OS)
 */
#include "Os.h"

#include "FreeRTOS.h"
#include "event_groups.h"
#include "semphr.h"
#include "task.h"
#include "timers.h"

typedef struct
{
    StaticTask_t tcb;
    StackType_t stack[OS_STACK_WORDS];
    TaskHandle_t handle;
    StaticEventGroup_t eventsMem;
    EventGroupHandle_t events;
    volatile boolean activated;           /* activation limit 1 */
    volatile boolean rechain;             /* ChainTask() on itself */
} Os_TaskStateType;

static Os_TaskStateType Os_Task[OS_NUM_TASKS];
static StaticTimer_t Os_TimerMem[OS_NUM_ALARMS];
static TimerHandle_t Os_Timer[OS_NUM_ALARMS];
static TickType Os_AlarmCycle[OS_NUM_ALARMS];
static boolean Os_AlarmFirst[OS_NUM_ALARMS];
#if (OS_NUM_RESOURCES > 0U)
static StaticSemaphore_t Os_ResourceMem[OS_NUM_RESOURCES];
static SemaphoreHandle_t Os_Resource[OS_NUM_RESOURCES];
#endif

static StatusType Os_Error(StatusType e)
{
#if (OS_USE_ERRORHOOK == STD_ON)
    if (e != E_OK)
    {
        ErrorHook(e);
    }
#endif
    return e;
}

static TaskType Os_Current(void)
{
    const TaskHandle_t self = xTaskGetCurrentTaskHandle();
    for (TaskType t = 0U; t < OS_NUM_TASKS; ++t)
    {
        if (Os_Task[t].handle == self)
        {
            return t;
        }
    }
    return INVALID_TASK;                  /* a FreeRTOS-internal task, e.g. the timer service */
}

// [region:task]
static void Os_TaskEntry(void *arg)
{
    // cppcheck-suppress misra-c2012-11.6 ; DEV-003
    const TaskType t = (TaskType)(uintptr_t)arg;
    P2CONST(Os_TaskConfigType, AUTOMATIC, OS_CONST) c = &Os_TaskConfig[t];
    for (;;)
    {
        if (c->extended == FALSE)
        {
            (void)ulTaskNotifyTake(pdTRUE, portMAX_DELAY);   /* suspended until ActivateTask() */   // «1»
        }
        c->entry();                                          /* the TASK() body, ends with TerminateTask() */   // «2»
        if (Os_Task[t].rechain == TRUE)
        {
            Os_Task[t].rechain = FALSE;
            (void)xTaskNotifyGive(Os_Task[t].handle);        /* ChainTask(self): run again */
        }
        else
        {
            Os_Task[t].activated = FALSE;
        }
        if (c->extended == TRUE)
        {
            vTaskSuspend(NULL);                              /* an extended task that returns is done */
        }
    }
}

StatusType ActivateTask(TaskType TaskID)
{
    if (TaskID >= OS_NUM_TASKS)
    {
        return Os_Error(E_OS_ID);
    }
    taskENTER_CRITICAL();
    const boolean busy = Os_Task[TaskID].activated;
    Os_Task[TaskID].activated = TRUE;
    taskEXIT_CRITICAL();
    if (busy == TRUE)
    {
        return Os_Error(E_OS_LIMIT);                         /* still running or already pending */   // «3»
    }
    (void)xTaskNotifyGive(Os_Task[TaskID].handle);
    return E_OK;
}
// [endregion]

StatusType TerminateTask(void)
{
    return (Os_Current() == INVALID_TASK) ? Os_Error(E_OS_CALLEVEL) : E_OK;   /* the body returns next */
}

StatusType ChainTask(TaskType TaskID)
{
    const TaskType self = Os_Current();
    if (TaskID >= OS_NUM_TASKS)
    {
        return Os_Error(E_OS_ID);
    }
    if (TaskID == self)
    {
        Os_Task[self].rechain = TRUE;
        return E_OK;
    }
    return ActivateTask(TaskID);
}

StatusType GetTaskID(TaskRefType TaskID)
{
    *TaskID = Os_Current();
    return E_OK;
}

// [region:alarm]
static void Os_AlarmExpired(TimerHandle_t timer)
{
    const AlarmType a = (AlarmType)(uintptr_t)pvTimerGetTimerID(timer);
    P2CONST(Os_AlarmConfigType, AUTOMATIC, OS_CONST) c = &Os_AlarmConfig[a];
    if ((Os_AlarmFirst[a] == TRUE) && (Os_AlarmCycle[a] != 0U))
    {
        Os_AlarmFirst[a] = FALSE;
        (void)xTimerChangePeriod(timer, (TickType_t)Os_AlarmCycle[a], 0);   /* from now on: the cycle */   // «4»
    }
    switch (c->action)
    {
    case OS_ALARM_ACTIVATETASK:
        (void)ActivateTask(c->task);                         /* E_OS_LIMIT = the task overran its period */   // «5»
        break;
    case OS_ALARM_SETEVENT:
        (void)SetEvent(c->task, c->event);
        break;
    default:
        c->callback();
        break;
    }
}

StatusType SetRelAlarm(AlarmType AlarmID, TickType increment, TickType cycle)
{
    if (AlarmID >= OS_NUM_ALARMS)
    {
        return Os_Error(E_OS_ID);
    }
    if ((increment == 0U) || (increment > OS_MAXALLOWEDVALUE) || (cycle > OS_MAXALLOWEDVALUE))
    {
        return Os_Error(E_OS_VALUE);
    }
    if (xTimerIsTimerActive(Os_Timer[AlarmID]) != pdFALSE)
    {
        return Os_Error(E_OS_STATE);
    }
    Os_AlarmCycle[AlarmID] = cycle;
    Os_AlarmFirst[AlarmID] = TRUE;
    vTimerSetReloadMode(Os_Timer[AlarmID], (cycle != 0U) ? pdTRUE : pdFALSE);
    (void)xTimerChangePeriod(Os_Timer[AlarmID], (TickType_t)increment, portMAX_DELAY);   /* also starts it */
    return E_OK;
}
// [endregion]

StatusType CancelAlarm(AlarmType AlarmID)
{
    if (AlarmID >= OS_NUM_ALARMS)
    {
        return Os_Error(E_OS_ID);
    }
    if (xTimerIsTimerActive(Os_Timer[AlarmID]) == pdFALSE)
    {
        return Os_Error(E_OS_NOFUNC);
    }
    (void)xTimerStop(Os_Timer[AlarmID], portMAX_DELAY);
    return E_OK;
}

StatusType SetEvent(TaskType TaskID, EventMaskType Mask)
{
    if (TaskID >= OS_NUM_TASKS)
    {
        return Os_Error(E_OS_ID);
    }
    if (Os_TaskConfig[TaskID].extended == FALSE)
    {
        return Os_Error(E_OS_ACCESS);                        /* basic tasks have no events */
    }
    (void)xEventGroupSetBits(Os_Task[TaskID].events, (EventBits_t)Mask);
    return E_OK;
}

StatusType ClearEvent(EventMaskType Mask)
{
    const TaskType self = Os_Current();
    if ((self == INVALID_TASK) || (Os_TaskConfig[self].extended == FALSE))
    {
        return Os_Error(E_OS_ACCESS);
    }
    (void)xEventGroupClearBits(Os_Task[self].events, (EventBits_t)Mask);
    return E_OK;
}

StatusType GetEvent(TaskType TaskID, EventMaskRefType Event)
{
    if (TaskID >= OS_NUM_TASKS)
    {
        return Os_Error(E_OS_ID);
    }
    if (Os_TaskConfig[TaskID].extended == FALSE)
    {
        return Os_Error(E_OS_ACCESS);
    }
    *Event = (EventMaskType)xEventGroupGetBits(Os_Task[TaskID].events);
    return E_OK;
}

StatusType WaitEvent(EventMaskType Mask)
{
    const TaskType self = Os_Current();
    if ((self == INVALID_TASK) || (Os_TaskConfig[self].extended == FALSE))
    {
        return Os_Error(E_OS_ACCESS);
    }
    (void)xEventGroupWaitBits(Os_Task[self].events, (EventBits_t)Mask, pdFALSE, pdFALSE, portMAX_DELAY);
    return E_OK;                                             /* events stay set until ClearEvent() */
}

StatusType GetResource(ResourceType ResID)
{
#if (OS_NUM_RESOURCES > 0U)
    if (ResID < OS_NUM_RESOURCES)
    {
        (void)xSemaphoreTake(Os_Resource[ResID], portMAX_DELAY);
        return E_OK;
    }
#endif
    (void)ResID;
    return Os_Error(E_OS_ID);
}

StatusType ReleaseResource(ResourceType ResID)
{
#if (OS_NUM_RESOURCES > 0U)
    if (ResID < OS_NUM_RESOURCES)
    {
        return (xSemaphoreGive(Os_Resource[ResID]) == pdTRUE) ? E_OK : Os_Error(E_OS_NOFUNC);
    }
#endif
    (void)ResID;
    return Os_Error(E_OS_ID);
}

void SuspendAllInterrupts(void)
{
    taskENTER_CRITICAL();                                    /* nests, like the OSEK service */
}

void ResumeAllInterrupts(void)
{
    taskEXIT_CRITICAL();
}

// [region:start]
void StartOS(AppModeType Mode)
{
    (void)Mode;
    for (TaskType t = 0U; t < OS_NUM_TASKS; ++t)
    {
        P2CONST(Os_TaskConfigType, AUTOMATIC, OS_CONST) c = &Os_TaskConfig[t];
        Os_Task[t].events = xEventGroupCreateStatic(&Os_Task[t].eventsMem);
        Os_Task[t].activated = (c->extended == TRUE) ? TRUE : FALSE;
        Os_Task[t].handle = xTaskCreateStatic(Os_TaskEntry, c->name, OS_STACK_WORDS, (void *)(uintptr_t)t,
                                              c->priority, Os_Task[t].stack, &Os_Task[t].tcb);
    }
    for (AlarmType a = 0U; a < OS_NUM_ALARMS; ++a)
    {
        Os_Timer[a] = xTimerCreateStatic("alarm", 1U, pdTRUE, (void *)(uintptr_t)a, Os_AlarmExpired, &Os_TimerMem[a]);
    }
#if (OS_NUM_RESOURCES > 0U)
    for (ResourceType r = 0U; r < OS_NUM_RESOURCES; ++r)
    {
        Os_Resource[r] = xSemaphoreCreateMutexStatic(&Os_ResourceMem[r]);
    }
#endif
    for (TaskType t = 0U; t < OS_NUM_TASKS; ++t)
    {
        if ((Os_TaskConfig[t].autostart == TRUE) && (Os_TaskConfig[t].extended == FALSE))
        {
            (void)ActivateTask(t);                           /* runs once the scheduler starts */
        }
    }
    vTaskStartScheduler();                                   /* does not return */
    ShutdownOS(E_OS_LIMIT);
}
// [endregion]

void ShutdownOS(StatusType Error)
{
    taskDISABLE_INTERRUPTS();
#if (OS_USE_SHUTDOWNHOOK == STD_ON)
    ShutdownHook(Error);
#else
    (void)Error;
#endif
    for (;;)
    {
    }
}

/* ------------------------------------------------- FreeRTOS hooks, hidden from the application */
static StaticTask_t Os_IdleTcb, Os_TimerTcb;
static StackType_t Os_IdleStack[configMINIMAL_STACK_SIZE], Os_TimerStack[configTIMER_TASK_STACK_DEPTH];

void vApplicationGetIdleTaskMemory(StaticTask_t **tcb, StackType_t **stack, configSTACK_DEPTH_TYPE *words)
{
    *tcb = &Os_IdleTcb;
    *stack = Os_IdleStack;
    *words = configMINIMAL_STACK_SIZE;
}

void vApplicationGetTimerTaskMemory(StaticTask_t **tcb, StackType_t **stack, configSTACK_DEPTH_TYPE *words)
{
    *tcb = &Os_TimerTcb;
    *stack = Os_TimerStack;
    *words = configTIMER_TASK_STACK_DEPTH;
}

void vApplicationStackOverflowHook(TaskHandle_t task, char *name)
{
    (void)task;
    (void)name;
    ShutdownOS(E_OS_STACKFAULT);
}

void Os_AssertFailed(const char *file, int line)
{
    (void)file;
    (void)line;
    ShutdownOS(E_OS_STATE);
}
