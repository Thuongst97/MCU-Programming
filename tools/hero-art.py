#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Generate the isometric hero illustration for site/index.html.

Run:   python3 tools/hero-art.py            # print the SVG
       python3 tools/hero-art.py --write    # replace it in site/index.html between the hero-art markers
       python3 tools/hero-art.py --check    # CI: fail if site/index.html is out of date

Colours come from the --hv-* custom properties in main.css, so one SVG works in both themes.

Concept: the software layers the course builds towards (application SWC, RTE, BSW, MCAL) float as
glass panes above the one physical board everything runs on: a NUCLEO-G474RE with its ST-LINK/V3E
section, the STM32G474RET6, Arduino and Morpho header rows, B1/B2 buttons, LD2 and the USB cable.
A light column rises from the MCU die through every pane; packets cross the RTE pane.

Geometry follows the sibling site (aaos14-academy): an isometric grid with plane coordinates
0..200 on every pane, mapped onto the surface with an affine matrix.
"""
import re
import sys
from pathlib import Path

A, B = 140, 53                  # pane half-width and half-depth on screen
W, H = 400, 626
CX = [208, 204, 208, 204, 208]
CY = [168, 260, 352, 444, 536]  # L1 .. L5 top-face centres; pitch 92 matches the hero-stack cards
PANE_T, BOARD_T = 4, 10
COL_U, COL_V = 0.0, 0.0         # light column rises from the MCU in the middle of the board


def P(cx, cy, u, v, z=0):
    return (cx + (u - v) * A / 2, cy + (u + v) * B / 2 - z)


def pts(ps):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in ps)


def plane(cx, cy, z, u0=-1, u1=1, v0=-1, v1=1, w=200, h=200):
    """SVG transform mapping 2D (0..w, 0..h) onto the iso rectangle [u0,u1]x[v0,v1] at height z."""
    a = (u1 - u0) / w * A / 2
    b = (u1 - u0) / w * B / 2
    c = -(v1 - v0) / h * A / 2
    d = (v1 - v0) / h * B / 2
    e = cx + (u0 - v0) * A / 2
    f = cy + (u0 + v0) * B / 2 - z
    return f"matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {e:.2f} {f:.2f})"


def uv(X, Y):
    return -1 + X / 100, -1 + Y / 100


def box(cx, cy, u0, u1, v0, v1, z0, z1, mat, top=True):
    left = [P(cx, cy, u0, v1, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u0, v1, z0)]
    right = [P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u1, v0, z0)]
    s = f'<g class="m-{mat}"><polygon class="f-l" points="{pts(left)}"/><polygon class="f-r" points="{pts(right)}"/>'
    if top:
        tp = [P(cx, cy, u0, v0, z1), P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u0, v1, z1)]
        s += f'<polygon class="f-t" points="{pts(tp)}"/>'
    return s + "</g>"


def boxp(cx, cy, X0, Y0, X1, Y1, z0, z1, mat, top=True):
    (u0, v0), (u1, v1) = uv(X0, Y0), uv(X1, Y1)
    return box(cx, cy, u0, u1, v0, v1, z0, z1, mat, top)


def path_d(points):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in points)


def pulse(d, dur, delay, cls="hv-pulse"):
    return f'<circle class="{cls}" r="2" style="offset-path:path(\'{d}\');animation-duration:{dur}s;animation-delay:{delay}s"/>'


def rim(cx, cy, z=0, v0=-1, v1=1):
    pts_ = [P(cx, cy, -1, v1 - 0.04, z), P(cx, cy, -0.96, v1, z), P(cx, cy, 0.96, v1, z), P(cx, cy, 1, v1 - 0.04, z), P(cx, cy, 1, v0 + 0.04, z)]
    return f'<path class="hv-rim" d="{path_d(pts_)}"/>'


# ------------------------------------------------------------------ software panes (L1-L4)
TILE_H = 3.5


def tile(X0, Y0, X1, Y1, title, sub="", extra=""):
    w = X1 - X0
    s = f'<rect class="sw-tile" x="{X0}" y="{Y0}" width="{w}" height="{Y1 - Y0}" rx="7"/>'
    s += f'<rect class="sw-tile-bar" x="{X0 + 7}" y="{Y0 + 7}" width="{min(22, w - 14)}" height="3" rx="1.5"/>'
    size = min(13, (w - 14) / (len(title) * 0.6))
    s += f'<text class="sw-label" x="{X0 + 8}" y="{Y0 + 25}" style="font-size:{size:.1f}px">{title}</text>'
    if sub:
        s += f'<text class="sw-sub" x="{X0 + 8}" y="{Y0 + 37}">{sub}</text>'
    return s + extra


def chips(items, y, x0=22, w=40, gap=6):
    s = ""
    for k, t in enumerate(items):
        x = x0 + k * (w + gap)
        s += (f'<rect class="sw-chip" x="{x}" y="{y}" width="{w}" height="17" rx="4"/>'
              f'<text class="sw-chip-t" x="{x + w / 2}" y="{y + 11.5}" text-anchor="middle">{t}</text>')
    return s


def pane(i, tiles, extra_top="", label=""):
    cx, cy = CX[i], CY[i]
    s = f'<g transform="{plane(cx, cy, -PANE_T - 6, -1.08, 1.08, -1.08, 1.08)}"><rect class="hv-underglow" width="200" height="200" rx="44"/></g>'
    s += box(cx, cy, -1, 1, -1, 1, -PANE_T, 0, "pane", top=False)
    s += f'<g transform="{plane(cx, cy, 0)}">'
    s += '<rect class="sw-glass" width="200" height="200" rx="8"/>'
    s += "".join(f'<path class="sw-grid" d="M{k},4 V196 M4,{k} H196"/>' for k in range(25, 200, 25))
    s += '<rect class="sw-sheen" width="200" height="200" rx="8"/>'
    s += extra_top
    s += f'<text class="hv-engrave" x="10" y="193">{label}</text></g>'
    for X0, Y0, X1, Y1, *_ in tiles:
        s += boxp(cx, cy, X0, Y0, X1, Y1, 0, TILE_H, "tile", top=False)
    s += f'<g transform="{plane(cx, cy, TILE_H)}">' + "".join(tile(*t) for t in tiles) + "</g>"
    s += rim(cx, cy)
    return s


def layer1():
    tiles = [
        (14, 14, 118, 104, "TurnLight", "application SWC", chips(["RE_Init", "RE_10ms"], 62)),
        (14, 120, 118, 180, "LampMonitor", "RE_LampMonitor_100ms"),
        (132, 14, 190, 180, "Ports", "S/R · C/S"),
    ]
    return pane(0, tiles, label="L1 · APPLICATION · SWC")


def layer2():
    cx, cy = CX[1], CY[1]
    top = ('<text class="sw-zone" x="12" y="20">APPLICATION</text>'
           '<text class="sw-zone" x="188" y="20" text-anchor="end">BASIC SOFTWARE</text>'
           '<text class="sw-zone c" x="100" y="104" text-anchor="middle">RUNTIME ENVIRONMENT</text>'
           '<path class="sw-lane" d="M10,92 H190 M10,112 H190"/>')
    tiles = [(20, 128, 92, 176, "Rte_Read", "sender-receiver"), (108, 128, 180, 176, "Rte_Write", "hand-written")]
    s = pane(1, tiles, top, "L2 · RTE")
    for Y, rev, delay in ((92, False, 0), (112, True, -1.1)):
        a_, b_ = P(cx, cy, *uv(14, Y), 1.5), P(cx, cy, *uv(186, Y), 1.5)
        d = path_d([b_, a_] if rev else [a_, b_])
        s += pulse(d, 2.2, delay, "hv-packet") + pulse(d, 2.2, delay - 1.1, "hv-packet")
    return s


def layer3():
    tiles = [
        (14, 14, 118, 104, "Services", "Com · PduR · Dem", chips(["NvM", "EcuM"], 62)),
        (132, 14, 190, 104, "Det", "dev errors"),
        (14, 120, 118, 180, "ECU abstraction", "IoHwAb · CanIf"),
        (132, 120, 190, 180, "WdgM", ""),
    ]
    return pane(2, tiles, label="L3 · BSW · SERVICES · ECU ABSTRACTION")


def layer4():
    tiles = [
        (14, 14, 118, 104, "MCAL", "STM32G4 registers", chips(["Dio", "Pwm"], 62)),
        (132, 14, 190, 104, "Can", "FDCAN1"),
        (14, 120, 74, 180, "Adc", ""),
        (88, 120, 190, 180, "Port · Gpt · Wdg", "Mcu · Fls"),
    ]
    return pane(3, tiles, label="L4 · MCAL · microcontroller drivers")


# ------------------------------------------------------------------ the NUCLEO-G474RE (L5)
V0, V1 = -0.9, 0.9              # a NUCLEO-64 is nearly square: u spans the length, v the width


def chip(cx, cy, X0, Y0, X1, Y1, h, label, sub=""):
    (u0, v0), (u1, v1) = uv(X0, Y0), uv(X1, Y1)
    s = f'<g transform="{plane(cx, cy, 0.3, u0 - 0.08, u1 + 0.08, v0 - 0.08, v1 + 0.08)}"><rect class="hv-ao" width="200" height="200" rx="30"/></g>'
    for k in range(7):
        t = u0 + (k + 0.5) * (u1 - u0) / 7
        s += box(cx, cy, t - 0.012, t + 0.012, v1, v1 + 0.045, 0, 1.2, "leg")
    for k in range(7):
        t = v0 + (k + 0.5) * (v1 - v0) / 7
        s += box(cx, cy, u1, u1 + 0.045, t - 0.012, t + 0.012, 0, 1.2, "leg")
    s += box(cx, cy, u0, u1, v0, v1, 0, h, "chip")
    s += f'<g transform="{plane(cx, cy, h)}"><circle class="hv-pin1" cx="{X0 + 4}" cy="{Y0 + 4}" r="1.6"/>'
    s += f'<text class="hv-chip-txt" x="{(X0 + X1) / 2}" y="{(Y0 + Y1) / 2}" text-anchor="middle">{label}</text>'
    if sub:
        s += f'<text class="hv-chip-sub" x="{(X0 + X1) / 2}" y="{(Y0 + Y1) / 2 + 10}" text-anchor="middle">{sub}</text>'
    return s + "</g>"


def header_row(cx, cy, v, n=20, u0=-0.84, u1=0.84):
    """A 2.54 mm pin header: a black plastic strip with gold pins sticking up."""
    s = box(cx, cy, u0, u1, v - 0.035, v + 0.035, 0, 3.2, "strip")
    for k in range(n):
        t = u0 + (k + 0.5) * (u1 - u0) / n
        s += box(cx, cy, t - 0.01, t + 0.01, v - 0.01, v + 0.01, 3.2, 9, "pin")
    return s


def layer5():
    i = 4
    cx, cy = CX[i], CY[i]
    s = f'<g transform="{plane(cx, cy, -BOARD_T - 10, -1.25, 1.25, -1.1, 1.1)}"><rect class="hv-floor" width="200" height="200" rx="60"/></g>'
    s += f'<g transform="{plane(cx, cy, -BOARD_T - 6, -1.08, 1.08, V0 - 0.1, V1 + 0.1)}"><rect class="hv-underglow" width="200" height="200" rx="44"/></g>'
    s += box(cx, cy, -1, 1, V0, V1, -BOARD_T, 0, "pcb", top=False)
    # PCB top face in plane coordinates; the board occupies Y = 10..190 of the 0..200 plane.
    # Left: the ST-LINK/V3E part (USB, probe MCU); right: the STM32G474 part with its headers.
    pcb = '<rect class="hw-pcb" x="1" y="11" width="198" height="178" rx="6"/>'
    pcb += '<path class="hw-trace" d="M58,14 V170" stroke-dasharray="3 3"/>'
    for d in ("M42,92 H60 V96 H80", "M42,104 H70 V108 H80", "M120,92 H134 V88 H146", "M120,100 H150 V122",
              "M100,80 V44", "M100,120 V156", "M120,108 H164 V106 H170"):
        pcb += f'<path class="hw-trace" d="{d}"/>'
    for x, y in ((100, 44), (100, 156), (150, 122), (60, 96)):
        pcb += f'<circle class="hw-via" cx="{x}" cy="{y}" r="1.8"/>'
    pcb += ('<text class="hw-silk" x="10" y="72">ST-LINK/V3E</text><text class="hw-silk" x="10" y="134">SWD · VCP</text>'
            '<text class="hw-silk" x="146" y="70">B2 RESET</text><text class="hw-silk" x="146" y="142">B1 USER</text>'
            '<text class="hw-silk" x="166" y="102">LD2</text><text class="hw-silk" x="126" y="84">X3</text>'
            '<text class="hw-silk" x="68" y="56">CN5 · CN9</text><text class="hw-silk" x="68" y="146">CN6 · CN8</text>')
    s += f'<g transform="{plane(cx, cy, 0)}">{pcb}<text class="hv-engrave" x="62" y="185">L5 · STM32G474RET6 · NUCLEO-G474RE</text></g>'
    # Arduino headers just inside each long edge, Morpho rows on the edge itself
    s += header_row(cx, cy, V0 + 0.1, n=19, u0=-0.32, u1=0.96)
    s += header_row(cx, cy, V0 + 0.22, n=16, u0=-0.2, u1=0.96)
    s += header_row(cx, cy, V1 - 0.3, n=16, u0=-0.2, u1=0.96)
    s += header_row(cx, cy, V1 - 0.18, n=19, u0=-0.32, u1=0.96)
    # STM32G474 (Cortex-M4F) in the middle, under the light column; the ST-LINK's own MCU on the left
    s += chip(cx, cy, 80, 80, 120, 120, 4, "STM32", "G474RET6")
    s += chip(cx, cy, 22, 88, 40, 106, 3, "ST")
    s += boxp(cx, cy, 126, 86, 138, 94, 0, 4, "can")               # X3, 24 MHz (not used by the course)
    s += boxp(cx, cy, 148, 72, 158, 82, 0, 3, "button")            # B2 RESET
    s += boxp(cx, cy, 148, 122, 158, 132, 0, 3, "button")          # B1 USER
    s += boxp(cx, cy, 168, 106, 174, 110, 0, 1.5, "led")            # LD2 on PA5
    lx, ly = P(cx, cy, *uv(171, 108), 2.2)
    s += f'<circle class="hv-led" cx="{lx:.1f}" cy="{ly:.1f}" r="1.6"/>'
    s += boxp(cx, cy, 0, 90, 12, 110, 0, 6, "metal")               # USB connector of the ST-LINK
    # the USB cable leaving the ST-LINK connector: power, SWD and the virtual COM port in one
    for k in range(4):
        Y = 93 + k * 4.5
        x0, y0 = P(cx, cy, *uv(0, Y), 3)
        d = f"M{x0:.1f},{y0:.1f} C{x0 - 20:.1f},{y0 + 8:.1f} {x0 - 26:.1f},{y0 + 26:.1f} {x0 - 30 - k * 3:.1f},{y0 + 62:.1f}"
        s += f'<path class="hv-wire w{k + 1}" d="{d}"/>'
        if k in (1, 2):
            s += pulse(d, 1.9, -0.7 * k)
    s += rim(cx, cy, 0, V0, V1)
    return s


def column(i_low, z_low, i_high, z_high, cls=""):
    (x1, y1) = P(CX[i_low], CY[i_low], COL_U, COL_V, z_low)
    (x2, y2) = P(CX[i_high], CY[i_high], COL_U, COL_V, z_high)
    up = f"M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}"
    s = f'<path class="hv-col-halo" d="{up}"/><path class="hv-col-core" d="{up}"/>'
    s += pulse(up, 1.2, 0) + pulse(up, 1.2, -0.6)
    s += f'<ellipse class="hv-col-foot" cx="{x1:.1f}" cy="{y1:.1f}" rx="9" ry="4"/>'
    return f'<g class="{cls}">{s}</g>'


DEFS = """<defs>
<linearGradient id="hv-g-pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2557b8"/><stop offset="1" stop-color="#0f2f72"/></linearGradient>
<linearGradient id="hv-g-sheen" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="hv-g-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b404c"/><stop offset="1" stop-color="#14171c"/></linearGradient>
<linearGradient id="hv-g-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f4f7"/><stop offset="0.5" stop-color="#a3acb8"/><stop offset="1" stop-color="#d9dee5"/></linearGradient>
<radialGradient id="hv-g-ao"><stop offset="0.5" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="hv-g-floor"><stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="hv-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="hv-soft" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>"""


