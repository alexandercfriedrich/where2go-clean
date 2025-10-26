import React from 'react';

interface TLDRBoxProps {
  title?: string;
  items: string[];
  className?: string;
}

export function TLDRBox({ title = 'TL;DR', items, className = '' }: TLDRBoxProps) {
  return (
    <div
      className={`bg-gradient-to-br from-[#2A2A2A] to-[#1F1F1F] border border-white/10 rounded-xl p-5 mb-6 ${className}`}
    >
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-xl">⚡</span>
        {title}
      </h3>
      <ul className="list-none p-0 m-0 flex flex-col gap-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-sm leading-relaxed text-white/90 pl-6 relative"
          >
            <span className="absolute left-0 text-[#FF6B35] font-bold">
              •
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
