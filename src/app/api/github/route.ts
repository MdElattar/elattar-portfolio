import { NextResponse } from "next/server";

const USERNAME = "MdElattar";
const REVALIDATE_SECONDS = 3600;

export async function GET() {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const userRes = await fetch(`https://api.github.com/users/${USERNAME}`, {
      headers,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    const reposRes = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100`, {
      headers,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    const eventsRes = await fetch(`https://api.github.com/users/${USERNAME}/events/public?per_page=100`, {
      headers,
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!userRes.ok || !reposRes.ok || !eventsRes.ok) {
      throw new Error("GitHub API request failed");
    }

    const userData = await userRes.json();
    const reposData = await reposRes.json();
    const eventsData = await eventsRes.json();

    let totalStars = 0;
    let totalForks = 0;
    let featured: unknown[] = [];

    if (Array.isArray(reposData)) {
      totalStars = reposData.reduce((sum: number, repo: any) => sum + (repo.stargazers_count || 0), 0);
      totalForks = reposData.reduce((sum: number, repo: any) => sum + (repo.forks_count || 0), 0);
      featured = [...reposData]
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 2);
    }

    let streak = 0;
    const commitsByYear: Record<number, number> = {};
    if (Array.isArray(eventsData)) {
      const dates = new Set(
        eventsData.map((event: any) => new Date(event.created_at).toDateString()),
      );
      const cursor = new Date();
      if (dates.has(cursor.toDateString())) streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      while (dates.has(cursor.toDateString())) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      eventsData.forEach((event: any) => {
        const year = new Date(event.created_at).getFullYear();
        commitsByYear[year] = (commitsByYear[year] || 0) + 1;
      });
    }

    return NextResponse.json({
      stats: {
        repos: userData.public_repos || 0,
        followers: userData.followers || 0,
        stars: totalStars,
        forks: totalForks,
      },
      streak,
      contributions: Array.isArray(eventsData) ? eventsData.length : 0,
      commitsByYear,
      featured,
    });
  } catch (error) {
    console.error("GitHub API Error:", error);
    return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500 });
  }
}
