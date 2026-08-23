use chrono::{DateTime, NaiveDate, NaiveDateTime, TimeDelta, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{prelude::FromRow, sqlite::SqliteRow, Pool, Row, Sqlite, SqliteExecutor};

/// Accepted shapes for the datetime columns, most precise first.
const DATETIME_FORMATS: [&str; 4] = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%dT%H:%M",
];

/// The one representation the database stores.
const SQLITE_DATETIME: &str = "%Y-%m-%d %H:%M:%S";

/// Parses whatever the front-end sent (`2026-08-22`, `2026-08-22T10:00`, ...) into
/// the single representation used by every datetime column.
pub fn normalize_datetime(value: &str) -> Option<String> {
    let value = value.trim();

    for format in DATETIME_FORMATS {
        if let Ok(parsed) = NaiveDateTime::parse_from_str(value, format) {
            return Some(parsed.format(SQLITE_DATETIME).to_string());
        }
    }

    if let Ok(date) = NaiveDate::parse_from_str(value, "%Y-%m-%d") {
        return Some(
            date.and_hms_opt(0, 0, 0)?
                .format(SQLITE_DATETIME)
                .to_string(),
        );
    }

    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|parsed| parsed.naive_utc().format(SQLITE_DATETIME).to_string())
}

/// The date part alone, for anything shown to a human: the stored datetimes
/// carry a `00:00:00` that has no business being printed on a bill.
pub fn format_date(value: &str) -> String {
    parse_datetime(value)
        .map(|parsed| parsed.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| value.trim().to_owned())
}

fn parse_datetime(value: &str) -> Option<NaiveDateTime> {
    normalize_datetime(value)
        .and_then(|value| NaiveDateTime::parse_from_str(&value, SQLITE_DATETIME).ok())
}

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
    /// Data URL (`data:image/png;base64,...`) embedded in the bill document.
    pub logo_base64: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreditorInput {
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
    pub vat_number: Option<String>,
    pub iban: String,
    #[serde(default)]
    pub logo_base64: Option<String>,
}

impl Creditor {
    pub const COLUMNS: &'static str =
        "id, name, street, street_number, city, postal_code, country, vat_number, iban, logo_base64, created_at";

    pub async fn find_all<'e, E: SqliteExecutor<'e>>(executor: E) -> sqlx::Result<Vec<Creditor>> {
        sqlx::query_as::<_, Creditor>(&format!(
            "SELECT {} FROM creditors ORDER BY lower(name) ASC",
            Self::COLUMNS
        ))
        .fetch_all(executor)
        .await
    }

    pub async fn find_by_id<'e, E: SqliteExecutor<'e>>(
        executor: E,
        creditor_id: i64,
    ) -> sqlx::Result<Creditor> {
        sqlx::query_as::<_, Creditor>(&format!(
            "SELECT {} FROM creditors WHERE id = $1",
            Self::COLUMNS
        ))
        .bind(creditor_id)
        .fetch_one(executor)
        .await
    }

    pub async fn create<'e, E: SqliteExecutor<'e>>(
        executor: E,
        input: CreditorInput,
    ) -> sqlx::Result<Creditor> {
        sqlx::query_as::<_, Creditor>(&format!(
            r#"--sql
            INSERT INTO creditors (name, street, street_number, city, postal_code, country, vat_number, iban, logo_base64)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING {}
            "#,
            Self::COLUMNS
        ))
        .bind(input.name)
        .bind(input.street)
        .bind(input.street_number)
        .bind(input.city)
        .bind(input.postal_code)
        .bind(input.country)
        .bind(input.vat_number)
        .bind(input.iban)
        .bind(input.logo_base64)
        .fetch_one(executor)
        .await
    }

