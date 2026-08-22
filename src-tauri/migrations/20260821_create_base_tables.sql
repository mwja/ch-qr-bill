-- Create own creditors
CREATE TABLE IF NOT EXISTS creditors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    street TEXT NOT NULL,
    street_number TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    vat_number TEXT,
    iban TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create debitors directory
CREATE TABLE IF NOT EXISTS debitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    street TEXT NOT NULL,
    street_number TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    iban TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create bill items
CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id)
);

-- Create bills, with status sent/paid/late/replaced (with  areplaced by)
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_facing_id TEXT NOT NULL UNIQUE,
    creditor_id INTEGER NOT NULL,
    debitor_id INTEGER NOT NULL,
    -- VAT to add if should calculated (if 0, not calculated)
    vat_percentage REAL NOT NULL DEFAULT 0,
    -- never set this directly. should be calculated based on the bill items and VAT.
    calculated_amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    due_date DATETIME NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    replaced_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debitor_id) REFERENCES debitors(id),
    FOREIGN KEY (replaced_by) REFERENCES bills(id)
);

CREATE INDEX IF NOT EXISTS idx_bills_debitor_id ON bills(debitor_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_user_facing_id ON bills(user_facing_id);
