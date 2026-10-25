# SPDX-License-Identifier: MIT
# Renode monitor command: feed the bytes of a file into a UART, as if a host had sent them.
#   include @examples/common/renode/uart_send.py
#   uart_send_file sysbus.usart1 @frames.bin
# Renode's STM32 USART model queues received bytes, so the firmware reads them at its own pace.

def mc_uart_send_file(uart, path):
    with open(path, "rb") as f:
        data = bytearray(f.read())
    for b in data:
        uart.WriteChar(b)
    print("uart_send_file: %d bytes" % len(data))