    pub async fn update<'e, E: SqliteExecutor<'e>>(
        executor: E,
        creditor_id: i64,
        input: CreditorInput,
    ) -> sqlx::Result<Creditor> {
        sqlx::query_as::<_, Creditor>(&format!(
            r#"--sql
            UPDATE creditors
            SET name = $1, street = $2, street_number = $3, city = $4, postal_code = $5,
                country = $6, vat_number = $7, iban = $8, logo_base64 = $9
            WHERE id = $10
            RETURNING {}
            "#,
            Self::COLUMNS
        ))
        .bind(input.name)
        .bind(input.street)
        .bind(input.street_number)
        .bind(input.city)
        .bind(input.postal_code)
        .bind(input.country)
        .bind(input.vat_number)
        .bind(input.iban)
        .bind(input.logo_base64)
        .bind(creditor_id)
        .fetch_one(executor)
        .await
    }

    /// Refuses to delete a creditor any bill still points at: the bills would be
    /// left referencing a party that no longer exists, and their documents could
    /// no longer be generated.
    pub async fn delete(pool: &Pool<Sqlite>, creditor_id: i64) -> sqlx::Result<()> {
        let used_by: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM bills WHERE creditor_id = $1")
            .bind(creditor_id)
            .fetch_one(pool)
            .await?;

        if used_by > 0 {
            return Err(sqlx::Error::Protocol(format!(
                "This creditor is used by {} bill(s), so it cannot be deleted.",
                used_by
            )));
        }

        sqlx::query("DELETE FROM creditors WHERE id = $1")
            .bind(creditor_id)
            .execute(pool)
            .await?;

        Ok(())
    }
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

#[derive(Debug, Deserialize)]
pub struct DebitorInput {
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
}

impl Debitor {
    pub const COLUMNS: &'static str =
        "id, name, street, street_number, city, postal_code, country, created_at";

    pub async fn find_all<'e, E: SqliteExecutor<'e>>(executor: E) -> sqlx::Result<Vec<Debitor>> {
        sqlx::query_as::<_, Debitor>(&format!(
            "SELECT {} FROM debitors ORDER BY lower(name) ASC",
            Self::COLUMNS
        ))
        .fetch_all(executor)
        .await
    }

    pub async fn find_by_id<'e, E: SqliteExecutor<'e>>(
        executor: E,
        debitor_id: i64,
    ) -> sqlx::Result<Debitor> {
        sqlx::query_as::<_, Debitor>(&format!(
            "SELECT {} FROM debitors WHERE id = $1",
            Self::COLUMNS
        ))
        .bind(debitor_id)
        .fetch_one(executor)
        .await
    }

    pub async fn create<'e, E: SqliteExecutor<'e>>(
        executor: E,
        input: DebitorInput,
    ) -> sqlx::Result<Debitor> {
        sqlx::query_as::<_, Debitor>(&format!(
            r#"--sql
            INSERT INTO debitors (name, street, street_number, city, postal_code, country)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING {}
            "#,
            Self::COLUMNS
        ))
        .bind(input.name)
        .bind(input.street)
        .bind(input.street_number)
        .bind(input.city)
        .bind(input.postal_code)
        .bind(input.country)
        .fetch_one(executor)
        .await
    }

    pub async fn update<'e, E: SqliteExecutor<'e>>(
        executor: E,
        debitor_id: i64,
        input: DebitorInput,
    ) -> sqlx::Result<Debitor> {
        sqlx::query_as::<_, Debitor>(&format!(
            r#"--sql
            UPDATE debitors
            SET name = $1, street = $2, street_number = $3, city = $4, postal_code = $5, country = $6
            WHERE id = $7
            RETURNING {}
            "#,
            Self::COLUMNS
        ))
        .bind(input.name)
        .bind(input.street)
        .bind(input.street_number)
        .bind(input.city)
        .bind(input.postal_code)
        .bind(input.country)
        .bind(debitor_id)
        .fetch_one(executor)
        .await
    }

