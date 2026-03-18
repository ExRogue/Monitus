import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Not Found — Monitus' };
  return {
    title: `${post.title} — Monitus`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--navy)]">
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Monitus</span>
          </Link>
          <Link href="/blog" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
            <ArrowLeft size={14} /> All posts
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-4">
          <time>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
          <span>&middot;</span>
          <span>{post.readTime} read</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-8 leading-tight">
          {post.title}
        </h1>

        <article className="prose-monitus">
          {post.content.split('\n\n').map((paragraph, i) => {
            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              return (
                <h2 key={i} className="text-lg font-semibold text-[var(--text-primary)] mt-8 mb-3">
                  {paragraph.replace(/\*\*/g, '')}
                </h2>
              );
            }

            // Handle numbered lists
            if (/^\d+\./.test(paragraph)) {
              const items = paragraph.split('\n').filter(Boolean);
              return (
                <ol key={i} className="space-y-2 my-4 ml-4">
                  {items.map((item, j) => (
                    <li key={j} className="text-sm text-[var(--text-secondary)] leading-relaxed list-decimal">
                      {item.replace(/^\d+\.\s*/, '')}
                    </li>
                  ))}
                </ol>
              );
            }

            // Handle bullet lists
            if (paragraph.startsWith('- ')) {
              const items = paragraph.split('\n').filter(Boolean);
              return (
                <ul key={i} className="space-y-2 my-4 ml-4">
                  {items.map((item, j) => (
                    <li key={j} className="text-sm text-[var(--text-secondary)] leading-relaxed list-disc">
                      {item.replace(/^-\s*/, '')}
                    </li>
                  ))}
                </ul>
              );
            }

            // Regular paragraph with bold support
            const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={j} className="text-[var(--text-primary)] font-semibold">
                        {part.replace(/\*\*/g, '')}
                      </strong>
                    );
                  }
                  return part;
                })}
              </p>
            );
          })}
        </article>

        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 text-center">
            <p className="text-sm text-[var(--text-primary)] font-semibold mb-2">
              This is the kind of commentary Monitus helps insurtechs produce.
            </p>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Market-aware, specific, and built on a clear positioning foundation.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              Start with your free Narrative
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Monitus. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">About</Link>
            <Link href="/pricing" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
            <Link href="/contact" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Contact</Link>
            <Link href="/privacy" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
