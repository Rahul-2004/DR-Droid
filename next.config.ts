import type { NextConfig } from "next";

const developmentEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
const securityHeaders = [
  { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline'${developmentEval}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com; upgrade-insecure-requests` },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() { return [{ source: "/(.*)", headers: securityHeaders }]; },
};

export default nextConfig;
