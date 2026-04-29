// /workspace is the sidebar label for "Mission Control" but the actual route
// is /dashboard. This server-side redirect catches direct URL hits so we don't
// 404 on customers who type or share /workspace.
import { redirect } from 'next/navigation';

export default function WorkspaceRedirect() {
  redirect('/dashboard');
}
