/**
 * Custom 404 Not Found Page with Event Suggestions
 * Displays helpful navigation to help users find what they're looking for
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#091717' }}>
      {/* Hero Section with 404 Message */}
      <div style={{ background: 'linear-gradient(to bottom, #13343B, #091717)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-8">
            <h1 className="text-8xl md:text-9xl font-bold mb-4" style={{ color: '#20B8CD' }}>
              404
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Seite nicht gefunden
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Die gesuchte Seite existiert nicht oder wurde verschoben.
              Entdecke stattdessen aktuelle Events in deiner Stadt!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/"
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #20B8CD, #13343B)',
                boxShadow: '0 4px 15px rgba(32, 184, 205, 0.3)',
              }}
            >
              Zur Startseite
            </Link>
            <Link
              href="/discover"
              className="px-8 py-3 rounded-lg font-semibold text-white border-2 transition-all duration-200 hover:scale-105"
              style={{
                borderColor: '#20B8CD',
                backgroundColor: 'rgba(32, 184, 205, 0.1)',
              }}
            >
              Events entdecken
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Entdecke Events nach Stadt
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <Link
            href="/wien"
            className="group relative overflow-hidden rounded-lg p-6 text-center transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Wien</h3>
            <p className="text-sm text-gray-400">Events entdecken →</p>
          </Link>
          <Link
            href="/discover/trending"
            className="group relative overflow-hidden rounded-lg p-6 text-center transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Trending</h3>
            <p className="text-sm text-gray-400">Beliebte Events →</p>
          </Link>
          <Link
            href="/discover/weekend"
            className="group relative overflow-hidden rounded-lg p-6 text-center transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Wochenende</h3>
            <p className="text-sm text-gray-400">Weekend Events →</p>
          </Link>
          <Link
            href="/blog"
            className="group relative overflow-hidden rounded-lg p-6 text-center transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Blog</h3>
            <p className="text-sm text-gray-400">Event-Tipps →</p>
          </Link>
        </div>
      </div>

      {/* Popular Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-800">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Oder nach Kategorie
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {[
            { label: 'Clubs', href: '/wien/clubs-nachtleben' },
            { label: 'Konzerte', href: '/wien/live-konzerte' },
            { label: 'Theater', href: '/wien/theater-comedy' },
            { label: 'Museen', href: '/wien/museen-ausstellungen' },
            { label: 'Sport', href: '/wien/sport-fitness' },
            { label: 'Familie', href: '/wien/familie-kinder' },
          ].map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="p-4 rounded-lg text-center font-semibold text-white transition-all duration-200 hover:scale-105 text-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

