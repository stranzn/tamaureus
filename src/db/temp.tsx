import Database from '@tauri-apps/plugin-sql';

export const initialize = async () => {
    try {
        console.log("Loading DB");
        const  db = await Database.load('sqlite:tamaureus.db');

        const tables = await db.select('SELECT name FROM sqlite_schema WHERE type = "table" AND name NOT LIKE "sqlite_%";');
        console.log('Tables created:', tables);

        await db.execute('INSERT INTO artists (name) VALUES (?)', ['Test Artist']);
        console.log('Test row inserted! Database is ready.');
    } catch (error) {
        console.error("DB error:", error)
    }
};