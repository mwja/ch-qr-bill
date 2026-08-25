use ironpress::{HtmlConverter, Margin, PageSize};
use swiss_qrust::{Address, BillData, Currency, Language};

use crate::db::models::{self, BillTotals};

// include payment_item.html and payment_page.html
const PAYMENT_ITEM_HTML: &str = include_str!("template/payment_item.html");
const PAYMENT_PAGE_HTML: &str = include_str!("template/payment_page.html");
const ITEMS_TABLE_HTML: &str = include_str!("template/items_table.html");

/// Ironpress may move a whole `page-break-inside: auto` table to the next page
/// if it fits on a blank page, leaving page 1 mostly empty. Split the rows into
/// two tables: keep the first within page 1's remaining space, then force the
/// second onto page 2. Ironpress handles normal table splitting correctly; this
/// only avoids the case where it makes the wrong initial page-break decision.
/// 
/// Row counts below are conservative estimates; logos reduce the available space.
fn max_items_before_forced_break(has_logo: bool) -> usize {
    if has_logo { 8 } else { 12 }
}

pub struct Creditor {
    pub name: String,
    pub street: String,
    pub street_number: String,
    pub city: String,
    pub postal_code: String,
    pub country: String,
    pub vat_number: Option<String>,
    pub iban: String,
    pub logo_base64: Option<String>,
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
            logo_base64: creditor.logo_base64,
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
    currency: Currency,
    gross_total: f64,
    net_total: f64,
    vat_total: f64,
    bill_no: Option<String>,
    bill_date: Option<String>,
    bill_due_date: Option<String>,
    bill_due_date_count: Option<u32>,
    comment: Option<String>,
}

