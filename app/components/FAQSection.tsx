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
            fontSize: '16pt',
            fontWeight: 300,
            textTransform: 'uppercase',
            letterSpacing: '0.45em',
            lineHeight: '21pt',
            color: 'rgb(32, 184, 205)',
            marginBottom: '1.5rem',
            textAlign: 'center',
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
                border: '1px solid rgba(32, 225, 211, 0.15)',
                borderRadius: '12px',
                padding: '20px',
              }}
              className="dark:bg-white/5 dark:border-white/10"
            >
              <h3
                itemProp="name"
                style={{
                  fontFamily: 'FK Grotesk Neue, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
                  fontSize: '12pt',
                  fontWeight: 200,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  lineHeight: '21pt',
                  color: 'rgb(32, 184, 205)',
                  marginBottom: '12px',
                  textAlign: 'center',
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
                    fontSize: '10pt',
                    fontWeight: 200,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    lineHeight: '21pt',
                    color: '#f5f5f5',
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
