'use client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <style jsx>{`
        .admin-layout {
          min-height: 100vh;
          background-color: #f8f9fa;
        }
        .admin-header {
          background: white;
          border-bottom: 1px solid #dee2e6;
          padding: 1rem 2rem;
          margin-bottom: 2rem;
        }
        .admin-nav {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        .admin-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .nav-link {
          color: #007bff;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .nav-link:hover {
          background-color: #e9ecef;
          text-decoration: none;
        }
        .admin-content {
          padding: 0 2rem;
        }
      `}</style>
      
      <div className="admin-header">
        <nav className="admin-nav">
          <h1 className="admin-title">Where2Go Admin</h1>
          <a href="/admin" className="nav-link">Dashboard</a>
          <a href="/admin/hot-cities" className="nav-link">Hot Cities</a>
        </nav>
      </div>
      
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
}