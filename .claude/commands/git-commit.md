---
name: git-commit
description: Format, build, and commit code changes with a changelog summary, then push to origin main
---

# Git Commit Workflow

Automates: format → build → commit → push to origin main.

## Steps to Execute

1. **Check for staged changes**: Run `git status` to see staged files. If nothing staged, stage all changes with `git add -A`.

2. **Format the code**: Run `npm run format` to ensure consistent code style.

3. **Build the code**: Run `npm run build` to verify no errors.

4. **If build fails**: STOP immediately and report the error. Do NOT proceed.

5. **If build succeeds**:
   - Run `git diff --staged --stat` to analyze what changed
   - Generate a commit message with:
     - A concise summary line (type: description)
     - A blank line
     - Bullet points summarizing the changes
   - Commit with the generated message

6. **Push to origin main**: Run `git push origin main`

## Commit Message Format

```
<type>: <short summary>

- <change 1>
- <change 2>
- <change 3>
```

Types: feat, fix, refactor, style, docs, test, chore

## Important

- STOP if build fails - do not commit broken code
- Write meaningful summaries that explain the changes
- Always push to origin main
