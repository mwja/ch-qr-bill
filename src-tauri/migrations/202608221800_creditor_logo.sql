-- A creditor can carry a logo, stored as the data URL the bill template embeds.
ALTER TABLE creditors ADD COLUMN logo_base64 TEXT;
