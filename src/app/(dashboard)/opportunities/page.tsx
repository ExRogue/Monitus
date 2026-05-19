import { redirect } from 'next/navigation';

/**
 * Old Opportunities page — auto-generated opportunities are now surfaced as
 * Recommended Actions on each Market Brief and on the Conversation Detail
 * "Recommended Actions" tab. The standalone list is gone; you see them in
 * context of the story they were derived from.
 */
export default function OpportunitiesRedirect() {
  redirect('/market-brief');
}
