# Cron Job Setup Guide

Panduan lengkap untuk setup cron job dalam sistem WhatsApp conversation window tracking.

## 🕐 Apa itu Cron Job?

Cron job adalah **task scheduler** di Linux/Unix yang menjalankan perintah secara otomatis pada waktu tertentu. Seperti "alarm" yang menjalankan script/command berulang-ulang tanpa intervensi manual.

### Kegunaan dalam Project Ini
Cron job digunakan untuk memanggil API auto-close secara berkala (setiap 15 menit) untuk menutup conversation yang sudah melewati 24-hour window.

## 📅 Format Cron Job

```bash
* * * * * command-to-run
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, dimana 0 & 7 = Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

### Karakter Khusus
- `*` = Semua nilai (any value)
- `,` = Pemisah nilai (value separator) - contoh: `1,3,5`
- `-` = Range nilai - contoh: `1-5`
- `/` = Step values - contoh: `*/15` = setiap 15 unit

## 📝 Contoh-contoh Cron Job

```bash
# Setiap 15 menit
*/15 * * * * command

# Setiap jam pada menit ke-0
0 * * * * command

# Setiap hari jam 2:30 AM
30 2 * * * command

# Setiap Senin jam 9:00 AM
0 9 * * 1 command

# Setiap awal bulan jam 12:00 AM
0 0 1 * * command

# Setiap 5 menit dari jam 9-17 (jam kerja)
*/5 9-17 * * 1-5 command
```

## 🚀 Setup untuk WhatsApp Auto-Close

### 1. Buka Crontab Editor

```bash
# Buka editor crontab untuk user saat ini
crontab -e

# Atau buka sebagai user tertentu (jika perlu)
sudo crontab -u username -e
```

**Note**: Pertama kali akan diminta memilih editor (pilih nano untuk yang mudah).

### 2. Tambahkan Job untuk Auto-Close

Tambahkan baris berikut di akhir file:

```bash
# Auto-close expired WhatsApp conversations every 15 minutes
*/15 * * * * curl -X POST -H "Content-Type: application/json" https://your-domain.com/api/conversations/auto-close

# Dengan authentication (jika menggunakan CRON_SECRET)
*/15 * * * * curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/conversations/auto-close

# Dengan logging (recommended)
*/15 * * * * curl -X POST -H "Content-Type: application/json" https://your-domain.com/api/conversations/auto-close >> /var/log/whatsapp-auto-close.log 2>&1
```

### 3. Save dan Exit

- **Nano**: `Ctrl+X`, lalu `Y`, lalu `Enter`
- **Vim**: `:wq` lalu `Enter`
- **Emacs**: `Ctrl+X Ctrl+S`, lalu `Ctrl+X Ctrl+C`

## ✅ Verifikasi dan Monitoring

### Melihat Cron Job Aktif

```bash
# Lihat semua cron job untuk user saat ini
crontab -l

# Lihat cron job untuk user tertentu
sudo crontab -u username -l
```

### Monitoring Log Cron Job

```bash
# Lihat log sistem cron (Ubuntu/Debian)
tail -f /var/log/syslog | grep CRON

# Lihat log sistem cron (CentOS/RedHat)
tail -f /var/log/cron

# Lihat log custom kita (jika menggunakan logging)
tail -f /var/log/whatsapp-auto-close.log
```

### Check Status Cron Service

```bash
# Ubuntu/Debian
systemctl status cron

# CentOS/RedHat
systemctl status crond

# Start service jika tidak aktif
sudo systemctl start cron
sudo systemctl enable cron
```

## 🧪 Testing dan Development

### 1. Test Manual Call

Sebelum setup cron, test dulu API endpoint:

```bash
# Test basic call
curl -X POST https://your-domain.com/api/conversations/auto-close

# Test dengan authentication
curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/conversations/auto-close

# Test dan lihat response detail
curl -X POST -H "Content-Type: application/json" https://your-domain.com/api/conversations/auto-close -v
```

### 2. Test dengan Interval Pendek

Untuk testing, gunakan interval lebih pendek:

```bash
# Test setiap 2 menit (HANYA UNTUK TESTING)
*/2 * * * * curl -X POST https://your-domain.com/api/conversations/auto-close

