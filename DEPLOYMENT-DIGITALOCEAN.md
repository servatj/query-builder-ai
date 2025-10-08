# Deploy Query Builder to Digital Ocean with Custom Domain

Complete guide to deploy the Query Builder application and landing page on a Digital Ocean droplet with your `maisql` domain.

## Prerequisites

- Digital Ocean droplet (Ubuntu 22.04 LTS recommended, minimum 2GB RAM)
- Domain: `maisql` pointed to your droplet's IP
- SSH access as root
- Your Anthropic API key

## Architecture Overview

```
maisql.com              → Landing page (Python HTTP server behind Caddy)
app.maisql.com          → Query Builder App (Docker sandbox mode)
```

---

## Step 1: Initial Server Setup

### 1.1 Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 1.2 Update System Packages

```bash
apt update && apt upgrade -y
```

### 1.3 Create a Non-Root User (Recommended)

```bash
adduser maisql
usermod -aG sudo maisql
usermod -aG docker maisql  # We'll create docker group later
```

### 1.4 Set Up Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

---

## Step 2: Install Required Software

### 2.1 Install Docker

```bash
# Install Docker dependencies
apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify Docker installation
docker --version
docker compose version

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add current user to docker group (if using non-root user)
usermod -aG docker $USER
```

### 2.2 Install Python 3 (Usually Pre-installed on Ubuntu)

```bash
# Check Python version
python3 --version

# Install pip if needed
apt install -y python3-pip

# Verify
python3 --version
pip3 --version
```

### 2.3 Install Caddy (Modern Web Server with Auto HTTPS)

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

# Verify Caddy installation
caddy version

# Enable Caddy service
systemctl enable caddy
```

### 2.4 Install Git

```bash
apt install -y git
git --version
```

---

## Step 3: Configure DNS

Before proceeding, configure your DNS records:

### DNS Records to Add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_DROPLET_IP | 3600 |
| A | app | YOUR_DROPLET_IP | 3600 |
| A | www | YOUR_DROPLET_IP | 3600 |

**Wait 5-10 minutes for DNS propagation before continuing.**

Verify DNS:
```bash
# Check from your local machine or droplet
dig maisql.com
dig app.maisql.com
```

---

## Step 4: Clone and Set Up Application

### 4.1 Create Application Directory

```bash
# Create directory for the application
mkdir -p /opt/maisql
cd /opt/maisql
```

### 4.2 Clone Your Repository

```bash
# Clone your repository
git clone https://github.com/servatj/query-builder-ai.git .

