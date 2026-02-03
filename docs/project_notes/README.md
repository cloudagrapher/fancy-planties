# Project Notes

Bug investigations, implementation decisions, and architectural learnings.
Each file documents a specific issue: what went wrong, why, and how it was fixed.

These exist so future contributors (human or AI) don't repeat the same mistakes.

## Index

| File | Summary |
|------|---------|
| [001-fertilizer-due-date-bug.md](./001-fertilizer-due-date-bug.md) | `parseInt` silently truncating schedule units, making plants appear perpetually overdue |
| [002-photos-not-loading-bug.md](./002-photos-not-loading-bug.md) | `NEXT_PUBLIC_*` env vars missing at Docker runtime, breaking CloudFront image URLs |
| [003-image-aspect-ratio-bug.md](./003-image-aspect-ratio-bug.md) | Fixed pixel heights on plant card images causing extreme zoom/crop on mobile |
