# SPDX-License-Identifier: MIT
# Example 12 in Renode: an empty slot waits for an update, a complete update over the UART
# protocol starts the application, a valid image starts after the HELLO window, a damaged image
# is refused, and a frame with a bad CRC is answered with NACK. Flash erase is not modelled
# (Renode's flash memory accepts every write), so these tests cover the logic, not the flash cell.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot
Library           Process

*** Variables ***
${DIR}            ${BUILD_DIR}/examples/12-uart-bootloader
${BOOT}           ${DIR}/12-bootloader.elf
${APP_BIN}        ${DIR}/12-application.bin
${UPLOAD}         ${CURDIR}/../host/upload.py
${SEND}           ${CURDIR}/../../common/renode/uart_send.py
${MAGIC}          0xB0071DAD

*** Keywords ***
Bootloader With Button
    [Arguments]    ${binary}=false
    Execute Command    using sysbus
    Execute Command    mach create "bl"
    Execute Command    machine LoadPlatformDescription @${PLATFORM}
    Execute Command    sysbus LoadELF @${BOOT}
    Execute Command    cpu VectorTableOffset 0x08000000
    Add Button    A    0
    Execute Command    include @${SEND}
    Create Terminal Tester    sysbus.usart1    timeout=5    binaryMode=${binary}

Install Application
    [Arguments]    ${crc_delta}=0
    Execute Command    sysbus LoadBinary @${APP_BIN} 0x08004000
    ${img}=    Evaluate    open(r'''${APP_BIN}''', 'rb').read()
    ${size}=    Evaluate    len($img)
    ${crc}=    Evaluate    (zlib.crc32($img) + ${crc_delta}) & 0xFFFFFFFF    modules=zlib
    ${check}=    Evaluate    ~(${MAGIC} ^ ${size} ^ ${crc}) & 0xFFFFFFFF
    Execute Command    sysbus WriteDoubleWord 0x08003C00 ${MAGIC}
    Execute Command    sysbus WriteDoubleWord 0x08003C04 ${size}
    Execute Command    sysbus WriteDoubleWord 0x08003C08 ${crc}
    Execute Command    sysbus WriteDoubleWord 0x08003C0C ${check}

*** Test Cases ***
Empty Slot Waits For An Update And Starts It
    Bootloader With Button
    Wait For Line On Uart    boot: no valid application
    ${frames}=    Set Variable    ${TEMPDIR}${/}12-frames.bin
    ${r}=    Run Process    python3    ${UPLOAD}    --frames-out    ${frames}    ${APP_BIN}
    Should Be Equal As Integers    ${r.rc}    0
    Execute Command    uart_send_file sysbus.usart1 @${frames}
    Wait For Line On Uart    app: version 1, vector table at 0x08004000, 72 MHz

Valid Image Starts After The Hello Window
    Bootloader With Button
    Install Application
    Wait For Line On Uart    boot: application valid
    Wait For Line On Uart    boot: starting application
    Wait For Line On Uart    app: version 1, vector table at 0x08004000, 72 MHz
    Execute Command    sysbus.usart1 WriteChar 0x72
    Wait For Line On Uart    app: reboot
    Wait For Line On Uart    boot: application valid

Damaged Image Is Not Started
    Bootloader With Button
    Install Application    crc_delta=1
    Wait For Line On Uart    boot: no valid application
    Should Not Be On Uart    boot: starting application    timeout=1

Frame With A Bad CRC Gets A NACK
    Bootloader With Button    binary=true
    Wait For Bytes On Uart    62 6f 6f 74
    # HELLO with one bit flipped in the CRC: a5 01 00 00 25 b3 83 ff
    FOR    ${b}    IN    0xa5    0x01    0x00    0x00    0x25    0xb3    0x83    0xff
        Execute Command    sysbus.usart1 WriteChar ${b}
    END
    Wait For Bytes On Uart    1f
    # the correct frame is accepted
    FOR    ${b}    IN    0xa5    0x01    0x00    0x00    0x25    0xb3    0x83    0xfe
        Execute Command    sysbus.usart1 WriteChar ${b}
    END
    Wait For Bytes On Uart    79
