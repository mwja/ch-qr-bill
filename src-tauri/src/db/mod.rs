use anyhow::Result;
use sqlx::{Pool, Sqlite};
use std::{env, fs};
use tauri::{AppHandle, Manager};

pub mod models;

pub struct Database {
    pub pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(app_handle: &AppHandle) -> Result<Self> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("failed to get app dir");

        // Ensure the app directory exists
        fs::create_dir_all(&app_dir)?;

        let db_path = app_dir.join("data.db");

        // Set the DATABASE_URL environment variable to point to this SQLite file
        env::set_var("DATABASE_URL", format!("sqlite://{}", db_path.display()));

        let connection_options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

        let pool = Pool::<Sqlite>::connect_with(connection_options).await?;

        // Run migrations
        sqlx::migrate!().run(&pool).await?;

        Ok(Self { pool })
    }
}

pub struct DatabaseState(pub Pool<Sqlite>);

impl DatabaseState {
    pub fn inner(&self) -> &Pool<Sqlite> {
        &self.0
    }
}