# Or if you prefer, use SCP to upload your files
# From your local machine:
# scp -r /Users/josepl/playground/query-builder root@YOUR_DROPLET_IP:/opt/maisql/
```

### 4.3 Set Correct Permissions

```bash
# If using non-root user
chown -R maisql:maisql /opt/maisql
chmod +x docker-start.sh docker-stop.sh docker-test.sh
chmod +x scripts/*.sh
```

---

## Step 5: Configure Environment Variables

### 5.1 Create Production Environment File

```bash
cd /opt/maisql

# Create .env file for Docker
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=mysql://root:rootpassword@mysql:3306/query_builder
SETTINGS_DATABASE_URL=mysql://root:rootpassword@mysql:3306/query_builder

# AI Provider Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_PORT=80

# MySQL Configuration
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=query_builder
MYSQL_USER=query_user
MYSQL_PASSWORD=query_password

# Sakila Demo Database (Sandbox)
SAKILA_PORT=3310
EOF
```

### 5.2 Update with Your Actual API Key

```bash
# Edit the .env file and replace 'your_anthropic_api_key_here' with your actual key
nano .env

# Or use sed
sed -i 's/your_anthropic_api_key_here/sk-ant-api03-YOUR_ACTUAL_KEY/' .env
```

### 5.3 Secure the Environment File

```bash
chmod 600 .env
```

---

## Step 6: Configure Caddy (Reverse Proxy with Auto HTTPS)

### 6.1 Create Caddyfile

```bash
cat > /etc/caddy/Caddyfile << 'EOF'
# Landing page - maisql.com
maisql.com, www.maisql.com {
    # Enable automatic HTTPS
    tls {
        protocols tls1.2 tls1.3
    }

    # Serve landing page
    reverse_proxy localhost:8080

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Enable compression
    encode gzip

    # Logging
    log {
        output file /var/log/caddy/maisql.log
        format json
    }
}

# Application - app.maisql.com
app.maisql.com {
    # Enable automatic HTTPS
    tls {
        protocols tls1.2 tls1.3
    }

    # Backend API
    handle /api/* {
        reverse_proxy localhost:3001
    }

    # Frontend (React app)
    handle {
        reverse_proxy localhost:80
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Enable compression
    encode gzip

    # Logging
    log {
        output file /var/log/caddy/app-maisql.log
        format json
    }
}
EOF
```

### 6.2 Create Log Directory

```bash
mkdir -p /var/log/caddy
chown caddy:caddy /var/log/caddy
```

### 6.3 Validate and Reload Caddy

```bash
# Validate Caddyfile syntax
caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
systemctl reload caddy

# Check Caddy status
systemctl status caddy
```

---

## Step 7: Set Up Landing Page

### 7.1 Create Systemd Service for Landing Page

```bash
cat > /etc/systemd/system/maisql-landing.service << 'EOF'
[Unit]
Description=Maisql Landing Page
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/maisql/landing
ExecStart=/usr/bin/python3 -m http.server 8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 7.2 Start Landing Page Service

```bash
# Reload systemd
systemctl daemon-reload

# Start the service
systemctl start maisql-landing

# Enable on boot
systemctl enable maisql-landing

# Check status
systemctl status maisql-landing
```

### 7.3 Update Landing Page Links

Since you'll be using app.maisql.com, update the landing page:

```bash
cd /opt/maisql/landing

# Update links to point to app.maisql.com instead of localhost
sed -i 's|http://localhost|https://app.maisql.com|g' index.html
```

---

## Step 8: Deploy Docker Sandbox

### 8.1 Build and Start Docker Containers

```bash
cd /opt/maisql

# Start sandbox mode with Docker Compose
docker compose -f docker-compose.sandbox.yml up -d

# Or use the convenience script
./docker-start.sh
# Select option 3 (Sandbox mode)
```

### 8.2 Wait for Containers to Initialize

```bash
# Watch the logs
docker compose -f docker-compose.sandbox.yml logs -f

# Wait until you see:
# - "MySQL init process done. Ready for start up."
# - "Backend server started on port 3001"
# - "Frontend server started"

# Press Ctrl+C to exit logs
```

### 8.3 Verify Containers are Running

```bash
# Check container status
docker compose -f docker-compose.sandbox.yml ps

# All containers should show "healthy" or "running"
```

### 8.4 Test Database Connection

```bash
# Test MySQL connection
docker exec -it mysql-settings mysql -u root -p -e "SHOW DATABASES;"
# Password: rootpassword

# Test Sakila database
docker exec -it mysql-sakila mysql -u root -p -e "USE sakila; SHOW TABLES;"
# Password: root
```

---

## Step 9: Security Hardening

### 9.1 Configure Fail2Ban (Protection Against Brute Force)

```bash
# Install Fail2Ban
apt install -y fail2ban

# Create local jail configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
EOF

# Start and enable Fail2Ban
systemctl start fail2ban
systemctl enable fail2ban
systemctl status fail2ban
```

### 9.2 Secure MySQL Ports

```bash
# Ensure MySQL ports are not exposed externally
# They should only be accessible within Docker network

# Verify with:
netstat -tuln | grep 3306
# Should show 127.0.0.1:3306 or docker network IPs only
```

### 9.3 Set Up Automatic Security Updates

```bash
# Install unattended-upgrades
apt install -y unattended-upgrades

# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades
```

### 9.4 Secure SSH (Optional but Recommended)

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Recommended changes:
# PermitRootLogin no  (if using non-root user)
# PasswordAuthentication no  (if using SSH keys)
# Port 2222  (change default SSH port)

# Restart SSH
systemctl restart sshd

# Remember to update firewall if you changed the port:
# ufw allow 2222/tcp
# ufw delete allow 22/tcp
```

---

## Step 10: Set Up Monitoring and Maintenance

### 10.1 Create Backup Script

```bash
cat > /opt/maisql/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/maisql/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MySQL databases
docker exec mysql-settings mysqldump -u root -prootpassword --all-databases > $BACKUP_DIR/mysql_$DATE.sql

# Backup environment file
cp /opt/maisql/.env $BACKUP_DIR/.env_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "mysql_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name ".env_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/maisql/scripts/backup.sh
```

### 10.2 Schedule Daily Backups

```bash
# Add to crontab
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * /opt/maisql/scripts/backup.sh >> /var/log/maisql-backup.log 2>&1
```

### 10.3 Monitor Docker Containers

```bash
# Create monitoring script
cat > /opt/maisql/scripts/monitor.sh << 'EOF'
#!/bin/bash
cd /opt/maisql

# Check if containers are running
RUNNING=$(docker compose -f docker-compose.sandbox.yml ps --format json | jq -r '.State' | grep -c "running")

if [ "$RUNNING" -lt 3 ]; then
    echo "Some containers are not running! Restarting..."
    docker compose -f docker-compose.sandbox.yml up -d
    systemctl restart maisql-landing
fi
EOF

chmod +x /opt/maisql/scripts/monitor.sh

# Add to crontab (runs every 5 minutes)
crontab -e
# Add:
*/5 * * * * /opt/maisql/scripts/monitor.sh >> /var/log/maisql-monitor.log 2>&1
```

### 10.4 View Logs

```bash
# Caddy logs
tail -f /var/log/caddy/maisql.log
tail -f /var/log/caddy/app-maisql.log

# Landing page logs
journalctl -u maisql-landing -f

# Docker logs
docker compose -f docker-compose.sandbox.yml logs -f

