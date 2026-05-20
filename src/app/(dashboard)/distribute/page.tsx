import { redirect } from 'next/navigation';

/**
 * Old Distribute page — distribution actions (publish to LinkedIn, send email,
 * etc.) are now performed directly from the Content surface where the draft
 * already lives. One-click publish replaces the standalone distribute step.
 */
export default function DistributeRedirect() {
  redirect('/content');
}
