/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // When Supabase rejects an email link's redirect it falls back to the Site
  // URL, so the link lands on the home page, which ignores it. Send those on to
  // the callback (the query passes through) instead of silently dropping them.
  async redirects() {
    return ['code', 'error_description'].map((key) => ({
      source: '/',
      has: [{ type: 'query', key }],
      destination: '/auth/callback?next=/admin/account',
      permanent: false,
    }));
  },
};

export default nextConfig;
