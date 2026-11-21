import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { adminAuth, isAdminEmail } from "../../lib/firebase-admin";
import { ADMIN_SESSION_COOKIE } from "../../lib/auth-constants";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  let allowed = false;

  if (session) {
    const decoded = await adminAuth().verifySessionCookie(session, true).catch(() => null);
    allowed = decoded?.admin === true || isAdminEmail(decoded?.email);
  }

  if (!allowed) redirect("/");
  return <>{children}</>;
}
