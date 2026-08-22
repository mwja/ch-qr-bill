use ironpress::{HtmlConverter, Margin, PageSize};
use swiss_qrust::{Address, BillData, Language};

use crate::db::models::{self, Bill};

// include payment_item.html and payment_page.html
const PAYMENT_ITEM_HTML: &str = include_str!("template/payment_item.html");
const PAYMENT_PAGE_HTML: &str = include_str!("template/payment_page.html");

pub struct Creditor {
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
    pub vat_number: Option<String>,
    pub iban: String,
}

impl From<models::Creditor> for Creditor {
    fn from(creditor: models::Creditor) -> Self {
        Creditor {
            name: creditor.name,
            street: creditor.street,
            street_number: creditor.street_number,
            city: creditor.city,
            postal_code: creditor.postal_code,
            country: creditor.country,
            vat_number: creditor.vat_number,
            iban: creditor.iban,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Debitor {
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
}

impl From<models::Debitor> for Debitor {
    fn from(debitor: models::Debitor) -> Self {
        Debitor {
            name: debitor.name,
            street: debitor.street,
            street_number: debitor.street_number,
            city: debitor.city,
            postal_code: debitor.postal_code,
            country: debitor.country,
        }
    }
}

pub struct BillItem {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
}

impl From<models::BillItem> for BillItem {
    fn from(item: models::BillItem) -> Self {
        BillItem {
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
        }
    }
}

pub struct BillBuilder {
    creditor: Option<Creditor>,
    debitor: Option<Debitor>,
    logo_base64: Option<String>,
    items: Vec<BillItem>,
    vat_percentage: f64,
    gross_total: f64,
    net_total: f64,
    vat_total: f64,
    bill_no: Option<String>,
    bill_date: Option<String>,
    bill_due_date: Option<String>,
    bill_due_date_count: Option<u32>,
}

impl BillBuilder {
    pub fn new() -> Self {
        BillBuilder {
            creditor: None,
            debitor: None,
            logo_base64: None,
            items: Vec::new(),
            vat_percentage: 0.0,
            gross_total: 0.0,
            net_total: 0.0,
            vat_total: 0.0,
            bill_no: None,
            bill_date: None,
            bill_due_date: None,
            bill_due_date_count: None,
        }
    }

    pub fn creditor(mut self, creditor: Creditor) -> Self {
        self.creditor = Some(creditor);
        self
    }

    pub fn debitor(mut self, debitor: Debitor) -> Self {
        self.debitor = Some(debitor);
        self
    }

    pub fn logo_base64(mut self, logo_base64: String) -> Self {
        self.logo_base64 = Some(logo_base64);
        self
    }

    pub fn add_item(mut self, item: BillItem) -> Self {
        self.items.push(item);
        self
    }

    pub fn vat_percentage(mut self, vat_percentage: f64) -> Self {
        self.vat_percentage = vat_percentage;
        self
    }

    pub fn gross_total(mut self, gross_total: f64) -> Self {
        self.gross_total = gross_total;
        self
    }

    pub fn net_total(mut self, net_total: f64) -> Self {
        self.net_total = net_total;
        self
    }

    pub fn vat_total(mut self, vat_total: f64) -> Self {
        self.vat_total = vat_total;
        self
    }

    pub fn bill_no(mut self, bill_no: String) -> Self {
        self.bill_no = Some(bill_no);
        self
    }

    pub fn bill_date(mut self, bill_date: String) -> Self {
        self.bill_date = Some(bill_date);
        self
    }

    pub fn bill_due_date(mut self, bill_due_date: String) -> Self {
        self.bill_due_date = Some(bill_due_date);
        self
    }

    pub fn bill_due_date_count(mut self, bill_due_date_count: u32) -> Self {
        self.bill_due_date_count = Some(bill_due_date_count);
        self
    }

    pub fn build(self) -> anyhow::Result<Vec<u8>> {
        let creditor = self.creditor.expect("Creditor must be set");
        let svg = swiss_qrust::svg::render_bill_to_svg(
            &BillData::new(
                creditor.iban,
                Address::new(
                    &creditor.name,
                    Some(&creditor.street),
                    Some(&creditor.street_number),
                    &creditor.postal_code,
                    &creditor.city,
                    &creditor.country,
                )?,
                self.debitor.clone().map(|debitor| {
                    Address::new(
                        &debitor.name,
                        Some(&debitor.street),
                        Some(&debitor.street_number),
                        &debitor.postal_code,
                        &debitor.city,
                        &debitor.country,
                    )
                    .expect("Failed to make debitor address")
                }),
                swiss_qrust::Currency::CHF,
                Some((f64::trunc(self.gross_total * 100.0) / 100.0).to_string()),
                swiss_qrust::ReferenceType::NoRef,
                None,
                None,
                [None, None],
            )?,
            Language::Fr,
        )?;
        let mut tera = tera::Tera::new();
        tera.add_raw_template("item", PAYMENT_ITEM_HTML).unwrap();
        tera.add_raw_template("page", PAYMENT_PAGE_HTML).unwrap();
        let items_html = self
            .items
            .iter()
            .map(|item| {
                let mut context = tera::Context::new();
                context.insert("description", &item.description);
                context.insert("quantity", &item.quantity);
                context.insert("unit_price", &item.unit_price);
                context.insert("total_price", &item.total_price);
                tera.render("item", &context).unwrap()
            })
            .collect::<Vec<String>>()
            .join("");

        let page_html = {
            let mut context = tera::Context::new();
            context.insert("logo_base64", &self.logo_base64.unwrap_or_default());
            context.insert("creditor_name", &creditor.name);
            context.insert("creditor_street", &creditor.street);
            context.insert("creditor_street_number", &creditor.street_number);
            context.insert("creditor_city", &creditor.city);
            context.insert("creditor_postal_code", &creditor.postal_code);
            context.insert(
                "vat_number",
                &creditor.vat_number.clone().unwrap_or_default(),
            );
            context.insert(
                "debitor_name",
                &self
                    .debitor
                    .as_ref()
                    .map(|d| d.name.clone())
                    .unwrap_or_default(),
            );
            context.insert(
                "debitor_street",
                &self
                    .debitor
                    .as_ref()
                    .map(|d| d.street.clone())
                    .unwrap_or_default(),
            );
            context.insert(
                "debitor_street_number",
                &self
                    .debitor
                    .as_ref()
                    .map(|d| d.street_number.clone())
                    .unwrap_or_default(),
            );
            context.insert(
                "debitor_city",
                &self
                    .debitor
                    .as_ref()
                    .map(|d| d.city.clone())
                    .unwrap_or_default(),
            );
            context.insert(
                "debitor_postal_code",
                &self
                    .debitor
                    .as_ref()
                    .map(|d| d.postal_code.clone())
                    .unwrap_or_default(),
            );
            context.insert("items_html", &items_html);
            context.insert("gross_total", &self.gross_total);
            context.insert("net_total", &self.net_total);
            context.insert("vat_total", &self.vat_total);
            context.insert("bill_no", &self.bill_no.unwrap_or_default());
            context.insert("bill_date", &self.bill_date.unwrap_or_default());
            context.insert("bill_due_date", &self.bill_due_date.unwrap_or_default());
            context.insert(
                "bill_due_date_count",
                &self.bill_due_date_count.unwrap_or_default(),
            );

            context.insert("qr_bill_svg", &svg);

            tera.render("page", &context).unwrap()
        };

        std::fs::write("bill.html", &page_html)?;

        let pdf = HtmlConverter::new()
            .page_size(PageSize::A4)
            .margin(Margin::uniform(0.))
            .convert(&page_html)?;

        Ok(pdf)
    }
}
