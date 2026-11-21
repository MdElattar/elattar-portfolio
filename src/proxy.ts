import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "./lib/auth-constants";

// Next.js 16 renamed middleware to Proxy. This is the lightweight cookie check;
// full verification happens in src/app/admin/layout.tsx and API routes.
export function proxy(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!session) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
