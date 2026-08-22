use std::path::PathBuf;

use chrono::Utc;
use serde::Deserialize;
use tauri::{AppHandle, Manager};

use crate::{
    bill::BillBuilder,
    db::{
        models::{Bill, BillItem, BillItemsTotal as _, Creditor, Debitor},
        DatabaseState,
    },
};

#[tauri::command]
pub async fn get_all_bills(state: tauri::State<'_, DatabaseState>) -> Result<Vec<Bill>, String> {
    let stmt = r#"--sql
        SELECT id, creditor_id, debitor_id, amount, currency, due_date, created_at
        FROM bills
        "#;

    let bills = sqlx::query_as::<_, Bill>(stmt)
        .fetch_all(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(bills)
}

#[tauri::command]
pub async fn get_pending_bills(
    state: tauri::State<'_, DatabaseState>,
) -> Result<Vec<Bill>, String> {
    let stmt = r#"--sql
        SELECT id, creditor_id, debitor_id, amount, currency, due_date, created_at
        FROM bills
        WHERE status IN ('draft', 'sent', 'overdue')
        "#;

    let bills = sqlx::query_as::<_, Bill>(stmt)
        .fetch_all(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(bills)
}

#[tauri::command]
pub async fn get_bill_by_id(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<Bill, String> {
    let stmt = r#"--sql
        SELECT id, creditor_id, debitor_id, amount, currency, due_date, created_at
        FROM bills
        WHERE id = $1
        "#;

    let bill = sqlx::query_as::<_, Bill>(stmt)
        .bind(bill_id)
        .fetch_one(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(bill)
}

#[derive(Debug, Deserialize)]
pub struct CreateBillInput {
    pub bill_id: i64,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
}

#[tauri::command]
pub async fn create_bill(
    state: tauri::State<'_, DatabaseState>,
    data: CreateBillInput,
) -> Result<Bill, String> {
    // Auto generate user facing ID
    let created_at = Utc::now();
    let user_facing_id = Bill::generate_user_facing_id(Some(created_at));

    let stmt = r#"--sql
        INSERT INTO bills (user_facing_id, creditor_id, debitor_id, amount, currency, due_date, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, user_facing_id, creditor_id, debitor_id, amount, currency, due_date, created_at
        "#;

    let bill = sqlx::query_as::<_, Bill>(stmt)
        .bind(user_facing_id)
        .bind(data.bill_id)
        .bind(data.description)
        .bind(data.quantity)
        .bind(data.unit_price)
        .bind(data.total_price)
        .bind(created_at)
        .fetch_one(state.inner().inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(bill)
}

#[tauri::command]
pub async fn generate_bill_document(
    app_handle: AppHandle,
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<String, String> {
    let bill = {
        let stmt = r#"--sql
            SELECT id, user_facing_id, creditor_id, debitor_id, vat_percentage, currency, due_date, status, replaced_by, created_at
            FROM bills
            WHERE id = $1
            "#;

        sqlx::query_as::<_, Bill>(stmt)
            .bind(bill_id)
            .fetch_one(state.inner().inner())
            .await
            .map_err(|e| e.to_string())?
    };

    let bill_items = {
        let stmt = r#"--sql
        SELECT id, bill_id, description, quantity, unit_price, total_price, created_at
        FROM bill_items
        WHERE bill_id = $1
        "#;

        sqlx::query_as::<_, BillItem>(stmt)
            .bind(bill_id)
            .fetch_all(state.inner().inner())
            .await
            .map_err(|e| e.to_string())?
    };

    let debitor = {
        let stmt = r#"--sql
            SELECT id, name, street, street_number, city, postal_code, country, created_at
            FROM debitors
            WHERE id = $1
            "#;

        sqlx::query_as::<_, Debitor>(stmt)
            .bind(bill.debitor_id)
            .fetch_one(state.inner().inner())
            .await
            .map_err(|e| e.to_string())?
    };

    let creditor = {
        let stmt = r#"--sql
            SELECT id, name, street, street_number, city, postal_code, country, vat_number, iban, created_at
            FROM creditors
            WHERE id = $1
            "#;

        sqlx::query_as::<_, Creditor>(stmt)
            .bind(bill.creditor_id)
            .fetch_one(state.inner().inner())
            .await
            .map_err(|e| e.to_string())?
    };

    let base_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let bill_file_name = bill.file_name();
    let file_dir = base_dir.join("bills").join(bill_file_name);

    let mut builder = BillBuilder::new()
        .bill_no(bill.user_facing_id.clone())
        .bill_due_date(bill.due_date.clone())
        .bill_due_date_count(bill.get_due_date_count().unwrap_or(0))
        .debitor(debitor.into())
        .creditor(creditor.into())
        .net_total(bill_items.net_total())
        .vat_total(bill_items.total_vat(bill.vat_percentage))
        .gross_total(bill_items.gross_total(bill.vat_percentage));

    for item in bill_items {
        builder = builder.add_item(item.into());
    }

    std::fs::write(
        file_dir.clone(),
        builder.build().map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(file_dir.to_string_lossy().into_owned())
}
