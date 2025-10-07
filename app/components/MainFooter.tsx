'use client';

export default function MainFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="main-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-links">
            <a href="/impressum" className="footer-link">Impressum</a>
            <a href="/agb" className="footer-link">AGB</a>
            <a href="/kontakt" className="footer-link">Kontakt</a>
            <a href="/ueber-uns" className="footer-link">Über uns</a>
            <a href="/premium" className="footer-link">Premium</a>
            <a href="/datenschutz" className="footer-link">Datenschutz</a>
          </div>
          <div className="footer-copyright">
            <p>© {currentYear} Where2Go - Entdecke deine Stadt neu</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .main-footer {
          background: #1a1a1a;
          color: #ffffff;
          padding: 32px 0;
          margin-top: 80px;
          border-top: 1px solid #333;
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 24px;
          justify-content: center;
          align-items: center;
        }

        .footer-link {
          color: #e0e0e0;
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          transition: color 0.2s ease;
          padding: 4px 0;
        }

        .footer-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .footer-copyright {
          text-align: center;
        }

        .footer-copyright p {
          color: #9ca3af;
          font-size: 13px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .main-footer {
            padding: 24px 0;
            margin-top: 60px;
          }

          .footer-links {
            flex-direction: column;
            gap: 12px;
          }

          .footer-link {
            font-size: 13px;
          }
        }
      `}</style>
    </footer>
  );
}
