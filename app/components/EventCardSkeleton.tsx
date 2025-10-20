export default function EventCardSkeleton() {
  return (
    <div className="event-card-skeleton">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-category"></div>
        <div className="skeleton-title"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
      </div>
      
      <style jsx>{`
        .event-card-skeleton {
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1), 
                      0 8px 16px rgba(0,0,0,0.2), 
                      0 16px 32px rgba(0,0,0,0.15);
          position: relative;
          min-height: 300px;
        }
        
        .skeleton-image {
          width: 100%;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-content {
          padding: 24px;
        }
        
        .skeleton-category {
          width: 80px;
          height: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        
        .skeleton-title {
          width: 90%;
          height: 20px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        
        .skeleton-line {
          width: 100%;
          height: 14px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .skeleton-line.short {
          width: 60%;
        }
        
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
