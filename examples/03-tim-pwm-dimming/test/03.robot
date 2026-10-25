# SPDX-License-Identifier: MIT
# Example 03 in Renode: the breathing duty cycle advances and is reported every 500 ms.
# Renode's timer model keeps the registers but produces no pin waveform and no input-capture
# edges, so the capture line honestly reports "no edges" here (see the README's fidelity notes).
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/03-tim-pwm-dimming/03-tim-pwm-dimming.elf

*** Test Cases ***
Reports A Rising Duty Cycle
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 03: TIM3 PWM on PA6, TIM2 capture on PA0
    Wait For Line On Uart    clock status: 0
    # 500 ms = 50 steps of the 200-step breath: (50/100)^2 x 1000 = 250
    Wait For Line On Uart    duty 250/1000; capture: no edges (connect PA6 to PA0)
    # 1000 ms = step 100, the peak of the breath
    Wait For Line On Uart    duty 1000/1000

Duty Falls Again After The Peak
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    duty 1000/1000
    Wait For Line On Uart    duty 250/1000
