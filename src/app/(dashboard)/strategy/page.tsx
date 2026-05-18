import { redirect } from 'next/navigation';

/**
 * Strategy Partner — removed in the new IA. The strategic recommendations
 * that used to live here now flow through:
 *   - Market Brief → This Week's Priorities (the synthesised next moves)
 *   - Conversation Detail → Recommended Actions tab (per-conversation moves)
 * From either surface you can click "Draft this" to open Content Producer
 * with full strategic context pre-loaded.
 */
export default function StrategyRedirect() {
  redirect('/market-brief');
}