    /// Refuses to delete a debitor any bill still points at, for the same reason
    /// as [`Creditor::delete`].
    pub async fn delete(pool: &Pool<Sqlite>, debitor_id: i64) -> sqlx::Result<()> {
        let used_by: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM bills WHERE debitor_id = $1")
            .bind(debitor_id)
            .fetch_one(pool)
            .await?;

        if used_by > 0 {
            return Err(sqlx::Error::Protocol(format!(
                "This debitor is used by {} bill(s), so it cannot be deleted.",
                used_by
            )));
        }

        sqlx::query("DELETE FROM debitors WHERE id = $1")
            .bind(debitor_id)
            .execute(pool)
            .await?;

        Ok(())
    }
}

/// `total_price` is a generated column: it is only ever read, never written.
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

#[derive(Debug, Deserialize)]
pub struct BillItemInput {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
}

impl BillItem {
    pub const COLUMNS: &'static str =
        "id, bill_id, description, quantity, unit_price, total_price, created_at";

    pub async fn find_by_bill<'e, E: SqliteExecutor<'e>>(
        executor: E,
        bill_id: i64,
    ) -> sqlx::Result<Vec<BillItem>> {
        sqlx::query_as::<_, BillItem>(&format!(
            "SELECT {} FROM bill_items WHERE bill_id = $1 ORDER BY id ASC",
            Self::COLUMNS
        ))
        .bind(bill_id)
        .fetch_all(executor)
        .await
    }

    pub async fn create<'e, E: SqliteExecutor<'e>>(
        executor: E,
        bill_id: i64,
        input: BillItemInput,
    ) -> sqlx::Result<BillItem> {
        sqlx::query_as::<_, BillItem>(&format!(
            r#"--sql
            INSERT INTO bill_items (bill_id, description, quantity, unit_price)
            VALUES ($1, $2, $3, $4)
            RETURNING {}
            "#,
            Self::COLUMNS
        ))
        .bind(bill_id)
        .bind(input.description)
        .bind(input.quantity)
        .bind(input.unit_price)
        .fetch_one(executor)
        .await
    }

    pub async fn delete_by_bill<'e, E: SqliteExecutor<'e>>(
        executor: E,
        bill_id: i64,
    ) -> sqlx::Result<()> {
        sqlx::query("DELETE FROM bill_items WHERE bill_id = $1")
            .bind(bill_id)
            .execute(executor)
            .await?;

        Ok(())
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(try_from = "String", into = "String")]
pub enum BillStatus {
    #[default]
    Draft,
    Sent,
    Paid,
    Overdue,
    Cancelled,
}

impl BillStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            BillStatus::Draft => "draft",
            BillStatus::Sent => "sent",
            BillStatus::Paid => "paid",
            BillStatus::Overdue => "overdue",
            BillStatus::Cancelled => "cancelled",
        }
    }
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

impl From<BillStatus> for String {
    fn from(status: BillStatus) -> Self {
        status.as_str().to_string()
    }
}

/// Totals as the database computes them: they come from the `bill_totals` view and
/// there is no way to set them from Rust.
#[derive(Debug, Clone, Copy, FromRow, Serialize)]
pub struct BillTotals {
    pub net_total: f64,
    pub vat_total: f64,
    pub gross_total: f64,
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
    /// Derived by SQL, see [`BillTotals`].
    pub totals: BillTotals,
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
            replaced_by: row.try_get::<Option<i64>, _>("replaced_by")?,
            created_at: row.try_get("created_at")?,
            // Reading a bill always reads the totals the database derived for it.
            totals: BillTotals::from_row(row)?,
        })
    }
}

/// How a bill relates to the ones that superseded it, in both directions.
#[derive(Debug, Serialize)]
pub struct BillLinks {
    /// The bill this one was replaced by, if it was.
    pub replacement: Option<Bill>,
    /// The bills this one replaces.
    pub replaces: Vec<Bill>,
}

#[derive(Debug, Deserialize)]
pub struct BillInput {
    pub creditor_id: i64,
    pub debitor_id: i64,
    #[serde(default)]
    pub vat_percentage: f64,
    pub currency: String,
    pub due_date: String,
    #[serde(default)]
    pub status: BillStatus,
    #[serde(default)]
    pub items: Vec<BillItemInput>,
}

