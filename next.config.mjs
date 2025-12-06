/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.resolve.fallback = { fs: false, net: false, tls: false };
        config.externals.push('pino-pretty', 'lokijs', 'encoding', 'pino', 'thread-stream');
        return config;
    },
    // Empty turbopack config to silence the warning
    turbopack: {},
    // Transpile wagmi connectors
    transpilePackages: ['@wagmi/connectors'],
    // Ignore problematic test files in node_modules
    serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
};

export default nextConfig;
