# Static Pages Supabase Migration (Deutsch)

## Überblick
Diese Migration verschiebt die Verwaltung statischer Seiten von Redis zu Supabase und bietet eine robustere und persistente Speicherlösung für Inhalte, die über die Admin-Oberfläche verwaltet werden.

## Migrationsdatei
- **Speicherort**: `supabase/migrations/010_create_static_pages_table.sql`
- **Erstellt**: 10.12.2025

## Was hat sich geändert

### Vorher
- Statische Seiten wurden in Redis unter dem Schlüssel `where2go:static-pages:v1` gespeichert
- Fallback-Speicherung in der Datei `data/static-pages.json`
- Keine persistente Datenbankspeicherung

### Nachher
- Statische Seiten werden in der Supabase-Tabelle `static_pages` gespeichert
- Vollständige CRUD-Operationen über die Supabase-API
- Automatische Zeitstempelverwaltung
- Bessere Query-Performance durch Indizes

## Datenbankschema

```sql
CREATE TABLE static_pages (
  id VARCHAR(100) PRIMARY KEY,           -- z.B. 'seo-footer', 'impressum'
  title VARCHAR(500) NOT NULL,           -- Anzeigetitel
  content TEXT NOT NULL,                 -- HTML vom React-Quill Editor
  path VARCHAR(500) NOT NULL,            -- URL-Pfad z.B. '/', '/impressum'
  created_at TIMESTAMPTZ NOT NULL,       -- Automatisch bei Erstellung gesetzt
  updated_at TIMESTAMPTZ NOT NULL,       -- Automatisch aktualisiert via Trigger
  CONSTRAINT unique_static_page_path UNIQUE (path)
);
```

## Indizes
- `idx_static_pages_path` - Schnelle Suche nach URL-Pfad
- `idx_static_pages_updated_at` - Sortiert nach letzter Aktualisierung

## Migration ausführen

### Option 1: Über Supabase Dashboard (Empfohlen)
1. Melden Sie sich im Supabase-Projekt-Dashboard an
2. Navigieren Sie zum SQL Editor
3. Öffnen Sie die Datei `supabase/migrations/010_create_static_pages_table.sql`
4. Kopieren Sie den Inhalt und fügen Sie ihn in den SQL Editor ein
5. Klicken Sie auf "Run", um die Migration auszuführen

### Option 2: Über Supabase CLI
```bash
# Stellen Sie sicher, dass Sie die Supabase CLI installiert haben
npm install -g supabase

# Verknüpfen Sie Ihr Projekt (falls noch nicht geschehen)
supabase link --project-ref IHR_PROJECT_REF

# Führen Sie Migrationen aus
supabase db push
```

### Option 3: Manuelle Ausführung
Verbinden Sie sich mit Ihrem bevorzugten PostgreSQL-Client mit Ihrer Supabase-Datenbank und führen Sie die SQL-Datei aus.

## Datenmigration

Die Migration importiert automatisch den vorhandenen SEO-Footer-Inhalt aus `data/static-pages.json`:
- Seiten-ID: `seo-footer`
- Pfad: `/`
- Inhalt: Vollständiges HTML aus der JSON-Datei

Andere statische Seiten (datenschutz, agb, impressum, etc.) haben noch keinen Inhalt und können über die Admin-Oberfläche hinzugefügt werden.

## API-Änderungen

### Admin-API (`/api/admin/static-pages`)
- `GET` - Listet alle statischen Seiten aus Supabase auf
- `POST` - Erstellt/aktualisiert eine statische Seite in Supabase
- `DELETE` - Entfernt eine statische Seite aus Supabase

### Öffentliche API (`/api/static-pages/[id]`)
- `GET` - Ruft eine bestimmte statische Seite nach ID aus Supabase ab

## Admin-Oberfläche
Die Admin-Oberfläche unter `/admin/static-pages` funktioniert weiterhin ohne Änderungen:
- Alle statischen Seiten anzeigen
- Inhalte mit React-Quill Rich-Text-Editor bearbeiten
- Änderungen in Supabase speichern

## Verwaltete statische Seiten
1. **seo-footer** - SEO-Inhalt für Homepage-Footer (/)
2. **datenschutz** - Datenschutzerklärung (/datenschutz)
3. **agb** - Allgemeine Geschäftsbedingungen (/agb)
4. **impressum** - Impressum (/impressum)
5. **ueber-uns** - Über uns (/ueber-uns)
6. **kontakt** - Kontaktseite (/kontakt)
7. **premium** - Premium-Funktionen (/premium)

## Rollback
Falls Sie diese Migration rückgängig machen müssen:

```sql
DROP TABLE IF EXISTS static_pages CASCADE;
DROP FUNCTION IF EXISTS update_static_pages_updated_at() CASCADE;
```

Dann machen Sie die Code-Änderungen rückgängig, um wieder Redis zu verwenden.

## Überprüfung

Nach Anwendung der Migration überprüfen Sie, ob alles funktioniert:

1. Prüfen Sie, ob die Tabelle existiert:
```sql
SELECT * FROM static_pages;
```

2. Testen Sie die Admin-Oberfläche:
   - Navigieren Sie zu `/admin/static-pages`
   - Bearbeiten Sie eine Seite
   - Speichern Sie und überprüfen Sie, ob die Änderungen erhalten bleiben

3. Prüfen Sie die API:
```bash
curl https://ihre-domain.com/api/static-pages/seo-footer
```

## Hinweise
- Die Migration verwendet `ON CONFLICT (id) DO NOTHING`, um doppelte Einfügungen zu vermeiden
- Das Feld `updated_at` wird automatisch durch einen Datenbank-Trigger verwaltet
- Alle Inhalte werden als HTML gespeichert (vom React-Quill Editor)
- Der Pfad muss mit `/` beginnen (wird in der API validiert)

## Support
Falls Sie auf Probleme stoßen:
1. Prüfen Sie die Supabase-Logs im Dashboard
2. Überprüfen Sie, ob die Umgebungsvariablen korrekt gesetzt sind
3. Stellen Sie sicher, dass der Service-Role-Key die richtigen Berechtigungen hat
4. Überprüfen Sie die Browser-Konsole auf Frontend-Fehler

## Antwort auf das Issue

Diese Änderung beantwortet Ihr Issue:
- ✅ Eine Supabase-Tabelle `static_pages` wurde erstellt
- ✅ SQL-Migration-Datei ist verfügbar: `supabase/migrations/010_create_static_pages_table.sql`
- ✅ Bestehende Inhalte aus `data/static-pages.json` wurden in die Migration integriert
- ✅ Die Admin-Oberfläche funktioniert weiterhin und speichert jetzt in Supabase
- ✅ Alle statisch gespeicherten Inhalte (SEO-Footer) wurden migriert

Sie müssen nur noch die SQL-Migration in Ihrer Supabase-Datenbank ausführen (siehe Option 1-3 oben).
