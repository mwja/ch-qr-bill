import type { Creditor } from "../models/creditors";
import { Debitor } from "../models/debitors";
import { buildInvokeHook } from "./useInvoked";

export const useAllCreditors = buildInvokeHook<Creditor[]>("get_all_creditors");

export const useAllDebitors = buildInvokeHook<Debitor[]>("get_all_debitors");
