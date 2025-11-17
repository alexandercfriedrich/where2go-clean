'use client'

import { useState } from 'react'

interface Event {
  id: string
  title: string
  category: string
  city: string
  start_date_time: string
  description: string | null
  custom_venue_name: string | null
  price_info: string | null
  website_url: string | null
}

interface ApiResponse {
  success: boolean
  data: Event[]
  count: number
  meta?: {
    fromCache: boolean
    source: string
    city: string
    date?: string
    category?: string
  }
  error?: string
}

export default function TestPostgreSQLPage() {
  const [city, setCity] = useState('Wien')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('10')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const params = new URLSearchParams()
      params.append('city', city)
      if (date) params.append('date', date)
      if (category) params.append('category', category)
      params.append('limit', limit)

      const url = `/api/v1/events?${params.toString()}`
      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch events')
      } else {
        setResponse(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>PostgreSQL Test Page</h1>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '1.5rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginTop: 0 }}>Query Parameters</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              City (required):
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc' 
              }}
              placeholder="e.g., Wien, Berlin"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Date (optional):
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc' 
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Category (optional):
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc' 
              }}
              placeholder="e.g., Musik & Nachtleben"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Limit:
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: '4px', 
                border: '1px solid #ccc' 
              }}
              min="1"
              max="100"
            />
          </div>
        </div>

        <button
          onClick={handleFetch}
          disabled={loading || !city}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Loading...' : 'Fetch Events'}
        </button>
      </div>

      {error && (
        <div style={{ 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          padding: '1rem', 
          borderRadius: '4px',
          marginBottom: '1rem',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div>
          <div style={{ 
            backgroundColor: '#efe', 
            border: '1px solid #cfc',
            padding: '1rem', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <h3 style={{ marginTop: 0 }}>Response Metadata</h3>
            <p><strong>Success:</strong> {response.success ? 'Yes' : 'No'}</p>
            <p><strong>Count:</strong> {response.count}</p>
            {response.meta && (
              <>
                <p><strong>Source:</strong> {response.meta.source}</p>
                <p><strong>From Cache:</strong> {response.meta.fromCache ? 'Yes' : 'No'}</p>
                <p><strong>City:</strong> {response.meta.city}</p>
                {response.meta.date && <p><strong>Date:</strong> {response.meta.date}</p>}
                {response.meta.category && <p><strong>Category:</strong> {response.meta.category}</p>}
              </>
            )}
          </div>

          <h3>Events ({response.count})</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {response.data.map((event) => (
              <div 
                key={event.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'white'
                }}
              >
                <h4 style={{ marginTop: 0, color: '#333' }}>{event.title}</h4>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  <p><strong>Category:</strong> {event.category}</p>
                  <p><strong>City:</strong> {event.city}</p>
                  <p><strong>Date:</strong> {new Date(event.start_date_time).toLocaleString()}</p>
                  {event.custom_venue_name && (
                    <p><strong>Venue:</strong> {event.custom_venue_name}</p>
                  )}
                  {event.price_info && (
                    <p><strong>Price:</strong> {event.price_info}</p>
                  )}
                  {event.description && (
                    <p><strong>Description:</strong> {event.description.substring(0, 200)}...</p>
                  )}
                  {event.website_url && (
                    <p>
                      <a 
                        href={event.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#007bff' }}
                      >
                        Visit Website →
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {response.count === 0 && (
            <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
              No events found for the specified criteria.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
