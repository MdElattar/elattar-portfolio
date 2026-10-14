/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! تحذير !!
    // يسمح بإنهاء الـ Build بنجاح حتى لو كان المشروع يحتوي على أخطاء TypeScript.
    ignoreBuildErrors: true,
  },
  eslint: {
    // تجاهل أخطاء ESLint أيضاً أثناء الـ Build إن وجدت
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;    