impl Bill {
    /// Every read of a bill goes through the `bill_totals` view, so the amounts a
    /// bill carries can only ever be the ones SQL derived.
    pub const SELECT: &'static str = r#"--sql
        SELECT
            b.id, b.user_facing_id, b.creditor_id, b.debitor_id, b.vat_percentage,
            b.currency, b.due_date, b.status, b.replaced_by, b.created_at,
            t.net_total, t.vat_total, t.gross_total
        FROM bills b
        JOIN bill_totals t ON t.bill_id = b.id
        "#;

    pub fn generate_user_facing_id(timestamp: Option<DateTime<Utc>>) -> String {
        let timestamp = timestamp.unwrap_or(Utc::now()).format("%Y-%m-%d"); // Format timestamp as YYYY-MM-DD

        let random_number: u32 = rand::random::<u32>() % 10000; // Random number between 0 and 9999
        format!("BILL-{}-{:04}", timestamp, random_number)
    }

    pub fn file_name(&self) -> String {
        format!("{}-{}.pdf", self.user_facing_id, self.id)
    }

    pub fn get_due_date_count(&self) -> Option<u32> {
        let due_date = parse_datetime(&self.due_date)?;
        let created_at = parse_datetime(&self.created_at)?;
        let duration = due_date - created_at;
        Some(duration.num_days().max(0) as u32)
    }

    pub async fn find_all<'e, E: SqliteExecutor<'e>>(executor: E) -> sqlx::Result<Vec<Bill>> {
        sqlx::query_as::<_, Bill>(&format!(
            "{} ORDER BY b.created_at DESC, b.id DESC",
            Self::SELECT
        ))
        .fetch_all(executor)
        .await
    }

    pub async fn find_pending<'e, E: SqliteExecutor<'e>>(executor: E) -> sqlx::Result<Vec<Bill>> {
        sqlx::query_as::<_, Bill>(&format!(
            "{} WHERE b.status IN ('draft', 'sent', 'overdue')
             ORDER BY b.created_at DESC, b.id DESC",
            Self::SELECT
        ))
        .fetch_all(executor)
        .await
    }

    pub async fn find_by_id<'e, E: SqliteExecutor<'e>>(
        executor: E,
        bill_id: i64,
    ) -> sqlx::Result<Bill> {
        sqlx::query_as::<_, Bill>(&format!("{} WHERE b.id = $1", Self::SELECT))
            .bind(bill_id)
            .fetch_one(executor)
            .await
    }