impl BillBuilder {
    pub fn new() -> Self {
        BillBuilder {
            creditor: None,
            debitor: None,
            logo_base64: None,
            items: Vec::new(),
            vat_percentage: 0.0,
            currency: Currency::CHF,
            gross_total: 0.0,
            net_total: 0.0,
            vat_total: 0.0,
            bill_no: None,
            bill_date: None,
            bill_due_date: None,
            bill_due_date_count: None,
            comment: None,
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

    pub fn currency(mut self, currency: &str) -> Self {
        self.currency = match currency.trim().to_uppercase().as_str() {
            "EUR" => Currency::EUR,
            _ => Currency::CHF,
        };
        self
    }

    /// Takes the amounts straight from the database-derived totals.
    pub fn totals(mut self, totals: BillTotals) -> Self {
        self.net_total = totals.net_total;
        self.vat_total = totals.vat_total;
        self.gross_total = totals.gross_total;
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

    pub fn comment(mut self, comment: Option<String>) -> Self {
        self.comment = comment;
        self
    }

    /// Renders the bill document as HTML. Split out from [`BillBuilder::build`]
    /// so the template's own output can be inspected without a PDF round trip.
    pub fn build_html(self) -> anyhow::Result<String> {
        let creditor = self.creditor.expect("Creditor must be set");
        // An explicitly set logo wins, otherwise the creditor's own one is used.
        let logo_base64 = self
            .logo_base64
            .clone()
            .or_else(|| creditor.logo_base64.clone());
        let currency = self.currency.to_string();
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
                self.currency,
                // The QR spec wants exactly two decimals: `108.1` or `100` are rejected.
                Some(format!("{:.2}", self.gross_total)),
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
        tera.add_raw_template("items_table", ITEMS_TABLE_HTML)
            .unwrap();
        let item_rows: Vec<String> = self
            .items
            .iter()
            .map(|item| {
                let mut context = tera::Context::new();
                context.insert("description", &item.description);
                context.insert("quantity", &item.quantity);
                // Money always prints with two decimals.
                context.insert("unit_price", &format!("{:.2}", item.unit_price));
                context.insert("total_price", &format!("{:.2}", item.total_price));
                tera.render("item", &context).unwrap()
            })
            .collect();

        let render_items_table = |rows_html: &str, page_break_before: bool| -> String {
            let mut context = tera::Context::new();
            context.insert("currency", &currency);
            context.insert("rows_html", rows_html);
            context.insert("page_break_before", &page_break_before);
            tera.render("items_table", &context).unwrap()
        };

        // See `max_items_before_forced_break`: only the split point (not the
        // rows themselves) works around the renderer's pagination quirk.
        let split_at =
            max_items_before_forced_break(logo_base64.is_some()).min(item_rows.len());
        let (first_page_rows, overflow_rows) = item_rows.split_at(split_at);
        let mut items_tables_html = render_items_table(&first_page_rows.join(""), false);
        if !overflow_rows.is_empty() {
            items_tables_html.push_str(&render_items_table(&overflow_rows.join(""), true));
        }

        let page_html = {
            let mut context = tera::Context::new();
            context.insert("logo_base64", &logo_base64.unwrap_or_default());
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
            context.insert("comment", &self.comment.clone().unwrap_or_default());
            context.insert("items_tables_html", &items_tables_html);
            context.insert("currency", &currency);
            // Display trims the trailing zero: 8.1 stays "8.1", 8.0 becomes "8".
            context.insert("vat_percentage", &self.vat_percentage.to_string());
            context.insert("gross_total", &format!("{:.2}", self.gross_total));
            context.insert("net_total", &format!("{:.2}", self.net_total));
            context.insert("vat_total", &format!("{:.2}", self.vat_total));
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

        Ok(page_html)
    }

    pub fn build(self) -> anyhow::Result<Vec<u8>> {
        let page_html = self.build_html()?;

        Ok(HtmlConverter::new()
            .page_size(PageSize::A4)
            .margin(Margin::uniform(0.))
            .convert(&page_html)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A 2x2 red PNG, as a data URL.
    pub(super) const LOGO: &str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGP4z8DwnwGM/zMwAAAf7gP9NRsAMwAAAABJRU5ErkJggg==";

    pub(super) fn builder(logo_base64: Option<String>) -> BillBuilder {
        BillBuilder::new()
            .bill_no("BILL-2026-08-22-0001".to_owned())
            .bill_date("2026-08-22".to_owned())
            .bill_due_date("2026-09-21".to_owned())
            .bill_due_date_count(30)
            .currency("CHF")
            .creditor(Creditor {
                name: "Creditor".to_string(),
                street: "Main Street".to_string(),
                street_number: "1".to_string(),
                postal_code: "8000".to_string(),
                city: "Zurich".to_string(),
                country: "CH".to_string(),
                vat_number: Some("CHE-123.456.789 MWST".to_string()),
                iban: "CH4789144274621429278".to_string(),
                logo_base64,
            })
            .debitor(Debitor {
                name: "Debitor".to_string(),
                street: "Second Street".to_string(),
                street_number: "2".to_string(),
                postal_code: "3000".to_string(),
                city: "Bern".to_string(),
                country: "CH".to_string(),
            })
            .add_item(BillItem {
                description: "Item".to_string(),
                quantity: 2.0,
                unit_price: 50.0,
                total_price: 100.0,
            })
            .totals(BillTotals {
                net_total: 100.0,
                vat_total: 8.1,
                gross_total: 108.1,
            })
    }

    #[test]
    fn the_document_shows_the_bill_s_own_currency_and_vat_rate() {
        let html = builder(None)
            .currency("EUR")
            .vat_percentage(2.6)
            .build_html()
            .expect("build failed");

        assert!(html.contains("Montant (EUR)"), "item column keeps CHF");
        assert!(html.contains("Total TTC (EUR)"), "grand total keeps CHF");
        assert!(html.contains("TVA (2.6%)"), "VAT rate is hardcoded");
        assert!(
            html.contains("<strong>Montant total à payer :</strong> EUR"),
            "the payment summary has no currency"
        );
        assert!(!html.contains("CHF"), "CHF is still somewhere in the document");
    }

    #[test]
    fn a_whole_vat_rate_prints_without_a_trailing_zero() {
        let html = builder(None)
            .vat_percentage(8.0)
            .build_html()
            .expect("build failed");

        assert!(html.contains("TVA (8%)"), "expected `TVA (8%)`");
    }

    #[test]
    fn the_document_prints_dates_and_amounts_the_way_they_were_given() {
        let html = builder(None).build_html().expect("build failed");

        // Dates arrive already formatted by `models::format_date`.
        assert!(html.contains("2026-09-21"), "due date missing");
        assert!(!html.contains("00:00:00"), "a timestamp reached the document");
        // Money always carries two decimals.
        assert!(html.contains("108.10"), "gross total not formatted");
        assert!(html.contains("100.00"), "line total not formatted");
    }

    #[test]
    fn builds_a_document_without_a_logo() {
        let pdf = builder(None).build().expect("build failed");

        assert!(pdf.starts_with(b"%PDF"));
    }

    #[test]
    fn builds_a_document_with_the_creditor_logo() {
        let pdf = builder(Some(LOGO.to_owned()))
            .build()
            .expect("build failed");

        assert!(pdf.starts_with(b"%PDF"));
    }
}

#[cfg(test)]
mod layout_tests {
    use super::tests::{builder, LOGO};
    use super::BillItem;

    /// A4 width in points, and the template's 20mm page margin.
    const PAGE_WIDTH: f32 = 595.3;
    const MARGIN: f32 = 56.7;

    fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
        haystack
            .windows(needle.len())
            .position(|window| window == needle)
    }

    /// Inflates every page content stream: those are the ones carrying `TJ`.
    fn text_streams(pdf: &[u8]) -> Vec<String> {
        use std::io::Read as _;

        let mut streams = Vec::new();
        let mut cursor = 0;

        while let Some(found) = find(&pdf[cursor..], b"stream\n") {
            let at = cursor + found;
            let start = at + b"stream\n".len();

            // `endstream\n` contains `stream\n` too.
            if pdf[..at].ends_with(b"end") {
                cursor = start;
                continue;
            }

            let end = start + find(&pdf[start..], b"endstream").unwrap_or(0);
            let mut inflated = Vec::new();

            if flate2::read::ZlibDecoder::new(&pdf[start..end])
                .read_to_end(&mut inflated)
                .is_ok()
                && find(&inflated, b"TJ").is_some()
            {
                streams.push(String::from_utf8_lossy(&inflated).into_owned());
            }

            cursor = end.max(start);
        }

        streams
    }

    /// The `x` origin of every text-showing operator, tracking `Tm`/`Td`.
    fn text_origins(pdf: &[u8]) -> Vec<f32> {
        let mut origins = Vec::new();

        for content in text_streams(pdf) {
            let mut numbers: Vec<f32> = Vec::new();
            let mut x = 0.0;

            for token in content.split_whitespace() {
                if let Ok(number) = token.parse::<f32>() {
                    numbers.push(number);
                    continue;
                }

                match token {
                    "Td" | "TD" if numbers.len() >= 2 => x = numbers[numbers.len() - 2],
                    "Tm" if numbers.len() >= 6 => x = numbers[numbers.len() - 2],
                    "Tj" | "TJ" => origins.push(x),
                    _ => {}
                }

                numbers.clear();
            }
        }

        origins
    }

    /// A right-aligned run starting on the right margin has no room left to
    /// paint into: that is what a table column collapsed to zero width looks
    /// like once it reaches the page.
    fn runs_painting_off_the_page(pdf: &[u8]) -> Vec<f32> {
        let limit = PAGE_WIDTH - MARGIN - 6.0;

        text_origins(pdf)
            .into_iter()
            .filter(|x| *x > limit)
            .collect()
    }

    /// How many text-showing operators (`Tj`/`TJ`) each page's content stream
    /// carries — a rough proxy for "how many lines of text got painted here",
    /// without needing to decode the embedded font's glyph encoding.
    fn text_operator_counts(pdf: &[u8]) -> Vec<usize> {
        text_streams(pdf)
            .iter()
            .map(|stream| {
                stream.matches("Tj").count() + stream.matches("TJ").count()
            })
            .collect()
    }

    #[test]
    fn a_boundary_sized_item_list_does_not_defer_every_row_to_page_two() {
        // Ironpress, the HTML-to-PDF engine, otherwise defers a whole
        // `page-break-inside: auto` table to the next page whenever the table
        // would fit on a blank page but not in what's left of the current one
        // — leaving page 1 with nothing but the header/address blocks. 20
        // items sits in that range for this template (see
        // `max_items_before_forced_break`); `build_html` splits the rows into
        // two tables to keep some of them on page 1.
        let mut b = builder(None);
        for i in 0..20 {
            b = b.add_item(BillItem {
                description: format!("Line item number {i}"),
                quantity: 1.0,
                unit_price: 10.0,
                total_price: 10.0,
            });
        }
        let pdf = b.build().expect("build failed");
        let counts = text_operator_counts(&pdf);

        assert!(counts.len() >= 2, "expected at least 2 pages, got {counts:?}");
        // The header/address blocks alone paint a couple dozen text runs; if
        // the whole table were deferred to page 2, page 1's count would sit
        // near that baseline instead of climbing with rows placed on it.
        assert!(
            counts[0] > 40,
            "page 1 painted only {} text runs — the item rows look deferred to page 2 instead of split across pages",
            counts[0]
        );
    }

    #[test]
    fn the_logo_never_squeezes_the_invoice_header_off_the_page() {
        let without = builder(None).build().expect("build failed");
        let with = builder(Some(LOGO.to_owned()))
            .build()
            .expect("build failed");

        assert!(
            text_origins(&without).len() > 20,
            "expected to find the document text, found {} runs",
            text_origins(&without).len()
        );
        assert_eq!(runs_painting_off_the_page(&without), Vec::<f32>::new());
        assert_eq!(runs_painting_off_the_page(&with), Vec::<f32>::new());
    }
}
