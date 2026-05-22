import { redirect } from 'next/navigation';

/**
 * Old Themes page — removed from the sidebar on 2026-05-22. The recurring-
 * topic-patterns surface is fully absorbed by Market View (conversation
 * clusters with momentum + saturation scores). Kept as a redirect so any old
 * bookmarks / email links continue to resolve.
 */
export default function ThemesRedirect() {
  redirect('/market-view');
}
