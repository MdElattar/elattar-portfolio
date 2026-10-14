import { NextResponse } from 'next/server';

export async function GET() {
  const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
  const USERNAME = 'MdElattar';

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: "GitHub Token is missing" }, { status: 500 });
  }

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. سحب بيانات اليوزر الأساسية (الفولورز والريبوز)
    const userRes = await fetch(`https://api.github.com/users/${USERNAME}`, { 
      headers, 
      next: { revalidate: 43200 } // الكاش هيتحدث كل 12 ساعة
    });
    const userData = await userRes.json();

    // 2. سحب كل الريبوز لحساب النجوم والفوركس
    const reposRes = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100`, { 
      headers, 
      next: { revalidate: 43200 } 
    });
    const reposData = await reposRes.json();

    let totalStars = 0;
    let totalForks = 0;
    let featuredRepos = [];

    if (Array.isArray(reposData)) {
      totalStars = reposData.reduce((acc, repo) => acc + repo.stargazers_count, 0);
      totalForks = reposData.reduce((acc, repo) => acc + repo.forks_count, 0);
      // نجيب أحدث مشروعين
      featuredRepos = [...reposData]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 2);
    }

    // 3. سحب النشاطات لحساب الـ Streak الفعلي
    const eventsRes = await fetch(`https://api.github.com/users/${USERNAME}/events/public?per_page=100`, { 
      headers, 
      next: { revalidate: 43200 } 
    });
    const eventsData = await eventsRes.json();

    let dynamicStreak = 0;
    let totalContributions = 0;

    if (Array.isArray(eventsData)) {
      totalContributions = eventsData.length;
      const dates = [...new Set(eventsData.map((event: any) => new Date(event.created_at).toDateString()))];
      
      let d = new Date();
      if (dates.includes(d.toDateString())) dynamicStreak++;
      d.setDate(d.getDate() - 1);
      
      while(dates.includes(d.toDateString())) {
        dynamicStreak++;
        d.setDate(d.getDate() - 1);
      }
    }

    // تجميع الداتا النظيفة وإرسالها للواجهة الأمامية
    return NextResponse.json({
      stats: {
        repos: userData.public_repos || 0,
        followers: userData.followers || 0,
        stars: totalStars,
        forks: totalForks,
      },
      streak: dynamicStreak,
      contributions: totalContributions,
      featured: featuredRepos
    });

  } catch (error) {
    console.error("GitHub API Error:", error);
    return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500 });
  }
}