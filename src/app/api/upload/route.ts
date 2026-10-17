import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// إعدادات الـ Route لضمان زيادة وقت الرفع والدعم الديناميكي
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// إعدادات كلووديناري
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // التحقق من حجم الملف (تحديد الحد الأقصى بـ 10 ميجابايت لتجنب أخطاء Vercel)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف كبير جداً! يرجى رفع ملف أقل من 10 ميجابايت." },
        { status: 413 }
      );
    }

    // 1. تحويل الملف لـ Buffer بطريقة متوافقة تماماً مع Next.js و Node.js
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. تحديد الـ Resource Type تلقائياً
    const isVideo = file.type.startsWith("video/");
    const resourceType = isVideo ? "video" : "auto";

    // 3. تحويل الـ Buffer لـ Base64
    const base64Data = buffer.toString("base64");
    const fileUri = `data:${file.type};base64,${base64Data}`;

    // 4. الرفع المباشر والآمن
    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: "cyber-portfolio",
      resource_type: resourceType,
    });

    // إرجاع الرابط بنجاح
    return NextResponse.json({ url: uploadResult.secure_url });

  } catch (error: any) {
    console.error("Cloudinary upload internal error:", error);
    return NextResponse.json({ error: error.message || "Invalid file upload" }, { status: 500 });
  }
}