import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n/context";
import { strings } from "@/lib/i18n/strings";

function PrivacyPage() {
  const { t } = useI18n();

  return (
    <div className="flex-1 overflow-auto bg-white/80 px-4 py-6 backdrop-blur dark:bg-slate-900/50 md:px-8">
      <article className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <Link
            to="/webcams"
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t(strings.privacy.backToApp)}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t(strings.privacy.title)}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t(strings.privacy.subtitle)}</p>
        </header>

        <Section heading={t(strings.privacy.whatHeading)} body={t(strings.privacy.whatBody)} />
        <Section heading={t(strings.privacy.whyHeading)} body={t(strings.privacy.whyBody)} />
        <Section heading={t(strings.privacy.transferHeading)} body={t(strings.privacy.transferBody)} />
        <Section heading={t(strings.privacy.rightsHeading)} body={t(strings.privacy.rightsBody)} />
        <Section heading={t(strings.privacy.contactHeading)} body={t(strings.privacy.contactBody)} />
      </article>
    </div>
  );
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {heading}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{body}</p>
    </section>
  );
}

export default PrivacyPage;
