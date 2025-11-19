import Link from 'next/link';

export default function VenueNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <div
            className="text-6xl font-bold mb-4"
            style={{ color: '#FF6B35' }}
          >
            404
          </div>
          <h1 className="text-3xl font-bold mb-4">Venue nicht gefunden</h1>
          <p className="text-gray-400 text-lg mb-8">
            Die gesuchte Veranstaltungslocation konnte nicht gefunden werden. Möglicherweise wurde sie umbenannt oder ist nicht mehr verfügbar.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
            style={{
              background: '#FF6B35',
              color: '#FFFFFF',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Zur Startseite
          </Link>

          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
            }}
          >
            Venues entdecken
          </Link>
        </div>
      </div>
    </div>
  );
}
