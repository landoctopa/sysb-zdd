import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Allows you to pass down custom globally styled overrides if desired
    ...components,
  };
}