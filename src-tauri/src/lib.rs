use tauri::Manager;

pub mod bill;
pub mod db;
pub mod invoke;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            let database = tauri::async_runtime::block_on(async move {
                db::Database::new(&handle)
                    .await
                    .expect("failed to initialize database")
            });

            app.manage(db::DatabaseState(database.pool));

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            invoke::creditors::get_all_creditors,
            invoke::creditors::create_creditor,
            invoke::creditors::delete_creditor,
            invoke::debitors::get_all_debitors,
            invoke::debitors::create_debitor,
            invoke::debitors::delete_debitor,
            invoke::bills::get_all_bills,
            invoke::bills::get_pending_bills,
            invoke::bills::get_bill_by_id,
            invoke::bills::create_bill,
            invoke::bills::generate_bill_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