# System logs
journalctl -f
```

---

## Step 11: Testing and Verification

### 11.1 Test Landing Page

```bash
# From your local machine
curl -I https://maisql.com
# Should return 200 OK with HTTPS

# Or open in browser:
# https://maisql.com
```

### 11.2 Test Application

```bash
# From your local machine
curl -I https://app.maisql.com
# Should return 200 OK with HTTPS

# Test API endpoint
curl https://app.maisql.com/api/health
# Should return: {"status":"ok","timestamp":"..."}

# Or open in browser:
# https://app.maisql.com
```

### 11.3 Test Query Generation

1. Open https://app.maisql.com in browser
2. Select "Sakila Demo Database" from dropdown
3. Enter a natural language query: "Show me all action films"
4. Click "Generate SQL Query"
5. Verify it generates valid SQL
6. Click "Run Query" to execute

---

## Step 12: Maintenance Commands

### Restart All Services

```bash
# Restart Docker containers
cd /opt/maisql
docker compose -f docker-compose.sandbox.yml restart

# Restart landing page
systemctl restart maisql-landing

# Restart Caddy
systemctl restart caddy
```

### Stop All Services

```bash
# Stop Docker containers
docker compose -f docker-compose.sandbox.yml down

# Stop landing page
systemctl stop maisql-landing
```

### Update Application

```bash
cd /opt/maisql

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker compose -f docker-compose.sandbox.yml down
docker compose -f docker-compose.sandbox.yml up -d --build

# Restart landing page (if files changed)
systemctl restart maisql-landing
```

### View Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop
# or
top

# Disk usage
df -h
du -sh /opt/maisql/*
```

### Check SSL Certificate Status

```bash
# Caddy automatically manages certificates
# View certificate info:
caddy list-modules | grep tls
```

---

## Troubleshooting

### Issue: Containers Won't Start

```bash
# Check Docker logs
docker compose -f docker-compose.sandbox.yml logs

# Check if ports are already in use
netstat -tuln | grep -E '80|3001|3306|3310'

# Restart Docker service
systemctl restart docker
```

### Issue: Can't Access via Domain

```bash
# Check DNS resolution
dig maisql.com
dig app.maisql.com

# Check Caddy status
systemctl status caddy
journalctl -u caddy -n 50

# Verify Caddy is listening
netstat -tuln | grep -E '80|443'
```

### Issue: Database Connection Errors

```bash
# Check MySQL container
docker exec -it mysql-settings mysql -u root -prootpassword -e "SELECT 1;"

# Verify environment variables
docker compose -f docker-compose.sandbox.yml config

# Check backend logs
docker logs query-builder-backend
```

### Issue: Landing Page Not Loading

```bash
# Check service status
systemctl status maisql-landing

# Check if Python server is running
ps aux | grep python3

# Test locally
curl http://localhost:8080

# Check Caddy reverse proxy
curl -H "Host: maisql.com" http://localhost:8080
```

---

## Performance Optimization

### 1. Enable Docker Log Rotation

```bash
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker
```

### 2. Optimize MySQL (For Production with More Traffic)

```bash
# Edit MySQL configuration if needed
docker exec -it mysql-settings bash
# Inside container:
mysql -u root -prootpassword -e "SHOW VARIABLES LIKE '%buffer%';"
```

### 3. Monitor and Adjust Resources

```bash
# If containers are slow, increase droplet size via Digital Ocean dashboard
# Recommended: 2GB RAM minimum, 4GB for better performance
```

---

## Cost Estimate

**Digital Ocean Droplet Options:**

- Basic (2GB RAM, 1 vCPU): $12/month - Minimum recommended
- Basic (4GB RAM, 2 vCPU): $24/month - Better performance
- Regular (8GB RAM, 4 vCPU): $48/month - Production ready

**Domain:** ~$10-15/year (varies by registrar)

**Total:** ~$15-50/month depending on your needs

---

## Summary of URLs

After deployment, your application will be accessible at:

- **Landing Page:** https://maisql.com (and https://www.maisql.com)
- **Application:** https://app.maisql.com
- **API Health:** https://app.maisql.com/api/health

---

## Quick Command Reference

```bash
# View all services status
systemctl status caddy maisql-landing
docker compose -f docker-compose.sandbox.yml ps

# Restart everything
systemctl restart caddy maisql-landing
docker compose -f docker-compose.sandbox.yml restart

# View logs
journalctl -u maisql-landing -f
journalctl -u caddy -f
docker compose -f docker-compose.sandbox.yml logs -f

# Update application
cd /opt/maisql && git pull && docker compose -f docker-compose.sandbox.yml up -d --build

# Backup now
/opt/maisql/scripts/backup.sh
```

---

## Next Steps

1. ✅ Follow this guide step by step
2. ✅ Test both landing page and application
3. ✅ Set up monitoring and backups
4. ✅ Configure your domain DNS
5. ✅ Share your live site!

🎉 **Your Query Builder will be live at https://app.maisql.com**

For questions or issues, check the logs first, then review the troubleshooting section.
