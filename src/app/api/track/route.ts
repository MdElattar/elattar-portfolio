import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "../../../lib/firebase-admin";
import { getClientIp } from "../../../lib/client-ip";
import { limiter } from "../../../lib/rate-limit";

const schema = z.object({
  projectId: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(["views", "liveClicks", "codeClicks"]),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = await limiter.limit(`track:${ip}`);
  if (!success) return NextResponse.json({ ok: false }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const { projectId, type } = parsed.data;
    await adminDb().doc(`projects/${projectId}`).update({ [type]: FieldValue.increment(1) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track update failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
