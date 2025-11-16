'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function Analytics() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (!GA_MEASUREMENT_ID) return;
		if (typeof window === 'undefined') return;
		// @ts-expect-error gtag added by GA script
		if (typeof window.gtag !== 'function') return;

		const pagePath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
		// @ts-expect-error gtag added by GA script
		window.gtag('config', GA_MEASUREMENT_ID, {
			page_path: pagePath,
		});
	}, [pathname, searchParams]);

	return null;
}


