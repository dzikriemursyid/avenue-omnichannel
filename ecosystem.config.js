module.exports = {
  apps: [
    {
      name: 'avenue-crm',
      script: 'pnpm',
      args: 'start',
      cwd: '/home/dzikrie/avenue-omnichannel',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/dzikrie/avenue-omnichannel/logs/error.log',
      out_file: '/home/dzikrie/avenue-omnichannel/logs/access.log',
      log_file: '/home/dzikrie/avenue-omnichannel/logs/combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};