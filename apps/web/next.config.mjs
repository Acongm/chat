/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  transpilePackages: [
    '@acongm/chat-ui',
    '@acongm/ui-theme',
    '@acongm/kb-types',
    '@acongm/kb-catalog',
    '@acongm/agent-session-sdk',
    '@acongm/assistant-ui-theme',
    '@acongm/auth-client',
    '@acongm/config',
  ],
};

export default config;
