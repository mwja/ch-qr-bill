use chrono::{DateTime, Datelike, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{prelude::FromRow, sqlite::SqliteRow, Row};

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

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(try_from = "String", into = "String")]
pub enum BillStatus {
    Draft,
    Sent,
    Paid,
    Overdue,
    Cancelled,
}

impl TryFrom<String> for BillStatus {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.as_str() {
            "draft" => Ok(BillStatus::Draft),
            "sent" => Ok(BillStatus::Sent),
            "paid" => Ok(BillStatus::Paid),
            "overdue" => Ok(BillStatus::Overdue),
            "cancelled" => Ok(BillStatus::Cancelled),
            _ => Err(format!("Invalid bill status: {}", value)),
        }
    }
}

impl Into<String> for BillStatus {
    fn into(self) -> String {
        match self {
            BillStatus::Draft => "draft".to_string(),
            BillStatus::Sent => "sent".to_string(),
            BillStatus::Paid => "paid".to_string(),
            BillStatus::Overdue => "overdue".to_string(),
            BillStatus::Cancelled => "cancelled".to_string(),
        }
    }
}

#[derive(Debug, Serialize)]
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

impl<'r> FromRow<'r, SqliteRow> for Bill {
    fn from_row(row: &'r SqliteRow) -> Result<Self, sqlx::Error> {
        let status_raw: String = row.try_get("status")?;

        let status = match BillStatus::try_from(status_raw) {
            Ok(s) => s,
            Err(_) => BillStatus::Draft, // Default to Draft if conversion fails
        };

        Ok(Bill {
            id: row.try_get("id")?,
            user_facing_id: row.try_get("user_facing_id")?,
            creditor_id: row.try_get("creditor_id")?,
            debitor_id: row.try_get("debitor_id")?,
            vat_percentage: row.try_get("vat_percentage")?,
            currency: row.try_get("currency")?,
            due_date: row.try_get("due_date")?,
            status,
            replaced_by: row.try_get("replaced_by").ok(),
            created_at: row.try_get("created_at")?,
        })
    }
}
impl Bill {
    pub fn generate_user_facing_id(timestamp: Option<DateTime<Utc>>) -> String {
        let timestamp = timestamp.unwrap_or(Utc::now()).format("%Y-%m-%d"); // Format timestamp as YYYY-MM-DD

        let random_number: u32 = rand::random::<u32>() % 10000; // Random number between 0 and 9999
        format!("BILL-{}-{:04}", timestamp, random_number)
    }

    pub fn file_name(&self) -> String {
        format!("{}-{}.pdf", self.user_facing_id, self.id)
    }

    pub fn get_due_date_count(&self) -> Option<u32> {
        let due_date = NaiveDateTime::parse_from_str(&self.due_date, "%Y-%m-%d %H:%M:%S").ok()?;
        let created_at =
            NaiveDateTime::parse_from_str(&self.created_at, "%Y-%m-%d %H:%M:%S").ok()?;
        let duration = due_date - created_at;
        Some(duration.num_days() as u32)
    }
}

pub trait BillItemsTotal {
    fn net_total(&self) -> f64;
    fn gross_total(&self, vat_percentage: f64) -> f64 {
        self.net_total() + self.total_vat(vat_percentage)
    }
    fn total_vat(&self, vat_percentage: f64) -> f64 {
        self.net_total() * (vat_percentage / 100.0)
    }
}

impl BillItemsTotal for Vec<BillItem> {
    fn net_total(&self) -> f64 {
        self.iter().map(|item| item.total_price).sum()
    }
}