    /// Creates a bill and its items in one transaction, then reads the bill back so
    /// the returned totals are the ones the database computed.
    pub async fn create(pool: &Pool<Sqlite>, input: BillInput) -> sqlx::Result<Bill> {
        let created_at = Utc::now();
        let user_facing_id = Bill::generate_user_facing_id(Some(created_at));
        let due_date = normalize_datetime(&input.due_date)
            .ok_or_else(|| sqlx::Error::Protocol(format!("Invalid due date: {}", input.due_date)))?;

        let mut tx = pool.begin().await?;

        let bill_id: i64 = sqlx::query_scalar(
            r#"--sql
            INSERT INTO bills (user_facing_id, creditor_id, debitor_id, vat_percentage, currency, due_date, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            "#,
        )
        .bind(&user_facing_id)
        .bind(input.creditor_id)
        .bind(input.debitor_id)
        .bind(input.vat_percentage)
        .bind(&input.currency)
        .bind(&due_date)
        .bind(input.status.as_str())
        .bind(created_at.format(SQLITE_DATETIME).to_string())
        .fetch_one(&mut *tx)
        .await?;

        for item in input.items {
            BillItem::create(&mut *tx, bill_id, item).await?;
        }

        tx.commit().await?;

        Bill::find_by_id(pool, bill_id).await
    }

    /// Updates a bill and replaces its items in one transaction.
    pub async fn update(pool: &Pool<Sqlite>, bill_id: i64, input: BillInput) -> sqlx::Result<Bill> {
        let due_date = normalize_datetime(&input.due_date)
            .ok_or_else(|| sqlx::Error::Protocol(format!("Invalid due date: {}", input.due_date)))?;

        let mut tx = pool.begin().await?;

        sqlx::query(
            r#"--sql
            UPDATE bills
            SET creditor_id = $1, debitor_id = $2, vat_percentage = $3, currency = $4,
                due_date = $5, status = $6
            WHERE id = $7
            "#,
        )
        .bind(input.creditor_id)
        .bind(input.debitor_id)
        .bind(input.vat_percentage)
        .bind(&input.currency)
        .bind(&due_date)
        .bind(input.status.as_str())
        .bind(bill_id)
        .execute(&mut *tx)
        .await?;

        BillItem::delete_by_bill(&mut *tx, bill_id).await?;

        for item in input.items {
            BillItem::create(&mut *tx, bill_id, item).await?;
        }

        tx.commit().await?;

        Bill::find_by_id(pool, bill_id).await
    }

    /// Copies a bill onto today: same parties, VAT, currency and items, with the
    /// due date pushed out by the same number of days the original allowed.
    ///
    /// The copy always starts as a draft, and carries none of the original's
    /// identity: it gets its own `user_facing_id` and its totals are derived
    /// from the copied items like any other bill.
    pub async fn duplicate(pool: &Pool<Sqlite>, bill_id: i64) -> sqlx::Result<Bill> {
        let source = Bill::find_by_id(pool, bill_id).await?;
        let items = BillItem::find_by_bill(pool, bill_id).await?;

        // Anything written by the app parses; 30 days covers older rows.
        let payment_days = i64::from(source.get_due_date_count().unwrap_or(30));
        let due_date = (Utc::now() + TimeDelta::try_days(payment_days).unwrap_or_default())
            .format(SQLITE_DATETIME)
            .to_string();

        Bill::create(
            pool,
            BillInput {
                creditor_id: source.creditor_id,
                debitor_id: source.debitor_id,
                vat_percentage: source.vat_percentage,
                currency: source.currency,
                due_date,
                status: BillStatus::Draft,
                items: items
                    .into_iter()
                    .map(|item| BillItemInput {
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                    })
                    .collect(),
            },
        )
        .await
    }

    /// Supersedes a bill: takes a copy the same way [`Bill::duplicate`] does,
    /// then points the original at it and cancels the original, since a replaced
    /// bill is no longer owed. Returns the replacement.
    pub async fn replace(pool: &Pool<Sqlite>, bill_id: i64) -> sqlx::Result<Bill> {
        let source = Bill::find_by_id(pool, bill_id).await?;

        if let Some(replacement_id) = source.replaced_by {
            return Err(sqlx::Error::Protocol(format!(
                "Bill {} was already replaced by bill {}",
                source.user_facing_id, replacement_id
            )));
        }

        let replacement = Bill::duplicate(pool, bill_id).await?;

        sqlx::query("UPDATE bills SET replaced_by = $1, status = $2 WHERE id = $3")
            .bind(replacement.id)
            .bind(BillStatus::Cancelled.as_str())
            .bind(bill_id)
            .execute(pool)
            .await?;

        Ok(replacement)
    }

    /// The replacement chain around a bill, in both directions.
    pub async fn links(pool: &Pool<Sqlite>, bill_id: i64) -> sqlx::Result<BillLinks> {
        let bill = Bill::find_by_id(pool, bill_id).await?;

        let replacement = match bill.replaced_by {
            Some(replacement_id) => Some(Bill::find_by_id(pool, replacement_id).await?),
            None => None,
        };

        let replaces = sqlx::query_as::<_, Bill>(&format!(
            "{} WHERE b.replaced_by = $1 ORDER BY b.created_at ASC, b.id ASC",
            Self::SELECT
        ))
        .bind(bill_id)
        .fetch_all(pool)
        .await?;

        Ok(BillLinks {
            replacement,
            replaces,
        })
    }

    pub async fn set_status<'e, E: SqliteExecutor<'e>>(
        executor: E,
        bill_id: i64,
        status: BillStatus,
    ) -> sqlx::Result<()> {
        sqlx::query("UPDATE bills SET status = $1 WHERE id = $2")
            .bind(status.as_str())
            .bind(bill_id)
            .execute(executor)
            .await?;

        Ok(())
    }

    /// Deletes a bill and its items. Refuses when other bills name this one as
    /// their replacement, which would leave their `replaced_by` dangling.
    pub async fn delete(pool: &Pool<Sqlite>, bill_id: i64) -> sqlx::Result<()> {
        let replaces: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM bills WHERE replaced_by = $1")
            .bind(bill_id)
            .fetch_one(pool)
            .await?;

        if replaces > 0 {
            return Err(sqlx::Error::Protocol(format!(
                "This bill is the replacement for {} other bill(s), so it cannot be deleted.",
                replaces
            )));
        }

        let mut tx = pool.begin().await?;

        BillItem::delete_by_bill(&mut *tx, bill_id).await?;

        sqlx::query("DELETE FROM bills WHERE id = $1")
            .bind(bill_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    /// A single-connection in-memory database with the migrations applied.
    async fn test_pool() -> Pool<Sqlite> {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("failed to open the in-memory database");

        sqlx::migrate!().run(&pool).await.expect("migrations failed");

        pool
    }

    async fn seed_parties(pool: &Pool<Sqlite>) -> (i64, i64) {
        let creditor = Creditor::create(
            pool,
            CreditorInput {
                name: "Creditor".into(),
                street: "Main Street".into(),
                street_number: "1".into(),
                city: "Zurich".into(),
                postal_code: "8000".into(),
                country: "CH".into(),
                vat_number: None,
                iban: "CH4789144274621429278".into(),
                logo_base64: None,
            },
        )
        .await
        .expect("failed to create the creditor");

        let debitor = Debitor::create(
            pool,
            DebitorInput {
                name: "Debitor".into(),
                street: "Second Street".into(),
                street_number: "2".into(),
                city: "Bern".into(),
                postal_code: "3000".into(),
                country: "CH".into(),
            },
        )
        .await
        .expect("failed to create the debitor");

        (creditor.id, debitor.id)
    }

    fn bill_input(creditor_id: i64, debitor_id: i64, vat_percentage: f64) -> BillInput {
        BillInput {
            creditor_id,
            debitor_id,
            vat_percentage,
            currency: "CHF".into(),
            due_date: "2026-09-30".into(),
            status: BillStatus::Draft,
            items: vec![
                BillItemInput {
                    description: "Two at fifty".into(),
                    quantity: 2.0,
                    unit_price: 50.0,
                },
                BillItemInput {
                    description: "One and a half at 33.33".into(),
                    quantity: 1.5,
                    unit_price: 33.33,
                },
            ],
        }
    }

    #[test]
    fn totals_are_derived_by_the_database() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let bill = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");

            // 100.00 + round(1.5 * 33.33) = 149.99
            assert_eq!(bill.totals.net_total, 149.99);
            assert_eq!(bill.totals.vat_total, 12.15);
            assert_eq!(bill.totals.gross_total, 162.14);

            let items = BillItem::find_by_bill(&pool, bill.id)
                .await
                .expect("failed to read the items");

            assert_eq!(items.len(), 2);
            assert_eq!(items[0].total_price, 100.0);
            assert_eq!(items[1].total_price, 49.99);
            assert_eq!(bill.due_date, "2026-09-30 00:00:00");
        });
    }

