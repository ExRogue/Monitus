import { redirect } from 'next/navigation';

/**
 * Old Workspace landing — redirects to Market Brief in the new IA.
 * Kept as a redirect so bookmarks and saved links land on the right place.
 */
export default function DashboardRedirect() {
  redirect('/market-brief');
}
