import Link from 'next/link';
import { getSortedPostsData } from '@/lib/blog';

export default function BlogPage() {
  const posts = getSortedPostsData();

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl mb-3">
          Insights & Resources
        </h1>
        <p className="text-muted-foreground text-lg">
          Practical strategies to fix conversion paths and turn assets into growth machines.
        </p>
      </header>
      
      <div className="grid gap-10">
        {posts.map((post) => (
          <article key={post.slug} className="group relative flex flex-col items-start border-b border-border pb-8 last:border-0">
            <div className="flex items-center gap-3 text-xs mb-3">
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                {post.category}
              </span>
              <time className="text-muted-foreground">
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </time>
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight mb-2 group-hover:text-primary transition-colors">
              <Link href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
            </h2>
            
            <p className="text-muted-foreground text-base mb-4 leading-relaxed max-w-3xl">
              {post.description}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}