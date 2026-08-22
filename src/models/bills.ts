export interface BillItem {
    id: number;
    bill_id: number;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at: number;
}

export enum BillStatus {
    DRAFT = "draft",
    SENT = "sent",
    PAID = "paid",
    OVERDUE = "overdue",
    CANCELLED = "cancelled",
}

export interface Bill {
    id: number;
    user_facing_id: string;
    debitor_id: number;
    creditor_id: number;
    vat_percentage: number;
    currency: string;
    due_date: number;
    status: BillStatus;
    created_at: number;
    replaced_by: number | null;
}

export interface CreateBillInput extends Omit<
    Bill,
    "id" | "user_facing_id" | "created_at"
> {}

export interface CreateBillItemInput extends Omit<
    BillItem,
    "id" | "bill_id" | "total_price" | "created_at"
> {}
