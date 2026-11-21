import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, isAdminEmail } from "./firebase-admin";
import { ADMIN_SESSION_COOKIE } from "./auth-constants";

export { ADMIN_SESSION_COOKIE };

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function requireAdmin(): Promise<DecodedIdToken> {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!session) throw new HttpError(401, "Unauthorized");

  const decoded = await adminAuth().verifySessionCookie(session, true).catch(() => null);
  if (!decoded || (decoded.admin !== true && !isAdminEmail(decoded.email))) {
    throw new HttpError(403, "Forbidden");
  }
  return decoded;
}

export async function requireAdminOrResponse(): Promise<
  { decoded: DecodedIdToken; response?: never } | { decoded?: never; response: NextResponse }
> {
  try {
    return { decoded: await requireAdmin() };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        response: NextResponse.json(
          { ok: false, error: error.message },
          { status: error.status },
        ),
      };
    }
    throw error;
  }
}
