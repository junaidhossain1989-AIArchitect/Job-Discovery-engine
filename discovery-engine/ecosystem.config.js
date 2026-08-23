module.exports = {
  apps: [
    {
      name: 'job-discovery-engine',
      script: './node_modules/.bin/tsx.cmd',
      args: 'discovery-engine/cronRunner.ts',
      cwd: './',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};