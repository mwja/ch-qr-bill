use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, FromRow, Serialize)]
pub struct Creditor {
    pub id: i64,
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
    pub vat_number: Option<String>,
    pub iban: String,
    pub created_at: String,
}

#[derive(Debug, FromRow, Serialize)]
pub struct Debitor {
    pub id: i64,
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
    pub created_at: String,
}

#[derive(Debug, FromRow, Serialize)]
pub struct BillItem {
    pub id: i64,
    pub bill_id: i64,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum BillStatus {
    #[serde(rename = "draft")]
    Draft,
    #[serde(rename = "sent")]
    Sent,
    #[serde(rename = "paid")]
    Paid,
    #[serde(rename = "overdue")]
    Overdue,
    #[serde(rename = "cancelled")]
    Cancelled,
}

#[derive(Debug, FromRow, Serialize)]
pub struct Bill {
    pub id: i64,
    pub user_facing_id: String,
    pub creditor_id: i64,
    pub debitor_id: i64,
    pub vat_percentage: f64,
    pub currency: String,
    pub due_date: String,
    pub status: BillStatus,
    pub replaced_by: Option<i64>,
    pub created_at: String,
}

impl Bill {
    pub fn generate_user_facing_id() -> String {
        let timestamp = time_format::strftime_utc("%Y-%m-%d", time_format::now().unwrap()).unwrap();
        let random_number: u32 = rand::random::<u32>() % 10000; // Random number between 0 and 9999
        format!("BILL-{}-{:04}", timestamp, random_number)
    }
}
