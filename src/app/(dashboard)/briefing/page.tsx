import { redirect } from 'next/navigation';

/**
 * Old Briefing / Weekly Priority page — absorbed into Market Brief in the new
 * IA. The weekly synthesis, recommended actions, and narrative-aligned next
 * moves all render on /market-brief now. Kept as a redirect so old bookmarks,
 * emails, and report links continue to resolve.
 */
export default function BriefingRedirect() {
  redirect('/market-brief');
}
