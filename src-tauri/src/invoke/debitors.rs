use crate::db::{
    models::{Debitor, DebitorInput},
    DatabaseState,
};

#[tauri::command]
pub async fn get_all_debitors(
    state: tauri::State<'_, DatabaseState>,
) -> Result<Vec<Debitor>, String> {
    Debitor::find_all(state.inner().inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_debitor_by_id(
    state: tauri::State<'_, DatabaseState>,
    debitor_id: i64,
) -> Result<Debitor, String> {
    Debitor::find_by_id(state.inner().inner(), debitor_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_debitor(
    state: tauri::State<'_, DatabaseState>,
    input: DebitorInput,
) -> Result<Debitor, String> {
    Debitor::create(state.inner().inner(), input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_debitor(
    state: tauri::State<'_, DatabaseState>,
    debitor_id: i64,
    input: DebitorInput,
) -> Result<Debitor, String> {
    Debitor::update(state.inner().inner(), debitor_id, input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_debitor(
    state: tauri::State<'_, DatabaseState>,
    debitor_id: i64,
) -> Result<(), String> {
    Debitor::delete(state.inner().inner(), debitor_id)
        .await
        .map_err(|e| e.to_string())
}
