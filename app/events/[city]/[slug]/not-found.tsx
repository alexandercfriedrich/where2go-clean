import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-300 mb-6">
          Event nicht gefunden
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Das gesuchte Event konnte nicht gefunden werden. Es wurde möglicherweise verschoben,
          abgesagt oder ist nicht mehr verfügbar.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="text-white font-semibold py-3 px-6 rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: '#20B8CD' }}
          >
            Zur Startseite
          </Link>
          <Link
            href="/"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Events entdecken
          </Link>
        </div>
      </div>
    </div>
  );
}
