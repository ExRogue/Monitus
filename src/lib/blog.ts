export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'why-your-insurtech-needs-a-narrative',
    title: 'Why your insurtech needs a Narrative, not a marketing strategy',
    excerpt: 'Most insurtechs approach marketing backwards. They start with channels and tactics when the real gap is something more fundamental: they have never articulated what they actually stand for in the market.',
    date: '2026-03-15',
    readTime: '4 min',
    content: `Most insurtechs approach marketing backwards. They start with channels and tactics — LinkedIn posts, newsletters, conference appearances — when the real gap is something more fundamental: they have never articulated what they actually stand for in the market.

This is not a branding problem. It is a commercial problem.

When a CUO at a Lloyd's syndicate reads your LinkedIn post and thinks "this sounds like every other insurtech," that is a positioning failure that no amount of posting frequency will fix. When your pitch deck says one thing and your website says another, that is a narrative gap. When three different people at your company describe what you do in three different ways, that is a strategic problem disguised as a communications problem.

**The Narrative is the foundation**

A Narrative is not a mission statement. It is not a tagline. It is a structured strategic document that defines:

- What your company actually believes about the market
- Who your specific buyers are and what they care about
- How your message adapts for different departments (CTO vs CUO vs CFO)
- What your competitors say and how you differ
- What language you should never use

Without this, every piece of content you produce is a guess. With it, everything references the same strategic foundation — and your market presence starts to feel coherent.

**Why insurtechs specifically struggle with this**

Insurance is a market where credibility matters more than visibility. The buyers — underwriters, brokers, capacity providers — are sophisticated professionals who have heard every generic claim. They can tell the difference between genuine market insight and repurposed marketing copy in seconds.

Most insurtechs are founded by people with deep domain expertise. They understand their market. But translating that expertise into consistent, intelligent market commentary is a different skill entirely. It requires time, editorial discipline, and market awareness that most 10-50 person companies simply do not have.

**The practical outcome**

A company with a clear Narrative publishes commentary that sounds like it comes from someone who understands the market — because it does. Every post, every email, every pitch references the same positioning. Over time, the right people — insurers, brokers, MGAs — start to recognise the company as a credible voice.

That recognition opens doors. It makes sales conversations easier. It turns cold outreach into warm introductions.

Start with the Narrative. Everything else follows.`,
  },
  {
    slug: 'content-gap-series-a-market-credibility',
    title: 'The content gap between Series A and market credibility',
    excerpt: 'You have raised your round. You have a product that works. Now the market needs to know you exist — and generic content will not get you there.',
    date: '2026-03-10',
    readTime: '3 min',
    content: `You have raised your round. You have a product that works. You have a handful of customers who validate the thesis. Now the market needs to know you exist.

This is where most insurtechs stall.

The gap between having a funded product and being recognised as a credible market participant is not a product gap. It is a presence gap. And it is wider than most founders expect.

**The visibility asymmetry**

Look at your competitors. Some of them have weaker products. Some raised less money. Some have fewer customers. But they appear more credible because they show up more often with more intelligent things to say.

They comment on regulatory developments within days. They publish perspectives on market trends. Their founders are visible on LinkedIn with opinions that demonstrate genuine market understanding.

This is not because they have a better marketing team. It is because they have a system — even if that system is just a founder who prioritises visibility.

**Why generic content makes it worse**

The instinct when you realise you have a visibility problem is to produce more content. The typical response: hire a junior marketer, subscribe to a content tool, start posting more frequently.

The problem is that generic content in insurance markets does not build credibility — it actively damages it. When a Head of Distribution reads a post that sounds like it was written by someone who has never sat in a renewal meeting, they do not think "this company posts often." They think "this company does not understand my world."

Insurance market content needs to demonstrate genuine expertise. It needs to reference real developments. It needs to have a point of view that sounds like it comes from someone who has been in the room.

**What actually works**

The companies that successfully bridge the gap between Series A and market credibility do three things consistently:

1. They monitor their market and respond to developments quickly — not weeks later, but within days
2. They have a clear positioning that runs through everything they publish
3. They publish less but say more — quality commentary beats constant content

The founder who posts twice a week with genuine market insight will build more credibility than the company that posts daily with repurposed press releases.

Build the system. Maintain the discipline. The credibility follows.`,
  },
  {
    slug: 'what-lloyds-market-wants-on-linkedin',
    title: "What Lloyd's Market participants actually want to see on LinkedIn",
    excerpt: "You are posting for an audience of underwriters, brokers, and syndicate leads. Here is what they actually engage with — and what makes them scroll past.",
    date: '2026-03-05',
    readTime: '5 min',
    content: `LinkedIn is the primary professional network for the London insurance market. Lloyd's underwriters, broker firm partners, MGA founders, and syndicate leads all use it. But what they want to see from insurtechs is very different from what most insurtechs post.

**What they engage with**

After analysing engagement patterns across the London market, a clear pattern emerges. The posts that generate meaningful engagement from senior insurance professionals share specific characteristics:

**Market interpretation, not market summarisation.** Do not tell them what happened — they already know. Tell them what it means. When Lloyd's announces a new initiative, the valuable post is not "Lloyd's announced X." It is "This changes how delegated authority will be regulated, and here is why that matters for MGAs."

**Specific, named perspectives.** "The market is changing" is invisible. "The FCA's new Consumer Duty requirements will force every insurtech selling through brokers to rethink their compliance documentation by Q3" is specific enough to be useful.

**Honest acknowledgment of complexity.** Insurance professionals are deeply sceptical of simple narratives. Posts that acknowledge trade-offs, nuance, and uncertainty perform better than posts that present everything as straightforward.

**What makes them scroll past**

**Product announcements disguised as thought leadership.** "We are proud to announce our latest feature" is the most ignored format on insurance LinkedIn. If you have a new capability, frame it as a response to a market problem, not a product update.

**Generic industry commentary.** "Digital transformation is reshaping insurance" was tired in 2020. Insurance professionals have heard every generic trend observation. If you cannot add something specific and non-obvious, do not post.

**Marketing language.** "Cutting-edge," "revolutionary," "game-changing," "disruptive" — these words are actively harmful in insurance market communications. They signal that you do not understand the audience. Insurance professionals respect precision, not hyperbole.

**The format that works**

The highest-performing format for insurtechs on insurance LinkedIn is the market reaction post:

1. Reference a specific, recent development (regulatory change, market event, published report)
2. Explain what most people are missing about it
3. Connect it to a specific implication for a specific audience
4. Close with a genuine question or observation, not a call to action

This format works because it demonstrates exactly what insurance professionals value: market awareness, analytical capability, and the confidence to have a point of view.

Post less. Say more. Make every post demonstrate that you understand their world better than they expected.`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllBlogPosts(): BlogPost[] {
  return BLOG_POSTS.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
