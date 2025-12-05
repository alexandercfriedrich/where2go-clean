# Venue Fallback Images

This directory contains fallback images for venues. When an event doesn't have its own image, the system displays the venue's logo/image instead.

## Adding Venue Images

1. Download the venue logo from their official website
2. Save it as `{venue-key}.png` (e.g., `grelle-forelle.png`)
3. Recommended size: 400x400px or larger, square aspect ratio
4. Supported formats: PNG, JPG, WebP, SVG

## Venue Keys

The venue key is the hyphenated version of the venue name, matching the scraper config:

| Venue | File Name |
|-------|-----------|
| Grelle Forelle | `grelle-forelle.png` |
| Flex | `flex.png` |
| Pratersauna | `pratersauna.png` |
| Das WERK | `das-werk.png` |
| U4 | `u4.png` |
| Volksgarten | `volksgarten.png` |
| Babenberger Passage | `babenberger-passage.png` |
| Camera Club | `camera-club.png` |
| Celeste | `celeste.png` |
| Chelsea | `chelsea.png` |
| Donau | `donau.png` |
| Flucc | `flucc.png` |
| O - der Klub | `o-der-klub.png` |
| Ponyhof | `ponyhof.png` |
| Prater DOME | `prater-dome.png` |
| Praterstrasse | `praterstrasse.png` |
| SASS Music Club | `sass-music-club.png` |
| The Loft | `the-loft.png` |
| VIEiPEE | `vieipee.png` |
| rhiz | `rhiz.png` |
| Patroc Wien Gay Events | `patroc-wien-gay.png` |

## Placeholder

If a venue-specific image isn't available, a CSS gradient is used as the default fallback.
