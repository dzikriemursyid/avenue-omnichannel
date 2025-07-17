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

# Stop PM2 application
log "⏹️ Stopping PM2 application..."
pm2 stop "$PM2_APP_NAME" || {
    warning "Failed to stop PM2 application, continuing..."
}

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

# Restart PM2 application
log "🚀 Restarting PM2 application..."
pm2 restart "$PM2_APP_NAME" || {
    error "Failed to restart PM2 application"
    exit 1
}

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

# Send notification (optional)
if command -v curl &> /dev/null; then
    info "📲 Sending deployment notification..."
    # You can add webhook notification here if needed
    # curl -X POST -H "Content-Type: application/json" \
    #      -d '{"text":"Deployment completed: '"$NEW_COMMIT_SHORT"'"}' \
    #      "$SLACK_WEBHOOK_URL" || true
fi

log "✅ Auto-deployment process completed successfully!"
exit 0