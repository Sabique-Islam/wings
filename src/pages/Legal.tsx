import InfoPage from "./InfoPage";
import { Seo } from "@/components/Seo";
import { LEGAL_DOCS } from "@/content/legal";

type Slug = keyof typeof LEGAL_DOCS;

export default function Legal({ slug }: { slug: Slug }) {
  const doc = LEGAL_DOCS[slug];
  if (!doc) return null;
  return (
    <>
      <Seo title={`${slug} policy`} path={`/legal/${slug}`} description={doc.description} />
      <InfoPage eyebrow={doc.eyebrow} title={doc.title} updated="may 2026">
        {doc.sections.map((s, i) => (
          <section key={i} className="space-y-2">
            {s.h && <h2 className="text-base font-mono text-foreground tracking-tight uppercase">— {s.h}</h2>}
            <p className="text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </InfoPage>
    </>
  );
}
