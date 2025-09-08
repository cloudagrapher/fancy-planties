---
inclusion: always
---

# Version Control Guidelines

## Commit Requirements

### Mandatory Commit Process

After completing any development work:

1. **Stage changes**: Review all modified files before committing
2. **Commit with descriptive message**: Use clear, actionable commit messages
3. **Push to remote**: Always push commits to maintain synchronization

### Commit Message Standards

Use conventional commit format:

```
type(scope): description

- feat: new feature
- fix: bug fix
- docs: documentation changes
- style: formatting, missing semicolons, etc.
- refactor: code restructuring without functionality changes
- test: adding or updating tests
- chore: maintenance tasks, dependency updates
```

Examples:
- `feat(auth): add user session validation`
- `fix(plants): resolve plant card rendering issue`
- `docs: update API documentation`
- `refactor(db): optimize plant query performance`

## Pre-Commit Checklist

Before committing code changes:

- [ ] **Build passes**: `npm run build` completes successfully
- [ ] **Tests pass**: `npm run test` shows no failures
- [ ] **TypeScript compiles**: No type errors
- [ ] **Lint checks**: `npm run lint` passes
- [ ] **Files organized**: Follow project structure guidelines
- [ ] **No sensitive data**: Remove API keys, passwords, or personal information

## Branch Management

### Working with Branches

- **Main branch**: Always keep stable and deployable
- **Feature branches**: Create for new features or significant changes
- **Commit frequency**: Commit logical units of work, not incomplete changes
- **Clean history**: Squash commits when appropriate before merging

### File Management Before Commits

- **Remove temporary files**: Clean up any generated or test files
- **Update documentation**: Ensure README and docs reflect changes
- **Check .gitignore**: Verify unwanted files aren't tracked
- **Organize imports**: Clean up unused imports and dependencies

## Critical Rules

### Always Do

1. **Test before commit**: Ensure all functionality works as expected
2. **Review changes**: Use `git diff` to verify what you're committing
3. **Commit complete features**: Don't commit half-finished work
4. **Write meaningful messages**: Future developers should understand the change
5. **Push regularly**: Don't let local commits accumulate

### Never Do

1. **Commit broken code**: Always ensure builds pass
2. **Commit sensitive data**: API keys, passwords, or personal information
3. **Force push to main**: Preserve shared history
4. **Commit large binary files**: Use Git LFS if necessary
5. **Skip testing**: Always verify functionality before committing

## Emergency Procedures

### If Build Fails After Commit

1. **Immediate fix**: Address the build issue quickly
2. **Hotfix commit**: Create a follow-up commit with the fix
3. **Test thoroughly**: Ensure the fix resolves all issues
4. **Document the issue**: Note what caused the failure

### If Sensitive Data Committed

1. **Stop immediately**: Don't push if not already pushed
2. **Remove from history**: Use `git filter-branch` or similar
3. **Rotate credentials**: Change any exposed API keys or passwords
4. **Force push carefully**: Only if repository is private and you're certain

This ensures code quality, maintains project stability, and provides clear development history.
