# STAMP

Check the stamp before you ape.

Paste a Raydium LaunchLab CA and STAMP reads the on-chain stamp of the pad that launched it:
STAMPED (the real one), COPY, LOOK-ALIKE or UNKNOWN PAD. "Caught today" lists copies and
look-alikes from the last 24 h.

- `src/` – the site (Vite + React)
- `src/lib/pads.ts` – known pads and their config addresses
- `src/lib/check.ts` – the verdict for one CA
- `src/lib/scan.ts` – the 24 h scan behind Caught today, Platforms and the numbers
- `api/scan.ts` – runs the scan on Vercel, cached at the edge
- `src/config.ts` – put the $STAMP CA and X link here at launch
