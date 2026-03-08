import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const landing = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/landing' }),
  schema: z.object({
    slug: z.string(),
    title: z.string().max(60),
    description: z.string().max(155),
    h1: z.string(),
    type: z.enum(['url', 'wifi', 'vcard', 'email', 'sms', 'geo', 'event', 'text']).optional(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(2),
  }),
});

export const collections = { landing };
