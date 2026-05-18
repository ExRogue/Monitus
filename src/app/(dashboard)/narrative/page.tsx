import { redirect } from 'next/navigation';

/**
 * Old Narrative page — absorbed into Company Profile in the new IA.
 * The narrative content is now the "Core narrative" field on the profile.
 */
export default function NarrativeRedirect() {
  redirect('/company-profile');
}
