# SPDX-License-Identifier: MIT
"""Frame builder for the example 12 bootloader protocol (the same format as src/proto.h).

frame = 0xA5, cmd, len (u16 LE), payload, crc32 (u32 LE) over cmd + len + payload.
"""
import struct
import zlib

SOF, ACK, NACK = 0xA5, 0x79, 0x1F
HELLO, ERASE, WRITE, DONE, RUN = 1, 2, 3, 4, 5
CHUNK = 256


def frame(cmd: int, payload: bytes = b"") -> bytes:
    body = struct.pack("<BH", cmd, len(payload)) + payload
    return bytes([SOF]) + body + struct.pack("<I", zlib.crc32(body))


def image_frames(image: bytes):
    """Yield (description, frame) for a complete update: erase, writes, done, run."""
    if len(image) % 2:
        image += b"\xff"                     # the F1 programs half-words
    yield "erase", frame(ERASE)
    for off in range(0, len(image), CHUNK):
        yield f"write {off:#06x}", frame(WRITE, struct.pack("<I", off) + image[off:off + CHUNK])
    yield "done", frame(DONE, struct.pack("<II", len(image), zlib.crc32(image)))
    yield "run", frame(RUN)
