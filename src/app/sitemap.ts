import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://inch.sale';
  const now = new Date();

  const productEntries: MetadataRoute.Sitemap = [];

  try {
    const productsPath = path.join(process.cwd(), 'data', 'products.json');
    if (fs.existsSync(productsPath)) {
      const data = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
      for (const item of Object.values<any>(data)) {
        if (item?.slug) {
          productEntries.push({
            url: `${baseUrl}/p/${encodeURIComponent(item.slug)}`,
            lastModified: item.createdAt ? new Date(item.createdAt) : now,
            changeFrequency: 'daily',
            priority: 0.9,
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to load products for sitemap:', err);
  }

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...productEntries,
    {
      url: `${baseUrl}/campaigns`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
  ];
}
