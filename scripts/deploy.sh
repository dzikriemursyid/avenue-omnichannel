#!/bin/bash

# Avenue CRM Auto-Deployment Script
# This script handles automatic deployment from GitHub production branch

set -e  # Exit on any error

# Configuration
PROJECT_DIR="/home/dzikrie/avenue-omnichannel"
LOG_FILE="/var/log/github-deployments.log"
BACKUP_DIR="/home/dzikrie/avenue-omnichannel-backups"
PM2_APP_NAME="avenue-crm"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Start deployment
log "🚀 Starting auto-deployment process..."

# Change to project directory
cd "$PROJECT_DIR" || {
    error "Failed to change to project directory: $PROJECT_DIR"
    exit 1
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "package.json not found! Are we in the right directory?"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup of current state
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
log "📦 Creating backup: $BACKUP_NAME"
cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME" || {
    warning "Failed to create backup, continuing anyway..."
}

# Get current branch and commit
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse HEAD)
log "📋 Current state: $CURRENT_BRANCH@$(echo $CURRENT_COMMIT | cut -c1-7)"

# Fetch latest changes
log "📥 Fetching latest changes from GitHub..."
git fetch origin || {
    error "Failed to fetch from origin"
    exit 1
}

# Check if we're on production branch
if [ "$CURRENT_BRANCH" != "production" ]; then
    log "🔄 Switching to production branch..."
    git checkout production || {
        error "Failed to checkout production branch"
        exit 1
    }
fi

# Pull latest changes
log "⬇️ Pulling latest changes..."
git pull origin production || {
    error "Failed to pull latest changes"
    exit 1
}

# Get new commit info
NEW_COMMIT=$(git rev-parse HEAD)
NEW_COMMIT_SHORT=$(echo $NEW_COMMIT | cut -c1-7)
COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s")

if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
    log "✅ No new changes detected"
    exit 0
fi

log "🆕 New commit: $NEW_COMMIT_SHORT - $COMMIT_MESSAGE"

# Stop PM2 application with timeout and better error handling
log "⏹️ Stopping PM2 application..."

# Function to stop PM2 with timeout
stop_pm2_with_timeout() {
    local timeout=30
    local count=0
    
    # Try graceful stop first
    if pm2 stop "$PM2_APP_NAME" 2>/dev/null; then
        log "✅ PM2 application stopped gracefully"
        return 0
    fi
    
    warning "PM2 graceful stop failed, trying force stop..."
    
    # Wait for process to stop with timeout
    while [ $count -lt $timeout ]; do
        if ! pm2 describe "$PM2_APP_NAME" 2>/dev/null | grep -q "online"; then
            log "✅ PM2 application stopped"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        if [ $((count % 10)) -eq 0 ]; then
            log "⏳ Waiting for PM2 to stop... ($count/$timeout seconds)"
        fi
    done
    
    warning "PM2 stop timeout reached, forcing process termination"
    return 1
}

# Try to stop PM2 with timeout
if ! stop_pm2_with_timeout; then
    warning "PM2 stop timeout, proceeding with force kill..."
fi

# Kill any orphaned Next.js processes on port 3000
log "🔍 Checking for orphaned processes on port 3000..."
ORPHANED_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$ORPHANED_PID" ]; then
    log "💀 Killing orphaned process(es): $ORPHANED_PID"
    kill -9 $ORPHANED_PID 2>/dev/null || true
    sleep 3
    
    # Verify port is free
    STILL_RUNNING=$(lsof -ti:3000 2>/dev/null || true)
    if [ ! -z "$STILL_RUNNING" ]; then
        error "Failed to kill process on port 3000: $STILL_RUNNING"
        # Try one more time with SIGKILL
        kill -9 $STILL_RUNNING 2>/dev/null || true
        sleep 2
    fi
fi

# Ensure port 3000 is completely free before proceeding
log "🔍 Final port check..."
if lsof -ti:3000 >/dev/null 2>&1; then
    error "Port 3000 still occupied after cleanup attempts"
    exit 1
else
    log "✅ Port 3000 is free, proceeding with deployment"
fi

# Install/update dependencies
log "📦 Installing dependencies..."
pnpm install || {
    error "Failed to install dependencies"
    # Try to restore from backup
    if [ -d "$BACKUP_DIR/$BACKUP_NAME" ]; then
        log "🔄 Restoring from backup..."
        cp -r "$BACKUP_DIR/$BACKUP_NAME/"* "$PROJECT_DIR/"
    fi
    exit 1
}

# Build the application
log "🔨 Building application..."
pnpm build || {
    error "Failed to build application"
    # Try to restore from backup
    if [ -d "$BACKUP_DIR/$BACKUP_NAME" ]; then
        log "🔄 Restoring from backup..."
        cp -r "$BACKUP_DIR/$BACKUP_NAME/"* "$PROJECT_DIR/"
    fi
    exit 1
}

# Restart PM2 application with comprehensive error handling
log "🚀 Starting PM2 application..."

