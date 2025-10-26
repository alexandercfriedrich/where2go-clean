import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const baseUrl = 'https://www.where2go.at';
  
  // Generate Schema.org BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': baseUrl,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 2,
        'name': item.label,
        'item': `${baseUrl}${item.href}`,
      })),
    ],
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      {/* Visual Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        style={{
          marginBottom: '16px',
          fontSize: '14px',
        }}
      >
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <li>
            <Link
              href="/"
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
            >
              Home
            </Link>
          </li>
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <li
                style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  userSelect: 'none',
                }}
              >
                /
              </li>
              <li>
                {index === items.length - 1 ? (
                  <span
                    style={{
                      color: '#FFFFFF',
                      fontWeight: 500,
                    }}
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    }}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          ))}
        </ol>
      </nav>
    </>
  );
}
