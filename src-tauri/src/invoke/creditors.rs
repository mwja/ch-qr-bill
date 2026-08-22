use anyhow::Result;
use serde::Deserialize;

use crate::db::{models::Creditor, DatabaseState};

#[tauri::command]
pub async fn get_all_creditors(
    state: tauri::State<'_, DatabaseState>,
) -> Result<Vec<Creditor>, String> {
    let stmt = r#"--sql
        SELECT
        id, name, street, street_number, city, postal_code, country, vat_number, iban, created_at
        FROM creditors
        ORDER BY lower(name) ASC
        "#;

    let creditors = sqlx::query_as::<_, Creditor>(stmt)
        .fetch_all(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(creditors)
}

#[derive(Debug, Deserialize)]
pub struct CreateCreditorInput {
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
    pub vat_number: Option<String>,
    pub iban: String,
}

#[tauri::command]
pub async fn create_creditor(
    state: tauri::State<'_, DatabaseState>,
    input: CreateCreditorInput,
) -> Result<Creditor, String> {
    let stmt = r#"--sql
        INSERT INTO creditors (name, street, street_number, city, postal_code, country, vat_number, iban)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, street, street_number, city, postal_code, country, vat_number, iban, created_at
        "#;

    let creditor = sqlx::query_as::<_, Creditor>(stmt)
        .bind(input.name)
        .bind(input.street)
        .bind(input.street_number)
        .bind(input.city)
        .bind(input.postal_code)
        .bind(input.country)
        .bind(input.vat_number)
        .bind(input.iban)
        .fetch_one(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(creditor)
}

#[tauri::command]
pub async fn delete_creditor(
    state: tauri::State<'_, DatabaseState>,
    creditor_id: i64,
) -> Result<(), String> {
    let stmt = r#"--sql
        DELETE FROM creditors WHERE id = $1
        "#;

    sqlx::query(stmt)
        .bind(creditor_id)
        .execute(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
