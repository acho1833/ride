---
name: restart
description: Clear Next.js cache and restart the dev server on port 3000
---

# Restart Dev Server

Clears the Next.js cache and restarts the development server on port 3000.

## Steps to Execute

1. **Kill any running dev server**: Find and kill any process running on port 3000.

2. **Remove Next.js cache**: Delete the `.next` folder to clear all cached builds.

3. **Start dev server on port 3000**: Run `npm run dev -- -p 3000` in the background.

4. **Confirm**: Report that the dev server has been restarted on port 3000.

## Commands

```bash
# Kill process on port 3000 (if running)
fuser -k 3000/tcp 2>/dev/null || true

# Remove Next.js cache
rm -rf .next

# Start dev server on port 3000 in background
npm run dev -- -p 3000
```
