import { redirect } from 'next/navigation';

/**
 * Old Learning page — the learning insights (source quality, whitespace,
 * competitor mentions) now feed Market Brief's weekly synthesis directly
 * rather than living on a separate surface. Power users who want the raw
 * data can still see it in Signals + Themes.
 */
export default function LearningRedirect() {
  redirect('/market-brief');
}
