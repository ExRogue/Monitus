import { redirect } from 'next/navigation';

/**
 * Old Market Analyst "agent" page — the agent framing is gone. The unified
 * Market Analyst flow is now Market Brief → Market View → Company Profile,
 * accessible directly from the sidebar. This route redirects to Market View
 * which is the closest equivalent to the old browse-all-signals surface.
 */
export default function MarketAnalystRedirect() {
  redirect('/market-view');
}
