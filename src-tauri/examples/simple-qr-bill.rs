use swiss_qr_desktop_lib::bill::*;

pub fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pdf = BillBuilder::new()
        .bill_no("123456".to_owned())
        .creditor(Creditor {
            name: "John Doe".to_string(),
            street: "Main Street".to_string(),
            street_number: "1".to_string(),
            postal_code: "8000".to_string(),
            city: "Zurich".to_string(),
            country: "CH".to_string(),
            iban: "CH4789144274621429278".to_string(),
            vat_number: Some("CHE-123.456.789 MWST".to_string()),
        })
        .debitor(Debitor {
            name: "Jane Smith".to_string(),
            street: "Second Street".to_string(),
            street_number: "2".to_string(),
            postal_code: "3000".to_string(),
            city: "Bern".to_string(),
            country: "CH".to_string(),
        })
        .add_item(BillItem {
            description: "Item 1".to_string(),
            quantity: 2.0,
            unit_price: 50.0,
            total_price: 100.0,
        })
        .add_item(BillItem {
            description: "Super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper super duper".to_string(),
            quantity: 2.0,
            unit_price: 50.0,
            total_price: 100.0,
        })
        .add_item(BillItem {
            description: "Item 2".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .add_item(BillItem {
            description: "Another".to_string(),
            quantity: 1.0,
            unit_price: 75.0,
            total_price: 75.0,
        })
        .vat_percentage(8.1)
        .net_total(175.)
        .vat_total(14.175)
        .gross_total(189.175)
        .build()?;
    // Write to file
    std::fs::write("bill.pdf", pdf)?;

    Ok(())
}
