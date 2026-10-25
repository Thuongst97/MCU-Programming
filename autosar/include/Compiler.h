/* SPDX-License-Identifier: MIT
 * MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_CompilerAbstraction
 * In production  : VENDOR-SUPPLIED (per compiler)
 *
 * The macros make memory classes and pointer distances explicit for compilers that need them
 * (8/16-bit targets with near/far memory). On a Cortex-M every pointer is the same, so each macro
 * expands to plain C; quality.html and autosar-mcal.html#memmap show both forms side by side.
 * The macro set follows the R4.x form (FUNC(rettype, memclass) etc.); see the "In production"
 * note on autosar-mcal.html about the simplified form in newer releases.
 */
#ifndef COMPILER_H
#define COMPILER_H

#include "Compiler_Cfg.h"

#define AUTOMATIC                       /* local variables */
#define TYPEDEF                         /* types */
#define NULL_PTR        ((void *)0)
#define INLINE          inline
#define LOCAL_INLINE    static inline

// [region:macros]
#define FUNC(rettype, memclass)                         rettype   // «1»
#define FUNC_P2CONST(rettype, ptrclass, memclass)       const rettype *
#define FUNC_P2VAR(rettype, ptrclass, memclass)         rettype *
#define P2VAR(ptrtype, memclass, ptrclass)              ptrtype *   // «2»
#define P2CONST(ptrtype, memclass, ptrclass)            const ptrtype *   // «3»
#define CONSTP2VAR(ptrtype, memclass, ptrclass)         ptrtype * const
#define CONSTP2CONST(ptrtype, memclass, ptrclass)       const ptrtype * const
#define P2FUNC(rettype, ptrclass, fctname)              rettype (*fctname)
#define CONST(consttype, memclass)                      const consttype
#define VAR(vartype, memclass)                          vartype
// [endregion]

#endif
