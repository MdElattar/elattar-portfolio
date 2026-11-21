import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminOrResponse } from "../../../../lib/require-admin";

export async function POST() {
  const guard = await requireAdminOrResponse();
  if (guard.response) return guard.response;

  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Cloudinary is not configured" }, { status: 500 });
  }

  const params = {
    timestamp: Math.round(Date.now() / 1000),
    folder: "cyber-portfolio",
    allowed_formats: "jpg,jpeg,png,webp,avif,mp4,webm",
  };
  const signature = cloudinary.utils.api_sign_request(params, secret);

  return NextResponse.json({
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      "dutmc0rf6",
  });
}
