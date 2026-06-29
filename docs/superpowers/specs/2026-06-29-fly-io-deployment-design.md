# Spec - Fly.io Free Tier Deployment Design for Tripp

This document details the architectural design and deployment specification to run the Tripp collaborative travel planner on Fly.io's Always Free Tier with persistent storage, zero code modifications, and 100% backward compatibility.

## 1. Goal
Provide a robust, 100% free hosting setup for Tripp using Fly.io, addressing the limitations of ephemeral containers and restricted free-tier resources (3GB maximum persistent storage volume limit).

## 2. Architecture & Data Flow

```mermaid
graph TD
    Client[Web Browser / PWA Client] -- WebSockets / HTTPS --> FlyEdge[Fly.io Edge Proxy]
    FlyEdge --> AppServer[Tripp NestJS App Server]
    
    subgraph Container [/app]
        AppServer --> DBService[Database Service]
        AppServer --> UploadService[Upload Service / Multer]
        
        DBService --> LocalDataPath[Symlink /app/server/data]
        UploadService --> LocalUploadPath[Symlink /app/server/uploads]
    end

    subgraph Persistent Storage
        LocalDataPath --> DBFile[travel.db]
        LocalUploadPath --> UploadsDir[uploads/]
        
        DBFile --- Volume[/app/data Volume]
        UploadsDir --- Volume
    end
```

To fit the Fly.io free tier (maximum 3GB total volume limit per user), the application is restructured at the container level to map both the SQLite database file (`/app/data/travel.db`) and all user uploads (`/app/uploads/`) onto a single Fly.io persistent volume mounted at `/app/data`.

## 3. Dynamic Environment Detection & File Mapping

To maintain 100% backward compatibility for standard local Docker Compose users, the container entrypoint dynamically configures the symlink structure based on the existence of the Fly.io environment variable `FLY_APP_NAME`.

### Startup Logic
When the container boots:
1. If running under Fly.io (indicated by a non-empty `$FLY_APP_NAME` variable):
   - Remove the default symbolic link `/app/server/uploads` (which normally points to `/app/uploads`).
   - Ensure the directory `/app/data/uploads` exists on the persistent volume.
   - Recreate the symbolic link `/app/server/uploads` to point directly to `/app/data/uploads`.
   - Ensure all subdirectories required for static routing (`files`, `covers`, `avatars`, `photos`) are initialized inside `/app/data/uploads`.
2. Regardless of environment, apply the ownership fix (`chown -R node:node /app/data`) to prevent file permission issues on fresh volume mounts.
3. Start the NestJS backend normally.

## 4. Proposed Configuration Changes

### [MODIFY] [Dockerfile](file:///Users/nhatminh/Desktop/Tripp/Dockerfile)
Update the container startup command `CMD` to implement the dynamic environment check and symlink redirect.

```dockerfile
CMD ["sh", "-c", "if [ ! -f /app/server/dist/index.js ] || [ ! -d /app/node_modules/tsconfig-paths ]; then echo 'FATAL: Tripp application files are missing from the image.'; echo 'A volume is likely mounted over /app, which hides the app code.'; echo 'Mount ONLY your data and uploads dirs: -v ./data:/app/data -v ./uploads:/app/uploads'; echo 'Do NOT mount a volume at /app. See the Troubleshooting section of the README.'; exit 1; fi; if [ -n \"$FLY_APP_NAME\" ]; then echo '[Fly.io] Fly.io environment detected. Redirecting uploads to /app/data/uploads for single-volume persistence...'; rm -f /app/server/uploads; mkdir -p /app/data/uploads/files /app/data/uploads/covers /app/data/uploads/avatars /app/data/uploads/photos; ln -sf /app/data/uploads /app/server/uploads; fi; chown -R node:node /app/data /app/uploads 2>/dev/null || true; cd /app/server && exec gosu node node --require tsconfig-paths/register dist/index.js"]
```

### [NEW] [fly.toml](file:///Users/nhatminh/Desktop/Tripp/fly.toml)
Create the Fly.io deployment manifest at the project root:

```toml
app = "your-trek-app-name"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"
  TZ = "UTC"
  LOG_LEVEL = "info"
  TRUST_PROXY = "1"

[[mounts]]
  source = "trek_data"
  destination = "/app/data"
  initial_size = "2GB"

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  [[services.http_checks]]
    interval = "15s"
    grace_period = "15s"
    method = "get"
    path = "/api/health"
    protocol = "http"
    timeout = "5s"
    tls_skip_verify = false
```

## 5. Security & Verification Plan

### Required Secrets
The following sensitive environment variables must be injected securely via Fly secrets (`fly secrets set`):
*   `ENCRYPTION_KEY`: For securing stored database credentials and tokens. Generate via `openssl rand -hex 32`.
*   `APP_URL`: The fully qualified public domain name (e.g., `https://your-trek-app-name.fly.dev`).

### Manual Verification Flow
1. **Local verification:** Run standard Docker build locally to verify the modified Dockerfile builds successfully and the `CMD` syntax has no shell parsing errors.
2. **Launch & Deploy:** Install `flyctl`, run `fly launch`, create the `trek_data` volume, configure secrets, and deploy.
3. **Storage Persistence check:** Log in, upload an avatar/cover image, create a test trip, trigger a VM restart (`fly apps restart`), and confirm both database records and uploaded images persist.
4. **WebSocket Sync check:** Open the app in two browser windows side-by-side, modify a trip, and confirm real-time updates synchronize across both screens.
