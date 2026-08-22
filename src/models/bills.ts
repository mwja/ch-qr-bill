export interface BillItem {
    id: number;
    bill_id: number;
    description: string;
    quantity: number;
    unit_price: number;
    /** Generated column: the database derives it from quantity * unit_price. */
    total_price: number;
    created_at: string;
}

export enum BillStatus {
    DRAFT = "draft",
    SENT = "sent",
    PAID = "paid",
    OVERDUE = "overdue",
    CANCELLED = "cancelled",
}

/** Derived by the `bill_totals` view, never sent to the backend. */
export interface BillTotals {
    net_total: number;
    vat_total: number;
    gross_total: number;
}

export interface Bill {
    id: number;
    user_facing_id: string;
    debitor_id: number;
    creditor_id: number;
    vat_percentage: number;
    currency: string;
    due_date: string;
    status: BillStatus;
    created_at: string;
    replaced_by: number | null;
    totals: BillTotals;
}

/** How a bill relates to the ones that superseded it, in both directions. */
export interface BillLinks {
    replacement: Bill | null;
    replaces: Bill[];
}

export interface BillItemInput {
    description: string;
    quantity: number;
    unit_price: number;
}

/** Matches `db::models::BillInput`: totals are deliberately absent. */
export interface BillInput {
    creditor_id: number;
    debitor_id: number;
    vat_percentage: number;
    currency: string;
    due_date: string;
    status: BillStatus;
    items: BillItemInput[];
}

export const CURRENCIES = ["CHF", "EUR"] as const;

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
    [BillStatus.DRAFT]: "Draft",
    [BillStatus.SENT]: "Sent",
    [BillStatus.PAID]: "Paid",
    [BillStatus.OVERDUE]: "Overdue",
    [BillStatus.CANCELLED]: "Cancelled",
};

export type BillStatusColor =
    | "brand"
    | "success"
    | "warning"
    | "danger"
    | "informative";

export const BILL_STATUS_COLORS: Record<BillStatus, BillStatusColor> = {
    [BillStatus.DRAFT]: "informative",
    [BillStatus.SENT]: "brand",
    [BillStatus.PAID]: "success",
    [BillStatus.OVERDUE]: "warning",
    [BillStatus.CANCELLED]: "danger",
};

export function formatAmount(amount: number, currency: string): string {
    return `${currency} ${amount.toFixed(2)}`;
}
