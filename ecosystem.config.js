module.exports = {
  apps: [
    {
      name: 'job-discovery-engine',
      script: 'npx',
      args: 'tsx discovery-engine/cronRunner.ts',
      cwd: './',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};