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
const board = require("../../site/assets/js/data/nucleo-pins.js");
const wiring = require("../../site/assets/js/data/wiring.js");
globalThis.window = { MCU_DATA: {} };
require("../../site/assets/js/data/regs-stm32g474.js");
require("../../site/assets/js/data/memmap/00-nucleo-blink-uart.js");
const regs = globalThis.window.MCU_DATA.regs;

test("register field read/write", () => {
  const f = regs.RCC_PLLCFGR.fields.find((x) => x.name === "PLLN");
  assert.equal(Register.fieldValue(0x01005532, f), 85);
  assert.equal(Register.withField(0, f, 85), 0x00005500);
  assert.equal(Register.withField(0xffffffff, f, 0), 0xffff80ff);
});

test("register C expression uses CMSIS macros", () => {
  assert.equal(Register.cExpr(regs.RCC_CFGR, 0x0000008f), "RCC_CFGR_HPRE_DIV2 | RCC_CFGR_SW_PLL", "read-only SWS is not written");
  assert.equal(Register.cExpr(regs.FLASH_ACR, 0x00040704), "FLASH_ACR_DBG_SWEN | FLASH_ACR_DCEN | FLASH_ACR_ICEN | FLASH_ACR_PRFTEN | FLASH_ACR_LATENCY_4WS");
  assert.equal(Register.cExpr(regs.RCC_PLLCFGR, 0x01005532), "(0U << RCC_PLLCFGR_PLLR_Pos) | RCC_PLLCFGR_PLLREN | (85U << RCC_PLLCFGR_PLLN_Pos) | (3U << RCC_PLLCFGR_PLLM_Pos) | RCC_PLLCFGR_PLLSRC_HSI".replace("(0U << RCC_PLLCFGR_PLLR_Pos) | ", ""));
  assert.equal(Register.cExpr(regs.RCC_CFGR, 0), "0U");
  assert.equal(Register.cExpr(regs.SYSCFG_EXTICR4, 0x20), "SYSCFG_EXTICR4_EXTI13_PC");
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
  const m = globalThis.window.MCU_DATA.memmap["00-nucleo-blink-uart"];
  const s = MemoryMap.summarize(m);
  const text = m.sections.filter((x) => x.name === ".isr_vector" || x.name === ".text").reduce((a, x) => a + x.size, 0);
  const data = m.sections.find((x) => x.name === ".data").size;
  assert.equal(s.flash.length, 512 * 1024);
  assert.equal(s.ram.length, 96 * 1024, "RAM = SRAM1 + SRAM2; CCM SRAM is its own region");
  assert.ok(s.flashUsed >= text + data);
  assert.ok(s.ramUsed >= data + 1024);
});

test("pinout data and wiring are consistent", () => {
  const all = [...board.headers.left, ...board.headers.right, ...board.headers.morpho];
  assert.equal(board.headers.left.length, 14, "CN6 (8) + CN8 (6)");
  assert.equal(board.headers.right.length, 18, "CN5 (10) + CN9 (8)");
  for (const l of all) assert.ok(board.arduino[l] || board.pins[l] || board.power[l], `header label ${l} has no data`);
  assert.equal(board.arduino.D13, "PA5", "LD2");
  assert.equal(board.pins.PA2.af.find(([, s]) => s === "LPUART1_TX")[0], 12);
  const lq = Object.values(board.pins).map((p) => p.lqfp64);
  assert.equal(new Set(lq).size, lq.length, "LQFP64 pin numbers are unique");
  for (const [id, spec] of Object.entries(wiring)) {
    const { svg } = Pinout.render(board, { mode: "wiring", ...spec });
    if (spec.wiring.length) assert.match(svg, /po-wire/, `wiring ${id}`);
  }
  assert.throws(() => Pinout.render(board, { mode: "wiring", wiring: [{ pin: "Z9", to: "pot.1" }] }), /unknown pin/);
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

test("BRR at 170 MHz / 115200 baud: LPUART 377778, USART 1476 (as the firmware computes them)", () => {
  const r = Calc.brr(170e6, 115200);
  assert.equal(r.lpuart.brr, Math.round((256 * 170e6) / 115200));
  assert.equal(r.lpuart.brr, 377778);
  assert.equal(r.usart.brr, 1476);
  assert.ok(Math.abs(r.lpuart.errorPct) < 0.001 && Math.abs(r.usart.errorPct) < 0.05);
  assert.equal(Calc.brr(16e6, 115200).lpuart.brr, 35556, "example 12's bootloader on HSI16");
  assert.equal(Calc.brr(170e6, 300).lpuart.valid, false, "LPUART BRR has 20 bits");
});

test("timer solver hits 1 kHz exactly from 170 MHz with the largest ARR", () => {
  const best = Calc.timer({ clk: 170e6, freq: 1000 })[0];
  assert.equal((best.psc + 1) * (best.arr + 1), 170000);
  assert.equal(best.errorPct, 0);
  assert.equal(best.arr, 42499);
});

test("FDCAN bit timing matches example 11's can_timing_calc (host test test_canfd.c)", () => {
  const n = Calc.canTiming({ clk: 170e6, bitrate: 500000, sp: 0.875 });
  assert.deepEqual([n[0].brp, n[0].ts1, n[0].ts2, n[0].sjw], [17, 16, 3, 3]);
  assert.equal(n[0].reg, (2 << 25) | (16 << 16) | (15 << 8) | 2, "FDCAN_NBTP of stage 3's Can_PBcfg.c");
  for (const r of n) assert.equal(r.brp * r.tq * 500000, 170e6);
  const d = Calc.canTiming({ clk: 170e6, bitrate: 2000000, sp: 0.75, data: true });
  for (const r of d) assert.ok(r.brp <= 32 && r.ts1 <= 32 && r.ts2 <= 16);
});

test("clock tree: course setup is 170 MHz, legal, and needs 4 wait states", () => {
  const r = Clock.compute(Clock.DEFAULT);
  assert.equal(r.sysclk, 170e6);
  assert.equal(r.vco, 340e6);
  assert.equal(r.pclk1, 170e6);
  assert.equal(r.tim1, 170e6, "APB1 ÷ 1: timers run at PCLK1");
  assert.equal(r.latency, 4);
  assert.ok(r.ok && r.stepAhb);
  assert.equal(r.pllcfgr, 0x01005532, "same value as Mcu_InitClock / clock_init_170mhz");
  assert.equal(r.cfgr, 0x0000000f);
  assert.equal(Clock.compute({ ...Clock.DEFAULT, ppre1: 2 }).tim1, 170e6, "÷ 2 → timers get 2 × PCLK1");
  const bad = Clock.compute({ ...Clock.DEFAULT, boost: false });
  assert.deepEqual(bad.violations.map((v) => v.key), ["sysclk"]);
  assert.equal(Clock.compute({ ...Clock.DEFAULT, m: 8 }).violations[0].key, "pllin", "2 MHz into the PLL is below 2.66 MHz");
  assert.equal(Clock.compute(Clock.RESET).sysclk, 16e6);
});
