# SPDX-License-Identifier: MIT
# Example 11 in Renode: two Blue Pills joined by Renode's CAN hub. Frames travel between the
# machines, but there is no physical layer: no bit timing, no transceivers, no ACK or error
# frames, so error counters stay at 0 even when a node is alone on the bus.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF_A}          ${BUILD_DIR}/examples/11-can-two-nodes/11-can-node-a.elf
${ELF_B}          ${BUILD_DIR}/examples/11-can-two-nodes/11-can-node-b.elf

*** Keywords ***
Create Two Nodes On One Bus
    ${a}=    Create Blue Pill    ${ELF_A}    nodeA
    Add Button    A    0
    ${b}=    Create Blue Pill    ${ELF_B}    nodeB
    Execute Command    emulation CreateCANHub "canhub"
    Execute Command    mach set "nodeA"
    Execute Command    connector Connect sysbus.can1 canhub
    Execute Command    mach set "nodeB"
    Execute Command    connector Connect sysbus.can1 canhub
    Set Test Variable    ${A}    ${a}
    Set Test Variable    ${B}    ${b}

*** Test Cases ***
Self-Test Passes Without A Bus
    ${t}=    Create Blue Pill    ${ELF_A}
    Wait For Line On Uart    self-test (silent loopback): OK    testerId=${t}

Button On Node A Drives The LED On Node B
    Create Two Nodes On One Bus
    Wait For Line On Uart    self-test (silent loopback): OK    testerId=${A}
    Wait For Line On Uart    rx id 0x00000100 dlc 2 data0 0    testerId=${B}
    Execute Command    mach set "nodeA"
    Execute Command    gpioPortA.button Press
    Wait For Line On Uart    rx id 0x00000100 dlc 2 data0 1    testerId=${B}
    Assert LED State    true    testerId=${LED_nodeB}
    Wait For Line On Uart    rx id 0x00000101 dlc 1 data0 1    testerId=${A}
    Execute Command    gpioPortA.button Release
    Wait For Line On Uart    rx id 0x00000100 dlc 2 data0 0    testerId=${B}
    Assert LED State    false    testerId=${LED_nodeB}
