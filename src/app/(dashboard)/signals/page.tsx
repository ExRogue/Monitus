import { redirect } from 'next/navigation';

/**
 * Old Signals page — removed from the sidebar on 2026-05-22. The browse-all-
 * scored-articles view is replaced by Market View (conversations grouping
 * those signals into stories). Kept as a redirect so any old bookmarks /
 * email links continue to resolve.
 */
export default function SignalsRedirect() {
  redirect('/market-view');
}
