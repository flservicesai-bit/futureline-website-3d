import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`ai-recommend:${ip}`, 20, 60 * 1000);
    
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetIn) }
      );
    }

    const body = await req.json();
    // Coerce to primitives — a non-string goal/level/etc would crash
    // .toLowerCase() below, and non-string filter values would inject
    // unintended Prisma operators into `where`.
    const goal = typeof body?.goal === 'string' ? body.goal : '';
    const skillLevel = typeof body?.skillLevel === 'string' ? body.skillLevel : '';
    const deliveryPref = typeof body?.deliveryPref === 'string' ? body.deliveryPref : '';
    const budget = typeof body?.budget === 'number' && Number.isFinite(body.budget) ? body.budget : null;

    const where: any = { status: 'PUBLISHED', approvalStatus: 'APPROVED' };

    if (skillLevel) where.level = skillLevel;
    if (deliveryPref) where.deliveryType = deliveryPref;

    const courses = await prisma.course.findMany({ where });

    let scored = courses.map((course) => {
      let matchScore = 0;

      if (goal) {
        const goalLower = goal.toLowerCase();
        const titleMatch = course.title.toLowerCase().includes(goalLower);
        const descMatch = course.shortDescription.toLowerCase().includes(goalLower);
        const catMatch = course.category.toLowerCase().includes(goalLower);
        if (titleMatch) matchScore += 30;
        if (descMatch) matchScore += 20;
        if (catMatch) matchScore += 25;

        const goalWords = goalLower.split(/\s+/).filter((w: string) => w.length > 2);
        goalWords.forEach((word: string) => {
          if (course.title.toLowerCase().includes(word)) matchScore += 10;
          if (course.category.toLowerCase().includes(word)) matchScore += 8;
          if (course.shortDescription.toLowerCase().includes(word)) matchScore += 5;
          if (course.fullDescription.toLowerCase().includes(word)) matchScore += 3;
        });
      }

      if (skillLevel && course.level === skillLevel) matchScore += 15;
      if (deliveryPref && course.deliveryType === deliveryPref) matchScore += 10;

      const effectivePrice = course.discountPrice ?? course.price;
      if (budget && effectivePrice <= budget) matchScore += 10;

      return { ...course, matchScore };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const recommendations = scored.slice(0, 3).filter((c) => c.matchScore > 0);

    return NextResponse.json({ recommendations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}
