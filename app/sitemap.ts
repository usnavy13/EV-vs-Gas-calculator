import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default function sitemap(): MetadataRoute.Sitemap {
	const hdrs = headers();
	const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
	const proto = hdrs.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
	const origin = `${proto}://${host}`;
	const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/\/+$/, '');

	return [
		{
			url: `${baseUrl}/`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 1,
		},
	];
}


