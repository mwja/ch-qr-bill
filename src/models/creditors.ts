export interface Creditor {
    id: number;
    name: string;
    street: string;
    street_number: string;
    city: string;
    postal_code: string;
    country: string;
    vat_number: string;
    iban: string;
    created_at: number;
}

export interface CreateCreditorInput extends Omit<
    Creditor,
    "id" | "created_at"
> {}
