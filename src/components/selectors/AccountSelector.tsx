import { useMemo } from "react";
import { EntitySelector, type EntityOption } from "./EntitySelector";

export type CoaAccount = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_id?: string | null;
  is_active?: boolean | null;
};

const TYPE_LABEL: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  income: "Revenue",
  expense: "Expense",
};

const CASH_BANK = /(cash|bank|mobile|airtel|mtn|zamtel|visa|master|petty)/i;

export function toAccountOptions(accounts: CoaAccount[]): EntityOption[] {
  const byId = new Map(accounts.map(a => [a.id, a]));
  return accounts
    .filter(a => a.is_active !== false)
    .map(a => {
      const parent = a.parent_id ? byId.get(a.parent_id) : null;
      const type = TYPE_LABEL[a.account_type] ?? a.account_type;
      return {
        id: a.id,
        code: a.account_code,
        label: a.account_name,
        meta: parent ? `Type: ${type} · Parent: ${parent.account_name}` : `Type: ${type}`,
        group: type,
      } satisfies EntityOption;
    })
    .sort((x, y) => (x.code ?? "").localeCompare(y.code ?? ""));
}

type Props = {
  label: string;
  help?: string;
  accounts: CoaAccount[];
  /** Restrict to these account types, e.g. ["expense"]. */
  types?: string[];
  /** Only cash/bank-like asset accounts. */
  cashBankOnly?: boolean;
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  required?: boolean;
  recentKey?: string;
  className?: string;
  emptyActionLabel?: string;
};

export function AccountSelector({
  label, help, accounts, types, cashBankOnly, value, onChange, required, recentKey, className, emptyActionLabel,
}: Props) {
  const options = useMemo(() => {
    let list = accounts;
    if (types?.length) list = list.filter(a => types.includes(a.account_type));
    if (cashBankOnly) list = list.filter(a => CASH_BANK.test(a.account_name));
    return toAccountOptions(list);
  }, [accounts, types, cashBankOnly]);

  return (
    <EntitySelector
      label={label}
      help={help}
      options={options}
      value={value}
      onChange={onChange}
      required={required}
      recentKey={recentKey}
      className={className}
      placeholder="Search account code or name…"
      emptyTitle={`No ${label.toLowerCase()} available in your chart of accounts.`}
      emptyActionLabel={emptyActionLabel ?? "Open Chart of Accounts"}
      emptyActionTo="/chart-of-accounts"
    />
  );
}