def render():
    body = f'<g class="hv-l5">{layer5()}</g>'
    body += column(4, 4, 3, -PANE_T, "hv-l4")
    body += f'<g class="hv-l4">{layer4()}</g>'
    body += column(3, 0, 2, -PANE_T, "hv-l3")
    body += f'<g class="hv-l3">{layer3()}</g>'
    body += column(2, 0, 1, -PANE_T, "hv-l2")
    body += f'<g class="hv-l2">{layer2()}</g>'
    body += column(1, 0, 0, -PANE_T, "hv-l1")
    body += f'<g class="hv-l1">{layer1()}{column(0, 0, 0, 34)}</g>'
    return f'<svg class="hero-art" viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false">{DEFS}{body}</svg>'


START, END = "<!-- hero-art:start (generated by tools/hero-art.py) -->", "<!-- hero-art:end -->"
INDEX = Path(__file__).resolve().parent.parent / "site" / "index.html"


def main():
    svg = render()
    if len(sys.argv) == 1:
        print(svg)
        return
    html = INDEX.read_text(encoding="utf-8")
    pat = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
    if not pat.search(html):
        sys.exit(f"markers not found in {INDEX}")
    new = pat.sub(lambda _: f"{START}\n          {svg}\n          {END}", html)
    if sys.argv[1] == "--check":
        if new != html:
            sys.exit("site/index.html hero art is out of date: run python3 tools/hero-art.py --write")
        print("hero art up to date")
    elif sys.argv[1] == "--write":
        INDEX.write_text(new, encoding="utf-8")
        print(f"wrote hero art into {INDEX.relative_to(INDEX.parent.parent)}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
