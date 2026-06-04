import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

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
  contentHtml: string;
}

// Get all posts for the listing page
export function getSortedPostsData(): Omit<PostData, 'contentHtml'>[] {
  if (!fs.existsSync(postsDirectory)) return [];

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || 'Untitled Post',
        description: data.description || '',
        // Coerce dates into strings just in case yaml parser reads them as raw dates
        date: data.date ? String(data.date) : '', 
        version: data.version || 1.0,
        last_published: data.last_published ? String(data.last_published) : '',
        author: data.author || 'Anonymous',
        category: data.category || 'General',
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    });

  // Sorts posts by newest date first
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Get raw Markdown body transformed into HTML for a single post view
export async function getPostData(slug: string): Promise<PostData | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    if (!fs.existsSync(fullPath)) return null;

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    const processedContent = await remark()
      .use(html)
      .process(content);
    const contentHtml = processedContent.toString();

    return {
      slug,
      contentHtml,
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