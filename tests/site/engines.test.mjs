// SPDX-License-Identifier: MIT
// Unit tests for the pure parts of the engines (PLAN.md §9.10): register math, memory-map summary,
// pinout/wiring geometry. They run in Node with no browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Register = require("../../site/assets/js/engines/register.js");
const MemoryMap = require("../../site/assets/js/engines/memorymap.js");
const Pinout = require("../../site/assets/js/engines/pinout.js");
const board = require("../../site/assets/js/data/bluepill-pins.js");
const wiring = require("../../site/assets/js/data/wiring.js");
globalThis.window = { MCU_DATA: {} };
require("../../site/assets/js/data/regs-stm32f103.js");
require("../../site/assets/js/data/memmap/00-bluepill-blink-uart.js");
const regs = globalThis.window.MCU_DATA.regs;

test("register field read/write", () => {
  const f = regs.RCC_CFGR.fields.find((x) => x.name === "PLLMUL");
  assert.equal(Register.fieldValue(0x001d0402, f), 7);
  assert.equal(Register.withField(0, f, 7), 0x001c0000);
  assert.equal(Register.withField(0xffffffff, f, 0), 0xffc3ffff);
});

test("register C expression uses CMSIS macros", () => {
  assert.equal(Register.cExpr(regs.RCC_CFGR, 0x001d0402), "RCC_CFGR_PLLMULL9 | RCC_CFGR_PLLSRC | RCC_CFGR_PPRE1_DIV2 | RCC_CFGR_SW_PLL");
  assert.equal(Register.cExpr(regs.FLASH_ACR, 0x12), "FLASH_ACR_PRFTBE | (2U << FLASH_ACR_LATENCY_Pos)");
  assert.equal(Register.cExpr(regs.AFIO_MAPR, 0x02000000), "AFIO_MAPR_SWJ_CFG_JTAGDISABLE");
  assert.equal(Register.cExpr(regs.RCC_CFGR, 0), "0U");
  assert.equal(Register.cExpr(regs.RCC_CFGR, 0x0000000a), "RCC_CFGR_SW_PLL", "read-only SWS is not written");
});

test("every register field fits in 32 bits and fields do not overlap", () => {
  for (const [name, r] of Object.entries(regs)) {
    let used = 0;
    for (const f of r.fields) {
      assert.ok(f.bits[0] >= f.bits[1] && f.bits[0] < 32, `${name}.${f.name}`);
      const m = Number(((1n << BigInt(f.bits[0] - f.bits[1] + 1)) - 1n) << BigInt(f.bits[1]));
      assert.equal(used & m, 0, `${name}.${f.name} overlaps another field`);
      used = (used | m) >>> 0;
    }
  }
});

test("memory map summary matches arm-none-eabi-size arithmetic", () => {
  const m = globalThis.window.MCU_DATA.memmap["00-bluepill-blink-uart"];
  const s = MemoryMap.summarize(m);
  const text = m.sections.filter((x) => x.name === ".isr_vector" || x.name === ".text").reduce((a, x) => a + x.size, 0);
  const data = m.sections.find((x) => x.name === ".data").size;
  assert.equal(s.flash.length, 64 * 1024);
  assert.equal(s.ram.length, 20 * 1024);
  assert.equal(s.flashUsed, text + data);
  assert.ok(s.ramUsed >= data + 1024);
});

test("pinout data and wiring are consistent", () => {
  const all = [...board.headers.left, ...board.headers.right];
  assert.equal(board.headers.left.length, 20);
  assert.equal(board.headers.right.length, 20);
  for (const l of all) assert.ok(board.pins["P" + l] || board.power[l], `header label ${l} has no data`);
  const lq = Object.values(board.pins).map((p) => p.lqfp);
  assert.equal(new Set(lq).size, lq.length, "LQFP pin numbers are unique");
  for (const [id, spec] of Object.entries(wiring)) {
    const { svg } = Pinout.render(board, { mode: "wiring", ...spec });
    assert.match(svg, /po-wire/, `wiring ${id}`);
  }
  assert.throws(() => Pinout.render(board, { mode: "wiring", wiring: [{ pin: "Z9", to: "stlink.GND" }] }), /unknown pin/);
});

const { Wave } = require("../../site/assets/js/engines/waveform.js");
const Calc = require("../../site/assets/js/engines/calc.js");
const Clock = require("../../site/assets/js/engines/clocktree.js");

