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
      min_uptime: '10s',
      
      // Enhanced signal handling
      kill_timeout: 10000,
      shutdown_with_message: true,
      wait_ready: true,
      listen_timeout: 5000,
      
      // Interpreter arguments untuk pnpm
      interpreter: '/bin/bash',
      interpreter_args: '-c',
      
      // Stop signal
      stop_exit_codes: [0],
      
      // Process management
      instance_var: 'INSTANCE_ID',
      merge_logs: true,
      
      // Environment specific untuk Next.js
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      }
    }
  ]
};