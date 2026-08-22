export interface Creditor {
    id: number;
    name: string;
    street: string;
    street_number: string;
    city: string;
    postal_code: string;
    country: string;
    vat_number: string | null;
    iban: string;
    /** Data URL of the logo embedded in the bill document. */
    logo_base64: string | null;
    created_at: string;
}

export interface CreditorInput extends Omit<Creditor, "id" | "created_at"> {}
