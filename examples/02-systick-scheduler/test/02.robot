# SPDX-License-Identifier: MIT
# Example 02 in Renode: every task runs at its rate in virtual time and none overruns.
# The report task runs last in the table, so in the tick where it runs, "sample" has already run 100 times.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/02-systick-scheduler/02-systick-scheduler.elf

*** Test Cases ***
Tasks Run At Their Periods
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 02: cooperative scheduler, 3 tasks
    # the "=" signs are written as "." because Renode's keyword bridge splits arguments on "="
    Wait For Line On Uart    sample.100 heartbeat.10 report.1 overruns.0    treatAsRegex=true
    Wait For Line On Uart    sample.200 heartbeat.20 report.2 overruns.0    treatAsRegex=true

Heartbeat Blinks At 5 Hz
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    report.1    treatAsRegex=true
    Assert LED Is Blinking    testDuration=2    onDuration=0.1    offDuration=0.1    tolerance=0.05