test("UART frame: idle, start, LSB-first data, stop", () => {
  assert.equal(Wave.uart({ byte: 0x48 }).signals[0].wave, "11" + "0" + "00010010" + "1" + "1");
  const even = Wave.uart({ byte: 0x07, parity: "even" }).signals[0].wave;   // three 1s → parity bit 1
  assert.equal(even[2 + 1 + 8], "1");
});

test("SPI waveforms have equal length and the right idle clock level", () => {
  for (const mode of [0, 1, 2, 3]) {
    const s = Wave.spi({ mode, mosi: [0x9f], miso: [0xef] });
    const lens = new Set(s.signals.map((x) => x.wave.length));
    assert.equal(lens.size, 1, `mode ${mode}`);
    assert.equal(s.signals[1].wave[0], String(mode >> 1), `CPOL of mode ${mode}`);
  }
});

test("I2C: SDA only changes while SCL is low, except START and STOP", () => {
  const { signals } = Wave.i2c({ addr: 0x3c, bytes: [0x00, 0xaf] });
  const scl = signals[0].wave, sda = signals[1].wave;
  const changesWhileHigh = [];
  for (let i = 1; i < sda.length; i++) if (sda[i] !== sda[i - 1] && scl[i] === "1" && scl[i - 1] === "1") changesWhileHigh.push(i);
  assert.equal(changesWhileHigh.length, 2, "only START (falling) and STOP (rising)");
  assert.equal(sda[changesWhileHigh[0]], "0");
  assert.equal(sda[changesWhileHigh[1]], "1");
});

test("CAN: CRC-15 residue is zero and no run of 6 equal bits before the CRC delimiter", () => {
  for (const [id, data] of [[0x3a0, [0x05, 0x00]], [0x000, [0, 0, 0, 0]], [0x7ff, [0xff, 0xff]], [0x123, [0x11, 0x22, 0x33]]]) {
    const f = Wave.can({ id, data });
    const bits = [...f.crcInput, ...Array.from({ length: 15 }, (_, k) => (f.crc >> (14 - k)) & 1)];
    assert.equal(Wave.crc15(bits), 0, `CRC residue for id ${id}`);
    const stuffedPart = f.signals[0].wave.slice(0, f.bitCount - 10);   // up to the end of the CRC field
    assert.ok(!/000000|111111/.test(stuffedPart), `no six equal bits for id ${id}`);
  }
});

test("BRR for 115200 baud at 72 MHz is 0x271", () => {
  const r = Calc.brr(72e6, 115200);
  assert.equal(r.brr, 0x271);
  assert.ok(Math.abs(r.errorPct) < 0.01);
  assert.equal(Calc.brr(36e6, 9600).brr, 0xea6);   // 234.375 → 234 + 6/16
});

test("timer solver hits 1 kHz exactly from 72 MHz with the largest ARR", () => {
  const best = Calc.timer({ clk: 72e6, freq: 1000 })[0];
  assert.equal((best.psc + 1) * (best.arr + 1), 72000);
  assert.equal(best.errorPct, 0);
  assert.equal(best.arr, 35999);
});

test("CAN bit timing: 500 kbit/s from 36 MHz, exact rate, legal fields", () => {
  const list = Calc.canTiming({ pclk: 36e6, bitrate: 500000, sp: 0.875 });
  assert.ok(list.length > 0);
  for (const r of list) {
    assert.equal(r.brp * r.tq * 500000, 36e6);
    assert.ok(r.ts1 >= 1 && r.ts1 <= 16 && r.ts2 >= 1 && r.ts2 <= 8);
    assert.equal(r.btr & 0x3ff, r.brp - 1);
  }
  assert.ok(Math.abs(list[0].errorPct) <= Math.abs(list[list.length - 1].errorPct));
});

test("clock tree: course setup is legal and needs 2 wait states", () => {
  const r = Clock.compute(Clock.DEFAULT);
  assert.equal(r.sysclk, 72e6);
  assert.equal(r.pclk1, 36e6);
  assert.equal(r.tim1, 72e6, "APB1 timers run at 2 × PCLK1");
  assert.equal(r.adc, 12e6);
  assert.equal(r.latency, 2);
  assert.ok(r.ok);
  assert.equal(r.cfgr, 0x001d840a);   // PLLMUL9 | PLLSRC | ADCPRE_DIV6 | PPRE1_DIV2 | SW_PLL (+ SWS = PLL)
  const bad = Clock.compute({ ...Clock.DEFAULT, ppre1: 1, adcpre: 2 });
  assert.deepEqual(bad.violations.map((v) => v.key).sort(), ["adc", "pclk1"]);
  assert.equal(Clock.compute(Clock.RESET).sysclk, 8e6);
});
