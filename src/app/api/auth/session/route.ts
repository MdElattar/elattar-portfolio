import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, isAdminEmail } from "../../../../lib/firebase-admin";
import { ADMIN_SESSION_COOKIE } from "../../../../lib/auth-constants";

const schema = z.object({ idToken: z.string().min(10) });
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid token payload" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(parsed.data.idToken);
    if (decoded.admin !== true && !isAdminEmail(decoded.email)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const sessionCookie = await adminAuth().createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return response;
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
