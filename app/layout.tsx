import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import Analytics from '@/components/Analytics';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  const siteName = 'EV vs Gas Calculator';
  const title = siteName;
  const description =
    'Comprehensive calculator to compare costs between electric vehicles and gas-powered cars';

  const verificationGoogle = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      url: origin + '/',
      siteName,
      title,
      description,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    verification: verificationGoogle
      ? {
          google: verificationGoogle,
        }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  const siteUrl = `${origin}/`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'EV vs Gas Calculator',
        url: siteUrl,
      },
      {
        '@type': 'WebApplication',
        name: 'EV vs Gas Calculator',
        url: siteUrl,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        description:
          'Comprehensive calculator to compare costs between electric vehicles and gas-powered cars',
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                // Consent Mode defaults (adjust to your consent manager if needed)
                gtag('consent', 'default', {
                  'ad_storage': 'denied',
                  'ad_user_data': 'denied',
                  'ad_personalization': 'denied',
                  'analytics_storage': 'granted'
                });
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                  anonymize_ip: true
                });
              `}
            </Script>
          </>
        ) : null}
        {process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN ? (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={`{ "token": "${process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN}" }`}
          />
        ) : null}
      </head>
      <body className={inter.variable}>
        {children}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? <Analytics /> : null}
      </body>
    </html>
  );
}

