#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Upload an application image to the example 12 bootloader.

  python3 upload.py --port /dev/ttyACM0 build/.../12-application.bin    # NUCLEO virtual COM port (needs pyserial)
  python3 upload.py --tcp localhost:3456 12-application.bin             # Renode socket terminal
  python3 upload.py --frames-out frames.bin 12-application.bin          # only write the byte stream

Reset the board (or send "r" to the running application) just before you start: the bootloader
listens for HELLO for 500 ms after reset. Holding the USER button B1 keeps it in update mode.
"""
import argparse
import socket
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blproto  # noqa: E402


class Tcp:
    def __init__(self, addr):
        host, port = addr.rsplit(":", 1)
        self.s = socket.create_connection((host, int(port)), timeout=5)

    def write(self, b):
        self.s.sendall(b)

    def read1(self, timeout):
        self.s.settimeout(timeout)
        try:
            b = self.s.recv(1)
        except socket.timeout:
            return None
        return b[0] if b else None


class Serial:
    def __init__(self, port):
        import serial  # pyserial, only needed for real hardware
        self.p = serial.Serial(port, 115200, timeout=0.1)

    def write(self, b):
        self.p.write(b)

    def read1(self, timeout):
        self.p.timeout = timeout
        b = self.p.read(1)
        return b[0] if b else None


def wait_ack(link, timeout):
    """Skip text the bootloader prints before the protocol starts; return True on ACK."""
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        b = link.read1(max(0.01, end - time.monotonic()))
        if b == blproto.ACK:
            return True
        if b == blproto.NACK:
            return False
    return False


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", type=Path, help="raw binary linked for 0x08004000 (12-application.bin)")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--port", help="serial port of the USB-UART adapter")
    g.add_argument("--tcp", help="host:port of a Renode server socket terminal")
    g.add_argument("--frames-out", type=Path, help="write the frames to a file instead of sending them")
    a = ap.parse_args()
    image = a.image.read_bytes()

    if a.frames_out:
        a.frames_out.write_bytes(blproto.frame(blproto.HELLO) + b"".join(f for _, f in blproto.image_frames(image)))
        print(f"wrote {a.frames_out}")
        return 0

    link = Tcp(a.tcp) if a.tcp else Serial(a.port)
    for _ in range(100):                                 # ~ 5 s of HELLOs to catch the window
        link.write(blproto.frame(blproto.HELLO))
        if wait_ack(link, 0.05):
            break
    else:
        sys.exit("no answer from the bootloader: reset the board or hold the USER button B1")
    print(f"bootloader found, sending {len(image)} bytes")
    for what, f in blproto.image_frames(image):
        link.write(f)
        if not wait_ack(link, 10.0 if what == "erase" else 2.0):   # erasing 49 pages takes ~1-2 s
            sys.exit(f"{what}: refused (NACK or timeout)")
        print(f"  {what}: ok")
    print("done: application started")
    return 0


if __name__ == "__main__":
    sys.exit(main())
