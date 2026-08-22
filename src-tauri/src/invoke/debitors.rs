use anyhow::Result;
use serde::Deserialize;

use crate::db::{models::Debitor, DatabaseState};

#[tauri::command]
pub async fn get_all_debitors(
    state: tauri::State<'_, DatabaseState>,
) -> Result<Vec<Debitor>, String> {
    let stmt = r#"--sql
        SELECT
        id, name, street, street_number, city, postal_code, country, created_at
        FROM debitors
        ORDER BY lower(name) ASC
        "#;

    let debitors = sqlx::query_as::<_, Debitor>(stmt)
        .fetch_all(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(debitors)
}

#[derive(Debug, Deserialize)]
pub struct CreateDebitorInput {
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
}
#[tauri::command]
pub async fn create_debitor(
    state: tauri::State<'_, DatabaseState>,
    input: CreateDebitorInput,
) -> Result<Debitor, String> {
    println!("hoooop");
    let stmt = r#"--sql
        INSERT INTO debitors (name, street, street_number, city, postal_code, country)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, street, street_number, city, postal_code, country, created_at
        "#;

    let debitor = sqlx::query_as::<_, Debitor>(stmt)
        .bind(input.name)
        .bind(input.street)
        .bind(input.street_number)
        .bind(input.city)
        .bind(input.postal_code)
        .bind(input.country)
        .fetch_one(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(debitor)
}

#[tauri::command]
pub async fn delete_debitor(
    state: tauri::State<'_, DatabaseState>,
    debitor_id: i64,
) -> Result<(), String> {
    let stmt = r#"--sql
        DELETE FROM debitors WHERE id = $1
        "#;

    sqlx::query(stmt)
        .bind(debitor_id)
        .execute(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
