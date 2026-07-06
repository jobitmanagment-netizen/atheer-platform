module.exports = {
  apps: [{
    name: 'atheer-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '1G',
    error_file: '/var/log/atheer/error.log',
    out_file: '/var/log/atheer/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
  }]
};
