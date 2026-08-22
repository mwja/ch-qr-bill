use crate::db::{
    models::{Creditor, CreditorInput},
    DatabaseState,
};

#[tauri::command]
pub async fn get_all_creditors(
    state: tauri::State<'_, DatabaseState>,
) -> Result<Vec<Creditor>, String> {
    Creditor::find_all(state.inner().inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_creditor_by_id(
    state: tauri::State<'_, DatabaseState>,
    creditor_id: i64,
) -> Result<Creditor, String> {
    Creditor::find_by_id(state.inner().inner(), creditor_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_creditor(
    state: tauri::State<'_, DatabaseState>,
    input: CreditorInput,
) -> Result<Creditor, String> {
    Creditor::create(state.inner().inner(), input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_creditor(
    state: tauri::State<'_, DatabaseState>,
    creditor_id: i64,
    input: CreditorInput,
) -> Result<Creditor, String> {
    Creditor::update(state.inner().inner(), creditor_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_creditor(
    state: tauri::State<'_, DatabaseState>,
    creditor_id: i64,
) -> Result<(), String> {
    Creditor::delete(state.inner().inner(), creditor_id)
        .await
        .map_err(|e| e.to_string())
}
