/**
 * PM2 process definition for the production server.
 *
 * The app is a standard Next.js server (not `output: 'standalone'`), so it is
 * started through `npm start`, which runs `next start -p 5000 -H 0.0.0.0`.
 * nginx terminates TLS on 443 and reverse-proxies to 127.0.0.1:5000.
 *
 * Environment variables are NOT defined here — they live in `.env` in the app
 * directory (gitignored) and are loaded by Next.js at boot. Never put secrets
 * in this file; it is committed.
 *
 * Usage on the server:
 *   pm2 start ecosystem.config.js      # first time
 *   pm2 reload futureline-web          # zero-downtime restart after a deploy
 *   pm2 save && pm2 startup            # survive reboots
 */
module.exports = {
  apps: [
    {
      // Must match APP_NAME in deploy.sh. Plain `futureline` is a different,
      // unrelated app on this server (port 3000).
      name: 'futureline-web',
      cwd: __dirname,
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      // Next.js can briefly exceed the default heap on a large build.
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      out_file: 'logs/pm2-out.log',
      error_file: 'logs/pm2-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
