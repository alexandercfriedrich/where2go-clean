import React from 'react';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
  title?: string;
}

export function FAQSection({ faqs, title = 'Häufig gestellte Fragen' }: FAQSectionProps) {
  // Generate Schema.org FAQPage
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map((faq) => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      {/* Visual FAQ Section */}
      <section
        style={{
          marginTop: '48px',
          marginBottom: '48px',
        }}
      >
        <h2
          style={{
            fontFamily: 'FK Grotesk Neue, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
            fontSize: '18pt',
            fontWeight: 300,
            fontVariant: 'small-caps',
            lineHeight: '21pt',
            color: '#20b8cd',
            marginBottom: '24px',
          }}
        >
          {title}
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {faqs.map((faq, index) => (
            <div
              key={index}
              itemScope
              itemType="https://schema.org/Question"
              style={{
                background: 'linear-gradient(135deg, #2A2A2A 0%, #1F1F1F 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <h3
                itemProp="name"
                style={{
                  fontFamily: 'FK Grotesk Neue, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
                  fontSize: '18pt',
                  fontWeight: 300,
                  fontVariant: 'small-caps',
                  lineHeight: '21pt',
                  color: '#20b8cd',
                  marginBottom: '12px',
                }}
              >
                {faq.question}
              </h3>
              <div
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <div
                  itemProp="text"
                  style={{
                    fontFamily: 'FK Grotesk Neue, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
                    fontSize: '14pt',
                    fontWeight: 100,
                    lineHeight: '18pt',
                    color: '#F5F5F5',
                  }}
                >
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
