import { redirect } from 'next/navigation';

/**
 * Old Messaging Bible page — positioning, stakeholder messaging, and the
 * narrative library are all consolidated under Company Profile in the new IA.
 * The bible's 25+ fields are exposed there as editable sections.
 */
export default function MessagingBibleRedirect() {
  redirect('/company-profile');
}
