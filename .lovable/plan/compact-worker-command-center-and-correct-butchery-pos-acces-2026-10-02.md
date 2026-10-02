# Compact Worker Command Center and correct Butchery POS access

## Changes
- Reduce the Worker Command Center’s header, navigation, controls, tiles, gaps, and text sizing so the full workspace aligns cleanly within the available screen.
- Keep all current Worker Command Center actions and posting behavior unchanged.
- Add the dedicated Butchery POS path to the existing retail POS access rules, preventing authorized retail staff from being redirected to the standard Retail POS.
- Keep Butchery POS on its existing dedicated screen and preserve its weighing, stock, checkout, and printing behavior.

## Verification
- Confirm the Worker Command Center fits and aligns at the current desktop size and on mobile.
- Confirm `/retail/butchery-pos` remains on the dedicated Butchery POS screen for authorized retail users.
- Check the latest preview build result and browser console.
