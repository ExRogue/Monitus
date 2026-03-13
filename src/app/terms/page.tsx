import Link from 'next/link';
import { Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Telum',
  description: 'Terms and conditions for using the Telum platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--navy)]">
      <nav className="border-b border-[var(--border)] bg-[var(--navy)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Telum</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Terms of Service</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Telum (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you are using the Service on behalf of an organisation, you represent that you have the authority
              to bind that organisation to these terms. If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Description of Service</h2>
            <p>
              Telum is an AI-powered content generation platform designed for insurance distribution companies.
              The Service aggregates news from insurance trade press sources, generates branded content in
              multiple formats, and performs regulatory compliance checks. The Service is provided on a
              subscription basis with different tiers offering varying levels of access and features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. Account Registration</h2>
            <p>
              To use the Service, you must create an account by providing accurate and complete information.
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. You must notify us immediately of any unauthorised
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Subscriptions and Billing</h2>
            <p>
              The Service is offered under Starter, Professional, and Enterprise subscription plans, each with
              different pricing, usage limits, and features. Subscription fees are billed monthly or annually
              as selected at the time of purchase. All fees are quoted in British Pounds (GBP) and are
              non-refundable except where required by law. We reserve the right to change our pricing with
              30 days&apos; notice. Usage beyond your plan limits may result in service restrictions until the
              next billing cycle or an upgrade to a higher plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Acceptable Use</h2>
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these terms.
              You shall not use the Service to generate content that is misleading, defamatory, or in
              violation of applicable regulations. You shall not attempt to reverse-engineer, decompile,
              or disassemble any part of the Service. You shall not share your account credentials or
              allow unauthorised access. You shall not use the Service to compete directly with Telum
              or to build a competing product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Intellectual Property</h2>
            <p>
              The Service, including its design, features, and underlying technology, is the intellectual
              property of Telum and is protected by applicable intellectual property laws. Content
              generated through the Service using your company profile and inputs is owned by you,
              subject to any third-party rights in the source material. You grant us a limited licence
              to use your company profile data solely for the purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Content and Compliance</h2>
            <p>
              While Telum provides compliance checking against regulatory frameworks including FCA, State DOI,
              GDPR, and FTC rules, these checks are advisory in nature and do not constitute legal or
              regulatory advice. You are solely responsible for ensuring that any content published through
              or generated by the Service complies with all applicable laws, regulations, and industry
              standards. Telum does not guarantee that generated content will be free from regulatory issues.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. News Content</h2>
            <p>
              The Service aggregates news from third-party insurance trade press sources. We do not claim
              ownership of the original news content. Generated content is derived from and inspired by
              source articles but is transformed into original branded material. You acknowledge that
              source article availability depends on third-party publishers and may change without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Telum shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, data, or business
              opportunities, arising from your use of the Service. Our total liability for any claim arising
              from these terms shall not exceed the amount you paid for the Service in the twelve months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether
              express or implied, including warranties of merchantability, fitness for a particular purpose,
              and non-infringement. We do not warrant that the Service will be uninterrupted, error-free,
              or completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">11. Termination</h2>
            <p>
              Either party may terminate these terms at any time. You may cancel your subscription through
              your account settings or by contacting us. We may suspend or terminate your access if you
              violate these terms. Upon termination, your right to use the Service ceases immediately.
              We will retain your data for 30 days following termination, after which it will be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">12. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of England and Wales.
              Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the
              courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify you of material changes
              via email or through the Service. Your continued use of the Service after such changes
              constitutes your acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">14. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us at legal@telum.io.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Telum. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
