# Production Setup Guide

🚀 **Complete guide for deploying Avenue Omnichannel WhatsApp CRM to VPS**

This guide covers the complete setup process for deploying the Avenue Omnichannel system to a VPS in production mode.

## 📋 Prerequisites

### Server Requirements
- **VPS/Server**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB SSD
- **CPU**: 2+ cores recommended
- **Network**: Stable internet connection with static IP

### Required Accounts & Services
- **Domain**: Your own domain (e.g., `yourdomain.com`)
- **Supabase**: Production project setup
- **Twilio**: WhatsApp Business API account
- **SSL Certificate**: Let's Encrypt or commercial SSL

## 🔧 Step 1: Server Setup

### 1.1 Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Create application user
sudo useradd -m -s /bin/bash avenue
sudo usermod -aG sudo avenue

# Switch to application user
sudo su - avenue
```

### 1.2 Install Node.js and pnpm

```bash
# Install Node.js 18+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm globally
sudo npm install -g pnpm

# Verify installations
node --version  # Should be 18+
pnpm --version
```

### 1.3 Install PM2 for Process Management

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2
```

## 🗂️ Step 2: Application Deployment

### 2.1 Clone and Setup Application

```bash
# Navigate to application directory
cd /home/avenue

# Clone the repository
git clone https://github.com/yourusername/avenue-omnichannel.git
cd avenue-omnichannel

# Install dependencies
pnpm install

# Make sure the avenue user owns the files
sudo chown -R avenue:avenue /home/avenue/avenue-omnichannel
```

### 2.2 Environment Configuration

```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

Configure the following environment variables:

```env
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Supabase Configuration (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Cron Job Security
CRON_SECRET=your-secure-random-string

# Optional: Additional security
WEBHOOK_SECRET=your-webhook-secret
```

### 2.3 Build Application

```bash
# Build the application
pnpm run build

# Test the build
pnpm start &
# Check if it's running on port 3000
curl http://localhost:3000
# Stop the test process
pkill -f "next start"
```

## 🌐 Step 3: Domain and SSL Setup

### 3.1 Domain Configuration

1. **Point your domain to your VPS IP**:
   - Create an A record: `yourdomain.com` → `your-vps-ip`
   - Create an A record: `www.yourdomain.com` → `your-vps-ip`

2. **Verify DNS propagation**:
   ```bash
   dig yourdomain.com
   nslookup yourdomain.com
   ```

### 3.2 Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/avenue-omnichannel
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Special handling for webhook endpoints
    location /api/webhooks/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
    }
    
    # Static files (if needed)
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
}
```

### 3.3 Enable Nginx Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/avenue-omnichannel /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3.4 SSL Certificate Setup

```bash
# Obtain SSL certificate using Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron job
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 Step 4: Process Management with PM2

### 4.1 PM2 Configuration

```bash
# Create PM2 ecosystem file
nano /home/avenue/avenue-omnichannel/ecosystem.config.js
```

Add the following configuration:

```javascript
module.exports = {
  apps: [
    {
      name: 'avenue-omnichannel',
      script: 'npm',
      args: 'start',
      cwd: '/home/avenue/avenue-omnichannel',
      instances: 2, // Use 2 instances for better performance
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: '/home/avenue/logs/avenue-omnichannel.log',
      out_file: '/home/avenue/logs/avenue-omnichannel-out.log',
      error_file: '/home/avenue/logs/avenue-omnichannel-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      restart_delay: 1000,
      max_restarts: 5,
      min_uptime: '10s'
    }
  ]
};
```

### 4.2 Create Log Directory and Start Application

```bash
# Create logs directory
mkdir -p /home/avenue/logs

# Start the application with PM2
cd /home/avenue/avenue-omnichannel
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Check application status
pm2 status
pm2 logs avenue-omnichannel
```

## 🔗 Step 5: Twilio Webhook Configuration

### 5.1 Update Twilio Webhook URLs

1. **Login to Twilio Console**
2. **Navigate to Messaging → Settings → WhatsApp Sandbox Settings** (or your approved WhatsApp number)
3. **Update webhook URLs**:
   - **Incoming Messages**: `https://yourdomain.com/api/webhooks/twilio/incoming`
   - **Status Callbacks**: `https://yourdomain.com/api/webhooks/twilio` (if you have status webhook)

### 5.2 Test Webhook Connectivity

```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/twilio/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Test+message&From=whatsapp:+1234567890&To=whatsapp:+0987654321"

# Check logs
pm2 logs avenue-omnichannel
```

## ⏰ Step 6: Cron Job Setup

### 6.1 Auto-Close Conversations Cron Job

```bash
# Edit crontab
crontab -e

# Add cron job to auto-close expired conversations every 15 minutes
*/15 * * * * curl -X POST -H "Authorization: Bearer your-secure-cron-secret" https://yourdomain.com/api/conversations/auto-close >> /home/avenue/logs/cron.log 2>&1

# Add daily restart cron job (optional, for memory management)
0 4 * * * /usr/bin/pm2 restart avenue-omnichannel >> /home/avenue/logs/cron.log 2>&1
```

### 6.2 Log Rotation Setup

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/avenue-omnichannel
```

Add the following configuration:

```
/home/avenue/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 avenue avenue
    postrotate
        /usr/bin/pm2 reloadLogs
    endscript
}
```

## 🗄️ Step 7: Database Setup

### 7.1 Supabase Production Configuration

1. **Create Production Supabase Project**
2. **Apply Database Schema**:
   ```bash
   # If using Supabase CLI
   supabase login
   supabase link --project-ref your-production-project-ref
   supabase db push
   
   # Or manually execute schema.sql in Supabase dashboard
   ```

3. **Configure Row Level Security Policies**
4. **Set up Real-time subscriptions** for required tables

### 7.2 Database Migration Script

```bash
# Create migration script
nano /home/avenue/scripts/migrate.sh
```

```bash
#!/bin/bash
# Database migration script