# Function to start PM2 with retries and timeout
start_pm2_with_retries() {
    local max_retries=3
    local retry_count=0
    local start_timeout=60
    
    while [ $retry_count -lt $max_retries ]; do
        retry_count=$((retry_count + 1))
        log "🔄 PM2 start attempt $retry_count/$max_retries"
        
        # Try different start methods in order
        if pm2 start ecosystem.config.js 2>/dev/null; then
            log "✅ PM2 started using ecosystem config"
            
            # Wait for application to be ready with timeout
            local wait_count=0
            while [ $wait_count -lt $start_timeout ]; do
                if pm2 describe "$PM2_APP_NAME" 2>/dev/null | grep -q "online"; then
                    log "✅ PM2 application is online"
                    return 0
                fi
                sleep 1
                wait_count=$((wait_count + 1))
                if [ $((wait_count % 15)) -eq 0 ]; then
                    log "⏳ Waiting for PM2 to start... ($wait_count/$start_timeout seconds)"
                fi
            done
            
            warning "PM2 start timeout reached on attempt $retry_count"
        else
            warning "PM2 start failed on attempt $retry_count"
        fi
        
        # Clean up for retry
        if [ $retry_count -lt $max_retries ]; then
            log "🧹 Cleaning up for retry..."
            pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
            
            # Kill any processes on port 3000
            PORT_USER=$(lsof -ti:3000 2>/dev/null || true)
            if [ ! -z "$PORT_USER" ]; then
                log "💀 Killing process on port 3000: $PORT_USER"
                kill -9 $PORT_USER 2>/dev/null || true
                sleep 2
            fi
            
            sleep 3
        fi
    done
    
    error "All PM2 start attempts failed after $max_retries retries"
    return 1
}

# Try to start PM2 with retries
if ! start_pm2_with_retries; then
    error "Failed to start PM2 application"
    
    # Attempt rollback
    if [ -d "$BACKUP_DIR/$BACKUP_NAME" ]; then
        log "🔄 Attempting rollback to backup: $BACKUP_NAME"
        
        # Stop any running processes
        pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
        PORT_USER=$(lsof -ti:3000 2>/dev/null || true)
        if [ ! -z "$PORT_USER" ]; then
            kill -9 $PORT_USER 2>/dev/null || true
        fi
        
        # Restore backup
        cp -r "$BACKUP_DIR/$BACKUP_NAME/"* "$PROJECT_DIR/"
        
        # Try to start with backup
        if pm2 start ecosystem.config.js 2>/dev/null; then
            log "✅ Rollback successful, application restored"
        else
            error "Rollback failed, manual intervention required"
        fi
    fi
    
    exit 1
fi

log "✅ PM2 application started successfully"

# Wait for application to be ready
log "⏳ Waiting for application to be ready..."
sleep 5

# Health check
log "🔍 Performing health check..."
HEALTH_CHECK_URL="http://localhost:3000/api/webhooks/twilio?test=connectivity"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log "✅ Health check passed"
else
    error "Health check failed (HTTP $HTTP_CODE)"
    exit 1
fi

# Save PM2 process list
pm2 save || {
    warning "Failed to save PM2 process list"
}

# Clean up old backups (keep last 5)
log "🧹 Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +6 | xargs -r rm -rf

# Update nginx configuration if needed
log "🔄 Checking nginx configuration..."
nginx -t && {
    log "✅ Nginx configuration is valid"
} || {
    warning "Nginx configuration test failed"
}

# Final success message
log "🎉 Deployment completed successfully!"
log "📊 Deployment summary:"
log "   - Repository: avenue-omnichannel"
log "   - Branch: production"
log "   - Commit: $NEW_COMMIT_SHORT"
log "   - Message: $COMMIT_MESSAGE"
log "   - Deployed at: $(date)"
log "   - Backup: $BACKUP_NAME"

# Send deployment status notification
send_deployment_notification() {
    local status="$1"
    local message="$2"
    local details="$3"
    
    # Log to deployment status file
    local status_file="/var/log/deployment-status.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$status_file" << EOF
{
  "timestamp": "$timestamp",
  "status": "$status",
  "repository": "avenue-omnichannel",
  "branch": "production",
  "commit": "$NEW_COMMIT_SHORT",
  "commit_message": "$COMMIT_MESSAGE",
  "message": "$message",
  "details": "$details",
  "backup": "$BACKUP_NAME"
}
EOF
    
    info "📊 Deployment status saved to $status_file"
    
    # Optional: Send to external monitoring (uncomment if needed)
    # if [ ! -z "$DEPLOYMENT_WEBHOOK_URL" ]; then
    #     curl -X POST -H "Content-Type: application/json" \
    #          -d "@$status_file" \
    #          "$DEPLOYMENT_WEBHOOK_URL" || true
    # fi
}

# Send success notification
send_deployment_notification "success" "Deployment completed successfully" "Application is running on port 3000"

log "✅ Auto-deployment process completed successfully!"
exit 0