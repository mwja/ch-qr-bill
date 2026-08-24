use tauri::{AppHandle, Manager};

use crate::{
    bill::BillBuilder,
    db::{
        models::{
            format_date, Bill, BillInput, BillItem, BillLinks, BillStatus, Creditor, Debitor,
        },
        DatabaseState,
    },
};

#[tauri::command]
pub async fn get_all_bills(state: tauri::State<'_, DatabaseState>) -> Result<Vec<Bill>, String> {
    Bill::find_all(state.inner().inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pending_bills(
    state: tauri::State<'_, DatabaseState>,
) -> Result<Vec<Bill>, String> {
    Bill::find_pending(state.inner().inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_bill_by_id(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<Bill, String> {
    Bill::find_by_id(state.inner().inner(), bill_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_bill_items(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<Vec<BillItem>, String> {
    BillItem::find_by_bill(state.inner().inner(), bill_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_bill(
    state: tauri::State<'_, DatabaseState>,
    input: BillInput,
) -> Result<Bill, String> {
    Bill::create(state.inner().inner(), input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_bill(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
    input: BillInput,
) -> Result<Bill, String> {
    Bill::update(state.inner().inner(), bill_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn duplicate_bill(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<Bill, String> {
    Bill::duplicate(state.inner().inner(), bill_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn replace_bill(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<Bill, String> {
    Bill::replace(state.inner().inner(), bill_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_bill_links(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<BillLinks, String> {
    Bill::links(state.inner().inner(), bill_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_bill_status(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
    status: BillStatus,
) -> Result<Bill, String> {
    let pool = state.inner().inner();

    Bill::set_status(pool, bill_id, status)
        .await
        .map_err(|e| e.to_string())?;

    Bill::find_by_id(pool, bill_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_bill(
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<(), String> {
    Bill::delete(state.inner().inner(), bill_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_bill_document(
    app_handle: AppHandle,
    state: tauri::State<'_, DatabaseState>,
    bill_id: i64,
) -> Result<String, String> {
    let pool = state.inner().inner();

    let bill = Bill::find_by_id(pool, bill_id)
        .await
        .map_err(|e| e.to_string())?;

    let bill_items = BillItem::find_by_bill(pool, bill_id)
        .await
        .map_err(|e| e.to_string())?;

    let debitor = Debitor::find_by_id(pool, bill.debitor_id)
        .await
        .map_err(|e| e.to_string())?;

    let creditor = Creditor::find_by_id(pool, bill.creditor_id)
        .await
        .map_err(|e| e.to_string())?;

    let base_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let bills_dir = base_dir.join("bills");
    std::fs::create_dir_all(&bills_dir).map_err(|e| e.to_string())?;

    let file_dir = bills_dir.join(bill.file_name());

    let mut builder = BillBuilder::new()
        .bill_no(bill.user_facing_id.clone())
        // Printed on the document: dates, not timestamps.
        .bill_date(format_date(&bill.created_at))
        .bill_due_date(format_date(&bill.due_date))
        .bill_due_date_count(bill.get_due_date_count().unwrap_or(0))
        .currency(&bill.currency)
        .debitor(debitor.into())
        .creditor(creditor.into())
        .vat_percentage(bill.vat_percentage)
        .comment(bill.comment.clone())
        // The amounts printed on the document are the ones SQL derived.
        .totals(bill.totals);

    for item in bill_items {
        builder = builder.add_item(item.into());
    }

    std::fs::write(&file_dir, builder.build().map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;

    Ok(file_dir.to_string_lossy().into_owned())
}