# Jangan lupa ganti kembali ke */15 setelah testing!
```

### 3. Test Script Lokal

Buat script test untuk development:

```bash
# Buat file test-cron.sh
#!/bin/bash
echo "Testing auto-close at $(date)"
node scripts/test-conversation-window.js
echo "Test completed"

# Beri permission
chmod +x test-cron.sh

# Test manual
./test-cron.sh

# Add ke cron untuk testing
*/5 * * * * /path/to/test-cron.sh >> /var/log/cron-test.log 2>&1
```

## 🛠️ Advanced Configuration

### Dengan Environment Variables

```bash
# Jika perlu set environment variables
*/15 * * * * export NODE_ENV=production && curl -X POST https://your-domain.com/api/conversations/auto-close

# Atau source dari file
*/15 * * * * source /path/to/.env && curl -X POST https://your-domain.com/api/conversations/auto-close
```

### Dengan Error Handling

```bash
# Cron job dengan retry logic
*/15 * * * * curl -X POST https://your-domain.com/api/conversations/auto-close || curl -X POST https://backup-domain.com/api/conversations/auto-close
```

### Dengan Notification

```bash
# Send email jika ada error (jika mail configured)
*/15 * * * * curl -X POST https://your-domain.com/api/conversations/auto-close || echo "Auto-close failed at $(date)" | mail -s "Cron Job Failed" admin@yourdomain.com
```

## 🔧 Troubleshooting

### Cron Job Tidak Berjalan

1. **Check cron service**:
   ```bash
   systemctl status cron
   ```

2. **Check syntax crontab**:
   ```bash
   crontab -l
   ```

3. **Check permissions**:
   ```bash
   ls -la /usr/bin/curl
   which curl
   ```

### Command Tidak Ditemukan

```bash
# Gunakan full path untuk command
*/15 * * * * /usr/bin/curl -X POST https://your-domain.com/api/conversations/auto-close

# Check path command
which curl
```

### Environment Variables Tidak Loaded

```bash
# Set PATH di crontab
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Atau source profile
*/15 * * * * source ~/.profile && curl -X POST https://your-domain.com/api/conversations/auto-close
```

## 🎯 Recommended Setup untuk Production

```bash
# Final cron job configuration
# Auto-close expired WhatsApp conversations every 15 minutes with logging
*/15 * * * * /usr/bin/curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/conversations/auto-close >> /var/log/whatsapp-auto-close.log 2>&1

# Log rotation untuk mencegah log file terlalu besar
# Tambahkan di /etc/logrotate.d/whatsapp-auto-close:
/var/log/whatsapp-auto-close.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

## 📋 Checklist Setup

- [ ] Cron service running (`systemctl status cron`)
- [ ] Crontab syntax correct (`crontab -l`)
- [ ] API endpoint accessible (manual curl test)
- [ ] Authentication working (if using CRON_SECRET)
- [ ] Logging configured
- [ ] Log rotation setup (optional)
- [ ] Monitoring alerts setup (optional)

## 🔗 Alternative Solutions

### 1. Systemd Timer (Modern Linux)

```bash
# Buat service file: /etc/systemd/system/whatsapp-auto-close.service
[Unit]
Description=WhatsApp Auto-close Conversations

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST https://your-domain.com/api/conversations/auto-close

# Buat timer file: /etc/systemd/system/whatsapp-auto-close.timer
[Unit]
Description=Run WhatsApp auto-close every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target

# Enable dan start
sudo systemctl enable whatsapp-auto-close.timer
sudo systemctl start whatsapp-auto-close.timer
```

### 2. Docker dengan Cron

```dockerfile
# Dockerfile untuk cron container
FROM alpine:latest
RUN apk add --no-cache curl
COPY crontab /etc/crontabs/root
CMD ["crond", "-f", "-d", "8"]
```

### 3. Cloud Functions (AWS Lambda, Vercel Cron, etc.)

Gunakan cloud-based cron alternatives untuk serverless deployment.

---

Dengan setup ini, conversation window akan otomatis dikelola sesuai kebijakan WhatsApp 24-hour window! 🚀