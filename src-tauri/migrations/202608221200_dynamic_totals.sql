-- Totals are never stored by hand: the database derives them.

-- 1. bill_items.total_price becomes a generated column (quantity * unit_price).
ALTER TABLE bill_items RENAME TO bill_items_old;

CREATE TABLE bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    -- never set this directly: it is derived from quantity and unit_price.
    total_price REAL GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, created_at)
SELECT id, bill_id, description, quantity, unit_price, created_at
FROM bill_items_old;

DROP TABLE bill_items_old;

CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);

-- 2. bills.calculated_amount is replaced by the bill_totals view.
ALTER TABLE bills DROP COLUMN calculated_amount;

CREATE VIEW bill_totals AS
SELECT
    bill_id,
    net_total,
    vat_total,
    ROUND(net_total + vat_total, 2) AS gross_total
FROM (
    SELECT
        b.id AS bill_id,
        ROUND(
            COALESCE((SELECT SUM(i.total_price) FROM bill_items i WHERE i.bill_id = b.id), 0),
            2
        ) AS net_total,
        ROUND(
            COALESCE((SELECT SUM(i.total_price) FROM bill_items i WHERE i.bill_id = b.id), 0)
                * b.vat_percentage / 100.0,
            2
        ) AS vat_total
    FROM bills b
);
