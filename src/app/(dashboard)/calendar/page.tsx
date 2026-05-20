import { redirect } from 'next/navigation';

/**
 * Old Calendar page — content scheduling now lives inside Content. We removed
 * the standalone calendar surface to keep the IA tight (4 primary pages
 * instead of 6). The schedule/queue view is a tab on /content.
 */
export default function CalendarRedirect() {
  redirect('/content');
}
