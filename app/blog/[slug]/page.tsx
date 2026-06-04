import { notFound } from 'next/navigation';
import { getPostData, getSortedPostsData } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';

// Import any shadcn elements or custom components you want available inside your blogs
import { Button } from '@/components/ui/button';

// Declare custom interactive components available to your MDX files
const mdxComponents = {
  Button,
  Callout: ({ children }: { children: React.ReactNode }) => (
    <div className="p-4 my-6 rounded-lg bg-primary/10 border-l-4 border-primary text-foreground">
      {children}
    </div>
  ),
};

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostData(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto py-16 px-6">
      <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-primary mb-8 inline-flex items-center transition-colors">
        ← Back to insights
      </Link>
      
      <header className="mb-10">
        <div className="flex items-center gap-2 text-sm text-primary font-semibold tracking-wide uppercase mb-3">
          <span>{post.category}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground font-normal normal-case">v{post.version}</span>
        </div>
        
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl mb-4 leading-tight">
          {post.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground border-y border-border py-3">
          <div>By <span className="font-medium text-foreground">{post.author}</span></div>
          <div className="hidden sm:block text-muted-foreground/40">|</div>
          <div>Published: {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </header>

      {/* Renders your MDX text file compiled alongside your interactive UI custom components */}
      <div className="prose max-w-none text-left">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>

      {post.tags.length > 0 && (
        <footer className="mt-12 pt-6 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs font-medium bg-muted text-muted-foreground px-3 py-1 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        </footer>
      )}
    </article>
  );
}