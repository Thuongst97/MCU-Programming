// SPDX-License-Identifier: MIT
// Unit tests for site/assets/js/lib/code.js (the same file the browser runs). Run: node --test tests/site/
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../../site/assets/js/lib/code.js");
const classes = (code, lang) => C.tokenize(code, lang).filter((t) => t.cls).map((t) => `${t.cls}:${t.text}`);

test("C: preprocessor, CMSIS constants, types, functions, comments, numbers", () => {
  const got = classes('#include "stm32f103xb.h"\nRCC->CFGR |= RCC_CFGR_SW_PLL; // c\nstatic volatile uint32_t t = 0x10U;\nvoid SysTick_Handler(void) {}', "c");
  for (const want of ['pp:#include "stm32f103xb.h"', "cst:RCC_CFGR_SW_PLL", "com:// c", "kw:static", "kw:volatile", "ty:uint32_t", "num:0x10U", "fn:SysTick_Handler"]) {
    assert.ok(got.includes(want), `missing ${want} in ${got}`);
  }
});

test("AUTOSAR types are highlighted as types", () => {
  const got = classes("Std_ReturnType Dio_WriteChannel(Dio_ChannelType ch, uint8 level);", "c");
  assert.ok(got.includes("ty:Std_ReturnType"));
  assert.ok(got.includes("ty:Dio_ChannelType"));
  assert.ok(got.includes("ty:uint8"));
  assert.ok(got.includes("fn:Dio_WriteChannel"));
});

test("asm, ld, cmake, console, json", () => {
  assert.deepEqual(classes("Reset_Handler:\n  ldr r0, =_estack @ sp", "asm"), ["fn:Reset_Handler", "kw:ldr", "ty:r0", "com:@ sp"]);
  assert.ok(classes("FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 64K", "ld").includes("num:64K"));
  assert.ok(classes("add_executable(${PROJECT_NAME} main.c)", "cmake").includes("ann:${PROJECT_NAME}"));
  const con = classes("$ openocd -f bluepill.cfg\nOpen On-Chip Debugger 0.12.0", "console");
  assert.ok(con.includes("fn:openocd") && con.includes("attr:-f") && con.includes("out:Open On-Chip Debugger 0.12.0"));
  assert.deepEqual(classes('{"a": true}', "json"), ['attr:"a"', "kw:true"]);
});

test("unknown language is plain text; toLines escapes HTML", () => {
  assert.deepEqual(C.tokenize("<b>", "nope"), [{ cls: "", text: "<b>" }]);
  assert.deepEqual(C.toLines(C.tokenize("a<b\nc", "nope")), ["a&lt;b", "c"]);
});

test("parseMarks strips comment-wrapped markers in every syntax", () => {
  const { code, marks } = C.parseMarks("int x; // «3»\nldr r0, r1 @ «4»\n. = ALIGN(4); /* «5» */\nset(A 1) # «6»\nbare «7»\nplain");
  assert.equal(code, "int x;\nldr r0, r1\n. = ALIGN(4);\nset(A 1)\nbare\nplain");
  assert.deepEqual(marks, { 0: 3, 1: 4, 2: 5, 3: 6, 4: 7 });
});

test("lineNumbers skips removed region-marker lines", () => {
  assert.deepEqual(C.lineNumbers(4, 3, "4,7"), [3, 5, 6, 8]);
  assert.deepEqual(C.lineNumbers(3, undefined, ""), [1, 2, 3]);
});
