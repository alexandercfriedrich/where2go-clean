import React from 'react';

interface HowToStep {
  name: string;
  text: string;
}

interface HowToSectionProps {
  title: string;
  description?: string;
  steps: HowToStep[];
}

export function HowToSection({ title, description, steps }: HowToSectionProps) {
  // Generate Schema.org HowTo
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    'name': title,
    'description': description || title,
    'step': steps.map((step, index) => ({
      '@type': 'HowToStep',
      'position': index + 1,
      'name': step.name,
      'text': step.text,
    })),
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      
      {/* Visual HowTo Section */}
      <section
        style={{
          marginTop: '48px',
          marginBottom: '48px',
        }}
      >
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '16px',
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.85)',
              marginBottom: '24px',
            }}
          >
            {description}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {steps.map((step, index) => (
            <div
              key={index}
              itemScope
              itemType="https://schema.org/HowToStep"
              style={{
                background: 'linear-gradient(135deg, #2A2A2A 0%, #1F1F1F 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  itemProp="name"
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    marginBottom: '8px',
                  }}
                >
                  {step.name}
                </h3>
                <div
                  itemProp="text"
                  style={{
                    fontSize: '15px',
                    lineHeight: '1.6',
                    color: 'rgba(255, 255, 255, 0.85)',
                  }}
                >
                  {step.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
