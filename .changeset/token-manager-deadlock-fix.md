---
"gocardless-open-banking": patch
---

Fixed circular promise deadlock bug in TokenManager when refresh token returns 401 status. The manager now properly clears the refresh promise before regenerating token pairs, preventing infinite loops.
