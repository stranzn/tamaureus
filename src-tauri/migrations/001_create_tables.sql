CREATE TABLE IF NOT EXISTS artists (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS albums (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    artist_id  INTEGER NOT NULL,
    cover_path TEXT,
    -- you might want to add release_year INTEGER later
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS tracks (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path        TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    artist_id        INTEGER NOT NULL,
    album_id         INTEGER NOT NULL,
    duration_ms      INTEGER NOT NULL,
    file_format      TEXT NOT NULL,
    file_size        INTEGER NOT NULL,          -- bytes
    date_added       INTEGER NOT NULL DEFAULT (CAST(strftime('%Y%m%d', 'now') AS INTEGER)),
    thumbnail_base64 TEXT,                         -- nullable
    thumbnail_mime   TEXT,                         -- nullable

    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE RESTRICT,
    FOREIGN KEY (album_id)  REFERENCES albums(id)  ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS playlists (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    cover_path      TEXT,
    cover_color     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    
    CHECK(name != '')
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id  INTEGER NOT NULL,
    track_id     INTEGER NOT NULL,
    position     INTEGER NOT NULL,               -- order in playlist (0-based)
    added_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    
    PRIMARY KEY (playlist_id, track_id),           -- no duplicate tracks
    UNIQUE (playlist_id, position),                -- no gaps/overlaps in order
    
    FOREIGN KEY (playlist_id) REFERENCES playlists(id)  ON DELETE CASCADE,
    FOREIGN KEY (track_id)    REFERENCES tracks(id)     ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_name_unique_user
ON playlists(name COLLATE NOCASE)
WHERE is_system = 0;

-- UNKNOWN ARTIST ROW CREATION
INSERT OR IGNORE INTO artists (id, name)
VALUES (1, 'Unknown Artist');

-- UNKNOWN ALBUM ROW CREATION
INSERT OR IGNORE INTO albums (id, title, artist_id)
VALUES (1, 'Unknown Album', 1);

-- triggers to prevent deletion of the default rows
CREATE TRIGGER IF NOT EXISTS prevent_unknown_artist_delete
BEFORE DELETE ON artists
WHEN OLD.id = 1
BEGIN
    SELECT RAISE(ABORT, 'Cannot delete Unknown Artist');
END;

CREATE TRIGGER IF NOT EXISTS prevent_unknown_album_delete
BEFORE DELETE ON albums
WHEN OLD.id = 1
BEGIN
    SELECT RAISE(ABORT, 'Cannot delete Unknown Album');
END;