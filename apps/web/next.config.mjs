/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: [
    '@acongm/chat-ui',
    '@acongm/ui-theme',
    '@acongm/kb-types',
    '@acongm/agent-session-sdk',
    '@acongm/assistant-ui-theme',
  ],
};

export default config;
