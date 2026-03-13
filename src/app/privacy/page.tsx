import Link from 'next/link';
import { Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Telum',
  description: 'How Telum collects, uses, and protects your data.',
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Introduction</h2>
            <p>
              Telum (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              AI-powered content generation platform for insurance distribution companies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information that you provide directly to us, including:</p>
            <p>
              <strong className="text-[var(--text-primary)]">Account Information:</strong> When you register, we collect your name,
              email address, password (stored in hashed form), company name, and company type.
            </p>
            <p className="mt-2">
              <strong className="text-[var(--text-primary)]">Usage Data:</strong> We collect information about how you interact with
              our platform, including articles viewed, content generated, features used, and subscription activity.
            </p>
            <p className="mt-2">
              <strong className="text-[var(--text-primary)]">Company Profile Data:</strong> Information you provide about your company,
              including description, industry focus, target audience, tone preferences, and compliance frameworks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide and improve our services, including generating
              personalised content based on your company profile, performing compliance checks against
              relevant regulatory frameworks, managing your subscription and billing, communicating with
              you about service updates, and analysing usage patterns to improve the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell your personal information. We may share your data with trusted service
              providers who assist us in operating the platform (such as cloud hosting and payment
              processing), when required by law or in response to valid legal requests, and to protect
              the rights, property, or safety of Telum, our users, or the public.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information. Passwords are
              hashed using bcrypt, authentication tokens are stored in secure httpOnly cookies, and all
              data is transmitted over encrypted connections. However, no method of electronic storage
              is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is active. Generated content
              is stored for the duration of your subscription. If you cancel your account, we will delete
              your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to access your personal data,
              correct inaccurate data, request deletion of your data, object to or restrict processing,
              receive your data in a portable format, and withdraw consent where applicable. To exercise
              these rights, please contact us at privacy@telum.io.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. GDPR Compliance</h2>
            <p>
              For users in the European Economic Area (EEA) and United Kingdom, we process personal data
              on the basis of contractual necessity (to provide our services), legitimate interests
              (to improve and secure our platform), and consent (where specifically obtained). Our
              legal basis for processing depends on the specific context and purposes for which we
              process your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Cookies</h2>
            <p>
              We use essential cookies required for authentication and platform functionality. We do not
              use advertising or tracking cookies. Our authentication system uses a secure httpOnly
              cookie to maintain your session.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by email or through a notice on our platform. Your continued use of Telum after
              changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact
              us at privacy@telum.io.
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
