# DEV-nnn: <one-line summary in your own words>

| Field | Value |
|---|---|
| Rule | MISRA C:2012 Rule x.y (category: required / advisory) — number only, never the rule text |
| Scope | file(s) and function(s), or "project" for a disapplication |
| Raised by / date | |
| Approved by / date | |

## Why the rule cannot be followed here
What the code must do, and why the compliant alternatives are worse (for example: hardware
register access needs an integer-to-pointer conversion; the CMSIS headers are the reference).

## Why it is safe
What prevents the problem the rule is about: the reasoning, the tests, review evidence.

## How it is marked in code
`// cppcheck-suppress misra-c2012-x.y ; DEV-nnn` on the line before each occurrence.

## Review
When this deviation is re-examined (for example at every release, or when the code changes).
