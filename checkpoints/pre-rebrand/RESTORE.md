# Pre-Rebrand Visual Checkpoint — Rollback Instructions

This directory contains a full backup of the visual configuration files
before the Bender Haussform rebrand was applied.

## Checkpoint Contents

| File                 | Original Location    | Description                                          |
| -------------------- | -------------------- | ---------------------------------------------------- |
| `main.css`           | `src/main.css`       | Theme CSS variables, fonts, utility classes          |
| `tailwind.config.ts` | `tailwind.config.ts` | Tailwind color palette, font families, custom colors |

## Additional Component Changes (cosmetic only)

The following component files had a CSS class added to `<img>` logo elements.
To revert, remove the `logo-always-light` or `logo-themed` class from the
logo `<img>` in each file:

1. `src/components/AppSidebar.tsx` — remove `logo-always-light` from sidebar logo
2. `src/components/Header.tsx` — remove `logo-themed` from header logo
3. `src/pages/Login.tsx` — remove `logo-always-light` from login logo

## How to Roll Back

1. Copy `main.css` from this directory to `src/main.css`:

   ```bash
   cp checkpoints/pre-rebrand/main.css src/main.css
   ```

2. Copy `tailwind.config.ts` from this directory to `tailwind.config.ts`:

   ```bash
   cp checkpoints/pre-rebrand/tailwind.config.ts tailwind.config.ts
   ```

3. Remove the `logo-always-light` / `logo-themed` class from the three
   component files listed above.

4. Restart the dev server.

This will fully restore the pre-rebrand appearance without affecting any
data, functionality, routes, or user accounts.
