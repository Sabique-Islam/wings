import { Link } from "react-router-dom";
import InfoPage from "./InfoPage";
import { BLOG_POSTS } from "@/content/blog";

export default function Blog() {
  return (
    <InfoPage
      eyebrow="company · blog"
      title="writing about Wings."
      path="/blog"
      description="Essays on why Wings exists, BYOK AI, data safety, and keyboard-first notes."
    >
      <p className="text-muted-foreground">
        Prefer markdown? Each post also ships as{" "}
        <code className="text-xs">/blog/&#123;slug&#125;.md</code>. RSS:{" "}
        <a href="/rss.xml" className="underline underline-offset-2 hover:text-foreground">
          /rss.xml
        </a>
        .
      </p>
      <ul className="list-none space-y-6 pl-0 pt-4">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug} className="border border-border/60 rounded-lg p-5 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {post.date}
              {post.tags.length > 0 ? ` · ${post.tags.join(" · ")}` : ""}
            </div>
            <Link
              to={`/blog/${post.slug}`}
              className="text-base font-mono text-foreground hover:underline underline-offset-2 block"
            >
              {post.title}
            </Link>
            <p className="text-sm text-muted-foreground">{post.description}</p>
          </li>
        ))}
      </ul>
    </InfoPage>
  );
}