echo "Starting database migration..."
cd /home/avenue/avenue-omnichannel

# Run any pending migrations
# Add your migration commands here

echo "Database migration completed."
```

```bash
# Make script executable
chmod +x /home/avenue/scripts/migrate.sh
```

## 🔒 Step 8: Security Hardening

### 8.1 Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check firewall status
sudo ufw status
```

### 8.2 Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure Fail2Ban for Nginx
sudo nano /etc/fail2ban/jail.local
```

Add the following configuration:

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 3600
```

```bash
# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### 8.3 System Monitoring

```bash
# Install system monitoring tools
sudo apt install htop iotop nethogs

# Setup system monitoring script
nano /home/avenue/scripts/monitor.sh
```

```bash
#!/bin/bash
# System monitoring script

echo "=== System Status $(date) ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)"
echo "Memory Usage:"
free -h
echo "Disk Usage:"
df -h
echo "PM2 Status:"
pm2 status
echo "Nginx Status:"
sudo systemctl status nginx --no-pager
```

## 📊 Step 9: Monitoring & Logging

### 9.1 Application Monitoring

```bash
# Monitor PM2 processes
pm2 monit

# View real-time logs
pm2 logs avenue-omnichannel --follow

# Check application health
curl -f https://yourdomain.com/health || echo "Application is down"
```

### 9.2 Log Analysis

```bash
# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View application logs
tail -f /home/avenue/logs/avenue-omnichannel.log
```

## 🚀 Step 10: Deployment Automation

### 10.1 Deployment Script

```bash
# Create deployment script
nano /home/avenue/scripts/deploy.sh
```

```bash
#!/bin/bash
# Deployment script

APP_DIR="/home/avenue/avenue-omnichannel"
BACKUP_DIR="/home/avenue/backups"

echo "Starting deployment..."

# Create backup
mkdir -p $BACKUP_DIR
cp -r $APP_DIR $BACKUP_DIR/avenue-omnichannel-$(date +%Y%m%d-%H%M%S)

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Build application
pnpm run build

# Restart application
pm2 restart avenue-omnichannel

# Check health
sleep 10
curl -f https://yourdomain.com/health || echo "Deployment may have failed"

echo "Deployment completed!"
```

```bash
# Make script executable
chmod +x /home/avenue/scripts/deploy.sh
```

### 10.2 Backup Script

```bash
# Create backup script
nano /home/avenue/scripts/backup.sh
```

```bash
#!/bin/bash
# Backup script

BACKUP_DIR="/home/avenue/backups"
DATE=$(date +%Y%m%d-%H%M%S)

echo "Starting backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/app-backup-$DATE.tar.gz -C /home/avenue avenue-omnichannel

# Backup database (if using local database)
# pg_dump your_database > $BACKUP_DIR/db-backup-$DATE.sql

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed!"
```

```bash
# Make script executable
chmod +x /home/avenue/scripts/backup.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/avenue/scripts/backup.sh >> /home/avenue/logs/backup.log 2>&1
```

## ✅ Step 11: Final Verification

### 11.1 System Health Check

```bash
# Check all services
sudo systemctl status nginx
pm2 status
sudo systemctl status fail2ban

# Test application endpoints
curl -f https://yourdomain.com/
curl -f https://yourdomain.com/api/health

# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### 11.2 WhatsApp Integration Test

1. **Send test message** to your WhatsApp number
2. **Check webhook logs**: `pm2 logs avenue-omnichannel`
3. **Verify database entries** in Supabase dashboard
4. **Test outbound messaging** through the application

### 11.3 Performance Testing

```bash
# Basic load test (install apache2-utils first)
sudo apt install apache2-utils
ab -n 100 -c 10 https://yourdomain.com/

# Monitor during load test
pm2 monit
```

## 🔧 Troubleshooting

### Common Issues

1. **Application won't start**:
   ```bash
   pm2 logs avenue-omnichannel
   pm2 restart avenue-omnichannel
   ```

2. **Webhook not receiving messages**:
   - Check Twilio webhook configuration
   - Verify SSL certificate is valid
   - Check firewall settings
   - Review Nginx logs

3. **Database connection issues**:
   - Verify Supabase credentials
   - Check network connectivity
   - Review environment variables

4. **High memory usage**:
   - Increase PM2 memory limit
   - Add more RAM to VPS
   - Optimize application code

### Maintenance Commands

```bash
# Update application
/home/avenue/scripts/deploy.sh

# Restart services
pm2 restart avenue-omnichannel
sudo systemctl restart nginx

# View logs
pm2 logs avenue-omnichannel
sudo tail -f /var/log/nginx/error.log

# Backup data
/home/avenue/scripts/backup.sh
```

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt SSL](https://letsencrypt.org/getting-started/)
- [Supabase Production Best Practices](https://supabase.com/docs/guides/platform/going-to-prod)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)

---

**🎉 Congratulations!** Your Avenue Omnichannel WhatsApp CRM is now running in production mode on your VPS.

For support, check the application logs and refer to the troubleshooting section above.