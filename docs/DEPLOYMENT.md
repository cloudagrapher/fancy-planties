# Deployment Guide

This guide covers deploying Fancy Planties to production environments using Docker and Docker Compose.

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Domain name (for HTTPS)
- SSL certificates (Let's Encrypt recommended)
- Minimum 2GB RAM, 2 CPU cores
- 20GB+ storage space

## 🚀 Production Deployment

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/fancy-planties
cd /opt/fancy-planties
```

### 2. Application Setup

```bash
# Clone the repository
git clone <your-repository-url> .

# Create production environment file
cp .env.production .env.production.local

# Edit environment variables
nano .env.production.local
```

### 3. Environment Configuration

Edit `.env.production.local` with your production values:

```bash
# Database Configuration
POSTGRES_DB=fancy_planties
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_very_secure_password_here
POSTGRES_PORT=5432

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
APP_PORT=3000

# Nginx Configuration
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# Security
NEXT_TELEMETRY_DISABLED=1

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

### 4. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

#### Option B: Custom Certificates

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### 5. Nginx Configuration for HTTPS

Update `nginx/conf.d/default.conf` to enable HTTPS:

```nginx
# Uncomment and configure the HTTPS server block
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of SSL configuration
}
```

### 6. Deploy the Application

```bash
# Deploy to production (includes automatic database migrations)
npm run deploy:production

# Or manually:
docker compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```

**Note**: The deployment process now includes automatic database migration application. The system will:
- Automatically detect and apply any pending Drizzle migration files from the `/drizzle` directory
- Track applied migrations to prevent duplicate execution
- Apply Row-Level Security (RLS) policies for data isolation
- Perform database health checks to ensure proper setup

### 7. Verify Deployment

```bash
# Check service status
npm run deploy:status

# Check health endpoint
curl https://your-domain.com/api/health

# View logs
docker compose -f docker-compose.prod.yml logs -f app
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Backup database
npm run backup:create

# Deploy updates
npm run deploy:production
```

### Database Management

#### Database Migrations

The enhanced migration system provides comprehensive database management:

```bash
# Check migration status
npm run db:status

# Apply pending migrations manually
npm run db:migrate

# Check database health
npm run db:health

# View applied migrations
npm run db:migrations:list
```

#### Database Backups

```bash
# Create manual backup
npm run backup:create

# Restore from backup
npm run backup:restore /path/to/backup.sql.gz
```

### Monitoring and Logs

```bash
# View application logs
docker compose -f docker-compose.prod.yml logs -f app

# View nginx logs
docker compose -f docker-compose.prod.yml logs -f nginx

# Monitor resource usage
docker stats
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs app

# Restart services
docker compose -f docker-compose.prod.yml restart
```

#### Database Connection Issues

```bash
# Check database status
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Check database health and migration status
npm run db:health

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Reset database connection
docker compose -f docker-compose.prod.yml restart postgres app

# Verify migrations are applied
npm run db:status
```

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Renew Let's Encrypt certificates
sudo certbot renew
sudo cp /etc/letsencrypt/live/your-domain.com/* nginx/ssl/
docker compose -f docker-compose.prod.yml restart nginx
```

### Performance Optimization

#### Database Optimization

```sql
-- Connect to database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d fancy_planties

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

#### Application Monitoring

```bash
# Check memory usage
docker stats --no-stream

# Monitor disk usage
df -h

# Check network connections
netstat -tulpn | grep :443
```

## 🔒 Security Hardening

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### System Updates

```bash
# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Docker Security

```bash
# Run Docker rootless (optional)
dockerd-rootless-setuptool.sh install

# Scan images for vulnerabilities
docker scan fancy-planties-app-prod
```

## 📊 Monitoring and Alerting

### Health Checks

Set up monitoring for:
- Application health endpoint: `https://your-domain.com/api/health`
- Database connectivity
- SSL certificate expiration
- Disk space usage
- Memory and CPU usage

### Log Management

Consider integrating with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana + Prometheus** for metrics
- **Sentry** for error tracking
- **DataDog** or **New Relic** for APM

## 🌐 Reverse Proxy Deployment

### Behind Existing Nginx

If deploying behind an existing Nginx:

```nginx
# Add to your existing nginx configuration
upstream fancy_planties {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name plants.your-domain.com;
    
    location / {
        proxy_pass http://fancy_planties;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Behind Cloudflare

1. Set up DNS A record pointing to your server
2. Enable Cloudflare proxy (orange cloud)
3. Configure SSL/TLS to "Full (strict)"
4. Enable security features as needed

## 📈 Scaling Considerations

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer**: Use Nginx, HAProxy, or cloud load balancer
2. **Database**: Consider read replicas or managed database service
3. **File Storage**: Move to S3-compatible storage for images
4. **Caching**: Add Redis for session storage and caching
5. **CDN**: Use CloudFront, Cloudflare, or similar for static assets

### Vertical Scaling

Resource recommendations by user count:

| Users | RAM | CPU | Storage |
|-------|-----|-----|---------|
| 1-100 | 2GB | 2 cores | 20GB |
| 100-1K | 4GB | 4 cores | 50GB |
| 1K-10K | 8GB | 8 cores | 100GB |
| 10K+ | 16GB+ | 16+ cores | 200GB+ |

---

For additional help, see the [troubleshooting section](./TROUBLESHOOTING.md) or [open an issue](https://github.com/your-repo/fancy-planties/issues).