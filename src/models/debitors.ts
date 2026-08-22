export interface Debitor {
    id: number;
    name: string;
    street: string;
    street_number: string;
    city: string;
    postal_code: string;
    country: string;
    created_at: string;
}

export interface DebitorInput extends Omit<Debitor, "id" | "created_at"> {}
