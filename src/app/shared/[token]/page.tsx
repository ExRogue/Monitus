import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SharedPageProps {
  params: { token: string };
}

export default async function SharedPage({ params }: SharedPageProps) {
  await getDb();

  const { token } = params;

  // Look up shared item
  const shareResult = await sql`
    SELECT si.*, u.name as sender_name, c.name as company_name
    FROM shared_items si
    LEFT JOIN users u ON si.user_id = u.id
    LEFT JOIN companies c ON si.company_id = c.id
    WHERE si.token = ${token}
  `;

  const share = shareResult.rows[0];

  if (!share) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-white">Link not found</h1>
          <p className="text-sm text-gray-400">This shared link may have expired or does not exist.</p>
          <Link href="/" className="inline-block text-sm text-teal-400 hover:underline">
            Learn more about Monitus
          </Link>
        </div>
      </div>
    );
  }

  // Mark as viewed (first view only)
  if (!share.viewed_at) {
    try {
      await sql`UPDATE shared_items SET viewed_at = NOW() WHERE id = ${share.id}`;
    } catch {
      // Non-fatal
    }
  }

  // Fetch the actual item
  let title = '';
  let body = '';
  let sourceUrl = '';
  let score = '';
  let stakeholder = '';

  if (share.item_type === 'signal') {
    const result = await sql`
      SELECT sa.why_it_matters, sa.why_it_matters_to_buyers, sa.usefulness_score, sa.strongest_stakeholder, sa.reasoning, na.title, na.source_url, na.source
      FROM signal_analyses sa
      JOIN news_articles na ON sa.article_id = na.id
      WHERE sa.id = ${share.item_id}
    `;
    if (result.rows[0]) {
      const s = result.rows[0];
      title = s.title as string;
      body = s.why_it_matters as string;
      sourceUrl = s.source_url as string;
      score = parseFloat(String(s.usefulness_score)).toFixed(1);
      stakeholder = s.strongest_stakeholder as string;
    }
  } else {
    const result = await sql`
      SELECT title, content, content_type FROM generated_content WHERE id = ${share.item_id}
    `;
    if (result.rows[0]) {
      title = result.rows[0].title as string;
      body = result.rows[0].content as string;
    }
  }

  const senderName = share.sender_name || 'Someone';
  const companyName = share.company_name || '';

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-white tracking-tight">
            Monitus
          </Link>
          <Link
            href="/register"
            className="text-sm px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
          >
            Try Monitus free
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Shared by banner */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-teal-400 font-semibold text-sm">
              {senderName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm text-white">
              <span className="font-medium">{senderName}</span>
              {companyName ? ` at ${companyName}` : ''} shared this {share.item_type === 'signal' ? 'market signal' : 'content'} with you
            </p>
            {share.personal_note && (
              <p className="text-sm text-gray-400 mt-1 italic">&ldquo;{share.personal_note}&rdquo;</p>
            )}
          </div>
        </div>

        {/* Main content card */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-semibold text-white leading-tight">{title}</h1>

            {share.item_type === 'signal' && score && (
              <div className="flex items-center gap-4 text-sm">
                <span className="px-2.5 py-1 bg-teal-500/10 text-teal-400 rounded-md font-medium">
                  Score: {score}/10
                </span>
                {stakeholder && (
                  <span className="text-gray-400">
                    Key stakeholder: <span className="text-gray-200">{stakeholder}</span>
                  </span>
                )}
              </div>
            )}

            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {body}
            </div>

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-teal-400 hover:underline"
              >
                Read original source &rarr;
              </a>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-teal-500/10 to-purple-500/10 border border-gray-800 rounded-xl p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold text-white">Want your own intelligence feed?</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Monitus monitors the insurance market and surfaces the signals that matter to your business. Define your narrative and start receiving tailored intelligence.
          </p>
          <Link
            href="/register"
            className="inline-block px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try Monitus free
          </Link>
        </div>
      </main>
    </div>
  );
}
