import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { arrayRemove, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "../../../lib/firebase-admin";
import { getClientIp } from "../../../lib/client-ip";
import { limiter } from "../../../lib/rate-limit";

const projectId = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const createSchema = z.object({
  projectId,
  user: z.string().min(1).max(80),
  clientType: z.string().max(80).optional(),
  rating: z.number().int().min(1).max(5),
  uiRating: z.number().int().min(1).max(5).optional(),
  codeQualityRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(1000),
});
const deleteSchema = z.object({ projectId, reviewId: z.string().min(1).max(120) });

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = await limiter.limit(`review:${ip}`);
  if (!success) return NextResponse.json({ ok: false }, { status: 429 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { projectId: id, ...reviewData } = parsed.data;
  const review = { ...reviewData, id: randomUUID(), createdAt: new Date().toISOString() };

  try {
    await adminDb()
      .doc(`projects/${id}`)
      .update({ reviews: FieldValue.arrayUnion(review) });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    console.error("Review create failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const { success } = await limiter.limit(`review-delete:${ip}`);
  if (!success) return NextResponse.json({ ok: false }, { status: 429 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const ref = adminDb().doc(`projects/${parsed.data.projectId}`);
    const snapshot = await ref.get();
    const reviews = (snapshot.data()?.reviews || []) as Array<{ id?: string }>;
    const target = reviews.find((review) => review.id === parsed.data.reviewId);
    if (!target) return NextResponse.json({ ok: false }, { status: 404 });

    await ref.update({ reviews: arrayRemove(target) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review delete failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
