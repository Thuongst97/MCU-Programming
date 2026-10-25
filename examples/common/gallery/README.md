# Bad-vs-good gallery (module 17)

Each pair shows a defect class that static analysis and MISRA C:2012 target, in code that
compiles. `src/good.c` builds with the course's full warning set. `src/bad.c` builds with
`-Wno-sign-compare -Wno-conversion -Wno-parentheses`, so the defects reach the binary: these are
exactly the warnings that would have caught them. The host tests in `test/` run both versions
and pin down the wrong results of the bad ones, so the page's claims are tested.

Rules are cited by number only (MISRA C:2012 including its amendments); the explanations on
`quality.html` are our own words.