    #[test]
    fn totals_follow_the_items_and_the_vat_rate() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let bill = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");

            let mut input = bill_input(creditor_id, debitor_id, 0.0);
            input.items.truncate(1);

            let updated = Bill::update(&pool, bill.id, input)
                .await
                .expect("failed to update the bill");

            assert_eq!(updated.totals.net_total, 100.0);
            assert_eq!(updated.totals.vat_total, 0.0);
            assert_eq!(updated.totals.gross_total, 100.0);

            // A bill without items still reads back, with zeroed totals.
            BillItem::delete_by_bill(&pool, bill.id)
                .await
                .expect("failed to delete the items");

            let emptied = Bill::find_by_id(&pool, bill.id)
                .await
                .expect("failed to read the bill");

            assert_eq!(emptied.totals.net_total, 0.0);
            assert_eq!(emptied.totals.gross_total, 0.0);
        });
    }

    #[test]
    fn dates_are_printed_without_their_timestamp() {
        assert_eq!(format_date("2026-09-30 00:00:00"), "2026-09-30");
        assert_eq!(format_date("2026-09-30 14:35:12"), "2026-09-30");
        assert_eq!(format_date("2026-09-30"), "2026-09-30");
        // Nothing recognisable is left alone rather than mangled.
        assert_eq!(format_date("later"), "later");
    }

    #[test]
    fn deleting_a_bill_takes_its_items_with_it() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let bill = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");

            Bill::delete(&pool, bill.id)
                .await
                .expect("failed to delete the bill");

            assert!(Bill::find_by_id(&pool, bill.id).await.is_err());
            assert!(BillItem::find_by_bill(&pool, bill.id)
                .await
                .expect("failed to read the items")
                .is_empty());
        });
    }

    #[test]
    fn a_replacement_cannot_be_deleted_out_from_under_the_bill_it_replaces() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let original = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");
            let replacement = Bill::replace(&pool, original.id)
                .await
                .expect("failed to replace the bill");

            // Deleting the replacement would leave `original.replaced_by` dangling.
            assert!(Bill::delete(&pool, replacement.id).await.is_err());
            assert!(Bill::find_by_id(&pool, replacement.id).await.is_ok());

            // The original itself is nobody's replacement, so it can go.
            Bill::delete(&pool, original.id)
                .await
                .expect("the original should be deletable");
        });
    }

    #[test]
    fn parties_in_use_by_a_bill_cannot_be_deleted() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let bill = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");

            assert!(Creditor::delete(&pool, creditor_id).await.is_err());
            assert!(Debitor::delete(&pool, debitor_id).await.is_err());

            // Both are still there, and the bill still resolves them.
            assert!(Creditor::find_by_id(&pool, creditor_id).await.is_ok());
            assert!(Debitor::find_by_id(&pool, debitor_id).await.is_ok());

            // Once the bill is gone, so can they be.
            Bill::delete(&pool, bill.id)
                .await
                .expect("failed to delete the bill");
            Creditor::delete(&pool, creditor_id)
                .await
                .expect("the unused creditor should be deletable");
            Debitor::delete(&pool, debitor_id)
                .await
                .expect("the unused debitor should be deletable");
        });
    }

    #[test]
    fn pending_bills_come_back_newest_first() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let mut created = Vec::new();
            for _ in 0..3 {
                created.push(
                    Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                        .await
                        .expect("failed to create the bill")
                        .id,
                );
            }

            // Paid and cancelled bills are not pending at all.
            let settled = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");
            Bill::set_status(&pool, settled.id, BillStatus::Paid)
                .await
                .expect("failed to set the status");

            let pending: Vec<i64> = Bill::find_pending(&pool)
                .await
                .expect("failed to read the pending bills")
                .into_iter()
                .map(|bill| bill.id)
                .collect();

            created.reverse();

            assert_eq!(pending, created);
            assert!(!pending.contains(&settled.id));
        });
    }

    #[test]
    fn duplicating_keeps_the_terms_and_moves_the_dates() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let source = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");
            Bill::set_status(&pool, source.id, BillStatus::Paid)
                .await
                .expect("failed to set the status");

            let copy = Bill::duplicate(&pool, source.id)
                .await
                .expect("failed to duplicate the bill");

            // A new bill in its own right.
            assert_ne!(copy.id, source.id);
            assert_ne!(copy.user_facing_id, source.user_facing_id);
            assert_eq!(copy.status, BillStatus::Draft);
            assert_eq!(copy.replaced_by, None);

            // Same terms.
            assert_eq!(copy.creditor_id, source.creditor_id);
            assert_eq!(copy.debitor_id, source.debitor_id);
            assert_eq!(copy.vat_percentage, source.vat_percentage);
            assert_eq!(copy.currency, source.currency);

            // Same payment window, counted from the copy's own creation date.
            assert_eq!(copy.get_due_date_count(), source.get_due_date_count());
            assert_ne!(copy.due_date, source.due_date);

            // Same items, so the database derives the same totals.
            let source_items = BillItem::find_by_bill(&pool, source.id).await.unwrap();
            let copied_items = BillItem::find_by_bill(&pool, copy.id).await.unwrap();

            assert_eq!(copied_items.len(), source_items.len());
            assert_eq!(
                copied_items
                    .iter()
                    .map(|item| (item.description.clone(), item.quantity, item.unit_price))
                    .collect::<Vec<_>>(),
                source_items
                    .iter()
                    .map(|item| (item.description.clone(), item.quantity, item.unit_price))
                    .collect::<Vec<_>>(),
            );
            assert_eq!(copy.totals.net_total, source.totals.net_total);
            assert_eq!(copy.totals.gross_total, source.totals.gross_total);
        });
    }

    #[test]
    fn duplicating_leaves_both_bills_independent() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let source = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");
            let copy = Bill::duplicate(&pool, source.id)
                .await
                .expect("failed to duplicate the bill");

            // Neither bill knows about the other.
            let source = Bill::find_by_id(&pool, source.id).await.unwrap();

            assert_eq!(source.replaced_by, None);
            assert_eq!(copy.replaced_by, None);
            assert_eq!(source.status, BillStatus::Draft);

            let links = Bill::links(&pool, source.id).await.unwrap();

            assert!(links.replacement.is_none());
            assert!(links.replaces.is_empty());
        });
    }

    #[test]
    fn replacing_links_the_original_to_its_replacement() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let original = Bill::create(&pool, bill_input(creditor_id, debitor_id, 8.1))
                .await
                .expect("failed to create the bill");
            Bill::set_status(&pool, original.id, BillStatus::Sent)
                .await
                .expect("failed to set the status");

            let replacement = Bill::replace(&pool, original.id)
                .await
                .expect("failed to replace the bill");

            let original = Bill::find_by_id(&pool, original.id).await.unwrap();

            // The original points at its replacement and is no longer owed.
            assert_eq!(original.replaced_by, Some(replacement.id));
            assert_eq!(original.status, BillStatus::Cancelled);

            // The replacement is a fresh draft carrying the same terms.
            assert_eq!(replacement.replaced_by, None);
            assert_eq!(replacement.status, BillStatus::Draft);
            assert_eq!(replacement.vat_percentage, original.vat_percentage);
            assert_eq!(
                replacement.get_due_date_count(),
                Some(original.get_due_date_count().unwrap()),
            );

            // Both directions resolve.
            let from_original = Bill::links(&pool, original.id).await.unwrap();

            assert_eq!(
                from_original.replacement.map(|bill| bill.id),
                Some(replacement.id)
            );
            assert!(from_original.replaces.is_empty());

            let from_replacement = Bill::links(&pool, replacement.id).await.unwrap();

            assert!(from_replacement.replacement.is_none());
            assert_eq!(
                from_replacement
                    .replaces
                    .iter()
                    .map(|bill| bill.id)
                    .collect::<Vec<_>>(),
                vec![original.id]
            );

            // A bill is only replaced once.
            let second = Bill::replace(&pool, original.id).await;

            assert!(second.is_err(), "replacing twice should be refused");
        });
    }

    #[test]
    fn due_date_count_is_the_gap_between_creation_and_due_date() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let (creditor_id, debitor_id) = seed_parties(&pool).await;

            let mut input = bill_input(creditor_id, debitor_id, 8.1);
            input.due_date = "2026-09-30T12:00".into();

            let bill = Bill::create(&pool, input)
                .await
                .expect("failed to create the bill");

            assert_eq!(bill.due_date, "2026-09-30 12:00:00");
            assert!(bill.get_due_date_count().is_some());
        });
    }
}
