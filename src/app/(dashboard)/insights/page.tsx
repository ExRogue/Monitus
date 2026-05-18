import { redirect } from 'next/navigation';

/**
 * Insights page — removed in the new IA. Insight value now flows through
 * Market Brief (the synthesis) and Market View (the conversation map).
 */
export default function InsightsRedirect() {
  redirect('/market-brief');
}
