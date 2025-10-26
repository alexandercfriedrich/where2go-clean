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
      <section className="mt-12 mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">
          {title}
        </h2>
        <div className="flex flex-col gap-5">
          {faqs.map((faq, index) => (
            <div
              key={index}
              itemScope
              itemType="https://schema.org/Question"
              className="bg-gradient-to-br from-[#2A2A2A] to-[#1F1F1F] border border-white/10 rounded-xl p-5"
            >
              <h3
                itemProp="name"
                className="text-lg font-semibold text-white mb-3"
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
                  className="text-[15px] leading-relaxed text-white/85"
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
