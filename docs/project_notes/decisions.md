# Architectural Decisions

Decisions that shape the project. Numbered sequentially. Update if revisited.

### ADR-001: S3 Thumbnail Generation via Lambda (2026-02-05)

**Context:**
- Plant grid loads full-resolution images (2-5MB each), causing slow page loads
- Need responsive thumbnails at multiple sizes for different UI contexts
- Want automatic generation on upload, not on-demand

**Decision:**
- Lambda function triggered by S3 `OBJECT_CREATED` events on `users/` prefix
- Generates 4 WebP thumbnails per image: 100px, 200px, 400px, 800px
- Thumbnails stored at `thumbnails/{size}/{original_key}.webp`
- Lambda lives in Storage Stack (not API Stack) to avoid CDK cyclic dependencies
- Python 3.12 runtime with Pillow, 1024MB memory, 60s timeout
- Recursive trigger guard: Lambda skips keys starting with `thumbnails/`

**Alternatives Considered:**
- On-demand resizing via CloudFront Lambda@Edge -> Rejected: latency on first request, complex caching
- Client-side resizing before upload -> Rejected: still need multiple sizes, server has more control
- Next.js Image optimization -> Rejected: requires server-side processing on every request

**Consequences:**
- Storage cost increases ~4x per image (4 extra thumbnails)
- Thumbnails generate in <1s per image (Lambda warm)
- Frontend falls back gracefully: thumbnail -> original -> placeholder
- Backfill script available for existing images

### ADR-002: Lucia Auth with Session-Based Authentication (pre-2026)

**Context:**
- Need user authentication for plant data isolation
- Want server-side session management, not JWT tokens

**Decision:**
- Lucia Auth library with PostgreSQL adapter
- Session-based auth with secure cookies
- Separate postgres connection for Lucia adapter

**Consequences:**
- Simple session management
- Database hit on every authenticated request
- Two connection pools (Lucia + Drizzle) - must configure both with limits

### ADR-003: Drizzle ORM with PostgreSQL (pre-2026)

**Context:**
- Need type-safe database access for Next.js app
- Want migration support and schema-as-code

**Decision:**
- Drizzle ORM with `postgres.js` driver
- Schema defined in `src/lib/db/schema.ts`
- Migrations via `drizzle-kit`

**Consequences:**
- Full type safety from schema to queries
- `prepare: false` required for serverless/edge compatibility
- Connection pool configured with `max: 10, idle_timeout: 20, connect_timeout: 10`

### ADR-004: AWS CDK (Python) for Infrastructure (pre-2026)

**Context:**
- Need infrastructure-as-code for S3, CloudFront, Lambda, IAM
- Stefan prefers Python CDK over bash scripts or Terraform

**Decision:**
- Python CDK with separate stacks: Storage, API, Monitoring
- Deployed via `cdk deploy --profile stefaws`
- Lambda bundles built locally with pip (not Docker)

**Consequences:**
- Type-safe infrastructure definitions
- Cross-stack dependencies need careful ordering
- CDK venv at `cdk/.venv/` (separate from app)

### ADR-005: Docker on Unraid for Production (pre-2026)

**Context:**
- Self-hosted deployment on Unraid NAS
- Want automatic updates from GitHub Container Registry

**Decision:**
- `docker-compose.watchtower.yml` with Watchtower for auto-pulls
- GitHub Actions builds and pushes to `ghcr.io/cloudagrapher/fancy-planties:latest`
- PostgreSQL 16-alpine as separate container
- Environment variables via `.env` file on Unraid host (NOT from GitHub Secrets at runtime)

**Consequences:**
- Watchtower checks every 5 minutes for new images
- Must maintain `.env` file on Unraid separately from GitHub Secrets
- GitHub Secrets only used at build time (Docker image build), not runtime
- `DATABASE_URL` must be set in Unraid `.env` pointing to postgres container hostname
