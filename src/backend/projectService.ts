import { db, storage } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// دالة مخصصة لرفع الملفات (صور أو فيديوهات) لـ Firebase Storage
async function uploadFile(file: File, folder: string): Promise<string> {
  const fileRef = ref(storage, `projects/${folder}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
}

// الدالة الرئيسية اللي السيرفر هينادي عليها عشان يرفع المشروع بالكامل
export async function createProject(formData: FormData) {
  const title = formData.get("title") as string;
  const desc = formData.get("desc") as string;
  const tech = formData.get("tech") as string;
  const liveLink = formData.get("liveLink") as string;
  const githubLink = formData.get("githubLink") as string;
  
  const imageType = formData.get("imageType") as "url" | "file";
  let imageUrl = formData.get("imageUrl") as string;
  
  const videoType = formData.get("videoType") as "url" | "file";
  let videoUrl = formData.get("videoUrl") as string;

  // التعامل مع الصورة لو كانت ملف مرفوع
  if (imageType === "file") {
    const imageFile = formData.get("imageFile") as File;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadFile(imageFile, "images");
    }
  }

  // التعامل مع الفيديو لو كان ملف مرفوع
  if (videoType === "file") {
    const videoFile = formData.get("videoFile") as File;
    if (videoFile && videoFile.size > 0) {
      videoUrl = await uploadFile(videoFile, "videos");
    }
  }

  // تجهيز الكائن النهائي لحفظه في Firestore
  const newProject = {
    title,
    desc,
    tech: tech.toUpperCase(),
    image: imageUrl || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600",
    videoUrl: videoUrl || null,
    liveLink,
    githubLink,
    views: 0,
    reviews: [],
    createdAt: new Date().toISOString()
  };

  // حفظ في كوليكشن projects
  const docRef = await addDoc(collection(db, "projects"), newProject);
  return { success: true, id: docRef.id };
}