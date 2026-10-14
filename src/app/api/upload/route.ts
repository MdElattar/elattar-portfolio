import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

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

    // 1. تحويل الملف لـ Buffer بطريقة متوافقة تماماً مع Next.js و Node.js
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. تحديد الـ Resource Type تلقائياً (عشان لو فيديو ما يقولش Invalid image)
    // لو الفايل بيبدأ بـ video/ زي video/mp4 هيخليه video غير كده هيكون auto أو image
    const isVideo = file.type.startsWith("video/");
    const resourceType = isVideo ? "video" : "auto";

    // 3. تحويل الـ Buffer لـ Base64 عشان نضمن وصوله لـ Cloudinary بدون أي تشويه في الـ Data
    const base64Data = buffer.toString("base64");
    const fileUri = `data:${file.type};base64,${base64Data}`;

    // 4. الرفع المباشر والآمن
    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: "cyber-portfolio",
      resource_type: resourceType, // النقطة السحرية اللي هتحل المشكلة
    });

    // إرجاع الرابط بنجاح
    return NextResponse.json({ url: uploadResult.secure_url });

  } catch (error: any) {
    console.error("Cloudinary upload internal error:", error);
    return NextResponse.json({ error: error.message || "Invalid image file" }, { status: 500 });
  }
}