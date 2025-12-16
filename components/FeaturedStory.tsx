import { Article } from "@/lib/mockData";

type FeaturedStoryProps = {
  article: Article;
};

export function FeaturedStory({ article }: FeaturedStoryProps) {
  return (
    <section
      id="top"
      className="anchored -mx-4 sm:-mx-6 lg:-mx-8 rounded-none bg-gradient-to-br from-[#1a2a3a] via-[#1e2f42] to-[#1c1530] px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-5 md:items-center">
        <div className="md:col-span-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-white/90">
            <span className="eyebrow text-white/90">Top Story</span>
            <span className="h-1 w-1 rounded-full bg-white/60" />
            <span className="text-white/90">{article.neighborhood}</span>
            <span className="h-1 w-1 rounded-full bg-white/60" />
            <span className="text-white/90">
              {new Date(article.date).toLocaleDateString()}
            </span>
          </div>
          <h1 className="headline text-3xl font-semibold text-white md:text-4xl">
            {article.title}
          </h1>
          <p className="text-base text-white/90 md:max-w-3xl leading-relaxed">
            {article.excerpt}
          </p>
          <div className="flex items-center gap-3 text-sm text-white/90">
            <span className="font-semibold text-white">{article.author}</span>
            <span className="h-1 w-1 rounded-full bg-white/60" />
            <a href="#latest" className="font-semibold text-white hover:underline">
              Browse latest →
            </a>
          </div>
        </div>
        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="relative h-full rounded-lg bg-[rgba(255,255,255,0.12)] p-4 text-white ring-1 ring-white/15">
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wider font-semibold text-white/90">
                What to know
              </span>
              <ul className="space-y-1.5 leading-relaxed text-white/90">
                <li>• Full-bleed hero inspired by modern front pages.</li>
                <li>• Clear hierarchy with editorial serif masthead.</li>
                <li>• Live-style feed and filters below.</li>
                <li>• Ready to wire to your secure backend.</li>
              </ul>
            </div>
          </div>
          <div className="h-28 rounded-lg bg-[rgba(255,255,255,0.16)] ring-1 ring-white/15 flex items-center justify-center text-white/80 text-sm">
            Image placeholder
          </div>
        </div>
      </div>
    </section>
  );
}

