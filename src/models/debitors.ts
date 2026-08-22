export interface Debitor {
    id: number;
    name: string;
    street: string;
    street_number: string;
    city: string;
    postal_code: string;
    country: string;
    created_at: number;
}

export interface CreateDebitorInput extends Omit<
    Debitor,
    "id" | "created_at"
> {}
