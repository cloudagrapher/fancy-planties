# Key Facts

Project configuration, infrastructure details, and frequently-needed reference info.
**No passwords or secrets stored here** - those live in `.env.local` (dev) and Unraid `.env` (prod).

## AWS Infrastructure

**Account:**
- Account ID: `580033881001`
- Profile: `stefaws`
- Region: `us-east-1`

**S3:**
- Bucket: `fancy-planties-images-dev-580033881001`
- Image prefix: `users/{userId}/plant_instance/{instanceId}/`
- Thumbnail prefix: `thumbnails/{size}/users/...`
- Thumbnail sizes: 100px, 200px, 400px, 800px (WebP)

**CloudFront:**
- Distribution serves images from S3
- Signed cookies for access control
- Cookie: `CloudFront-Key-Pair-Id` (checked by frontend for readiness)

**Lambda:**
- Thumbnail generator: `FancyPlantiesStorage-dev-ThumbnailGeneratorFunctio-OAHzsXyHGBzr`
- Runtime: Python 3.12, 1024MB, 60s timeout
- Trigger: S3 OBJECT_CREATED on `users/` prefix

**CDK:**
- Stacks: `FancyPlantiesStorage-dev`, `FancyPlantiesImageApi-dev`
- CDK venv: `cdk/.venv/`
- Deploy: `cd cdk && source .venv/bin/activate && cdk deploy --profile stefaws`
- Diff workaround: `--output cdk.out.diff` (avoids stale lock on `cdk.out`)

## Production Deployment (Unraid)

**Containers:**
- App: `fancy-planties-app-prod` (port 3000)
- Database: `fancy-planties-db-prod` (port 5432)
- Watchtower: `fancy-planties-watchtower` (auto-updates app container)

**Image:**
- `ghcr.io/cloudagrapher/fancy-planties:latest`
- Built by GitHub Actions, pulled by Watchtower every 5 min

**Docker Compose:**
- Production: `docker-compose.prod.yml` (includes postgres, db-migrate, app, and watchtower)
- Env vars come from `.env` file on Unraid host (NOT GitHub Secrets)
- GitHub Secrets are build-time only (for Docker image build in CI)

**Database:**
- PostgreSQL 16-alpine
- Data volume: `/mnt/user/appdata/fancy-planties-volumes/postgres-data`
- Connection from app uses `DATABASE_URL` env var
- Password contains `@` characters - may need URL-encoding (`%40`) if issues arise

## Local Development

**Database:**
- Native PostgreSQL on macOS, port 5432
- Credentials in `.env.local`

**Dev Server:**
- `npm run dev` (Next.js 15 + Turbopack)
- Port 3000

**CDK:**
- Activate venv: `source cdk/.venv/bin/activate`
- Run from `cdk/` directory

## GitHub

**Repository:**
- `cloudagrapher/fancy-planties` (private)
- Branch protection on `main` - requires PRs
- SSH key for push: `~/.ssh/cloudagrapher` (configured via `github.personal` host alias in `~/.ssh/config`)
- Remote URL uses `git@github.personal:` prefix to route through the correct SSH config
- **IMPORTANT:** If push fails with "Permission denied to stefan-bekker-reply", the SSH agent is intercepting and offering a different key. Fix by running: `ssh-add -D` to clear the agent, then retry. The `IdentitiesOnly yes` in SSH config should handle it, but the agent can override.

**CI/CD:**
- GitHub Actions builds Docker image on push to main
- Pushes to GitHub Container Registry (ghcr.io)
- Skip CI with: `[skip ci]`, `[ci skip]`, `[skip build]`, `[docs]`, `[readme]`

**GitHub CLI:**
- Auth: `gh auth login -h github.com` (as `cloudagrapher`)

## Backfill Scripts

**Thumbnail Backfill:**
```bash
AWS_PROFILE=stefaws cdk/.venv/bin/python3 \
  cdk/lambda_functions/thumbnail/backfill_thumbnails.py \
  --bucket fancy-planties-images-dev-580033881001 \
  --function-name FancyPlantiesStorage-dev-ThumbnailGeneratorFunctio-OAHzsXyHGBzr
```
- Last run: 2026-02-06, 174/174 images successful
- Uses Lambda invocation mode (Pillow not installed locally)
- Add `--dry-run` to preview without processing
