module.exports = {
  apps: [{
    name: 'options-analyzer',
    script: 'npm',
    args: 'start',
    cwd: '/home/user/webapp',
    env: {
      NODE_ENV: 'production'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    out_file: './logs/app.log',
    error_file: './logs/error.log',
    combine_logs: true
  }, {
    name: 'options-analyzer-dev',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/user/webapp',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    watch: true,
    ignore_watch: ['node_modules', 'logs', '.git'],
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    out_file: './logs/dev.log',
    error_file: './logs/dev-error.log',
    combine_logs: true
  }]
};