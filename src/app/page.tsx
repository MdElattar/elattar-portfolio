import { unstable_cache } from "next/cache";
import { adminDb, hasAdminCredentials } from "../lib/firebase-admin";
import HomeClient from "./HomeClient";

const getProjects = unstable_cache(
  async () => {
    if (!hasAdminCredentials()) return [];
    try {
      const snapshot = await adminDb().collection("projects").get();
      return snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          reviews: (data.reviews || []).map((review: any) => ({
            ...review,
            createdAt:
              typeof review.createdAt === "string" ? review.createdAt : "",
          })),
        };
      });
    } catch (error) {
      console.error("Server project fetch failed:", error);
      return [];
    }
  },
  ["public-projects"],
  { tags: ["projects"], revalidate: 3600 },
);

export default async function Page() {
  const initialProjects = await getProjects();
  return <HomeClient initialProjects={JSON.parse(JSON.stringify(initialProjects))} />;
}
