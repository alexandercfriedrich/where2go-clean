# Wien.info Event Category Mapping Guide

This document defines the official mapping between where2go.at main categories and wien.info event categories with their F1 tag IDs.

## Category Mapping Table

where2go.at          |  wien.info Kategorie                                              |  ID
---------------------+-------------------------------------------------------------------+-----------------
DJ Sets/Electronic   |  Rock, Pop, Jazz und mehr                                         |  896980
Clubs/Discos         |  Rock, Pop, Jazz und mehr                                         |  896980
Live-Konzerte        |  Rock, Pop, Jazz und mehr / Klassisch                             |  896980 / 896984
Theater/Performance  |  Musical, Tanz und Performance / Theater und Kabarett             |  896988 / 896978
Open Air             |  Führungen, Spaziergänge & Touren / Sport, Bewegung und Freizeit  |  896974 / 896994
Museen               |  Ausstellungen                                                    |  896982
Comedy/Kabarett      |  Theater und Kabarett                                             |  896978
Film                 |  Film und Sommerkino                                              |  896992
Kunst/Design         |  Ausstellungen                                                    |  896982
Kultur/Traditionen   |  Typisch Wien / Führungen                                         |  897000 / 896974
LGBTQ+               |  Wien für Jugendliche, LGBTQIA+                                   |  896996
Bildung/Lernen       |  Führungen, Spaziergänge & Touren                                 |  896974
Networking/Business  |  Führungen, Spaziergänge & Touren                                 |  896974
Sport                |  Sport, Bewegung und Freizeit                                     |  896994
Natur/Outdoor        |  Führungen, Spaziergänge & Touren / Sport, Bewegung und Freizeit  |  896974 / 896994
Wellness/Spirituell  |  Sport, Bewegung und Freizeit                                     |  896994
Soziales/Community   |  Familien, Kids / Typisch Wien                                    |  896986 / 897000
Märkte/Shopping      |  Märkte und Messen                                                |  896990
Food/Culinary        |  Kulinarik                                                        |  896998
Familien/Kids        |  Familien, Kids                                                   |  896986

## Usage

This mapping is used to:
1. Filter wien.info events by F1 tag IDs when fetching from their API
2. Reverse-map wien.info category labels back to where2go.at categories
3. Provide debug information about category coverage and unknown categories

## Implementation

The mapping is implemented in `app/event_mapping_wien_info.ts` as the single source of truth (SSOT) for all Wien.info category mapping operations.
