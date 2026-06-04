import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), '_posts');

export interface PostData {
  slug: string;
  title: string;
  description: string;
  date: string;
  version: number;
  last_published: string;
  author: string;
  category: string;
  tags: string[];
  content: string; // Keep raw markdown string to compile dynamically
}

export function getSortedPostsData(): Omit<PostData, 'content'>[] {
  if (!fs.existsSync(postsDirectory)) return [];

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md') || fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, ''); // Strips .md or .mdx
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || 'Untitled Post',
        description: data.description || '',
        date: data.date ? String(data.date) : '', 
        version: data.version || 1.0,
        last_published: data.last_published ? String(data.last_published) : '',
        author: data.author || 'Anonymous',
        category: data.category || 'General',
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostData(slug: string): PostData | null {
  try {
    // Check for .mdx first, fallback to .md
    let fullPath = path.join(postsDirectory, `${slug}.mdx`);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(postsDirectory, `${slug}.md`);
    }
    if (!fs.existsSync(fullPath)) return null;

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      content,
      title: data.title || 'Untitled Post',
      description: data.description || '',
      date: data.date ? String(data.date) : '',
      version: data.version || 1.0,
      last_published: data.last_published ? String(data.last_published) : '',
      author: data.author || 'Anonymous',
      category: data.category || 'General',
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  } catch (error) {
    return null;
  }
}