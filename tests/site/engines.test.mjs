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
