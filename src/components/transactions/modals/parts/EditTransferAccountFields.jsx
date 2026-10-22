import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import AccountCombobox from '../../../accounts/components/AccountCombobox';

export default function EditTransferAccountFields({
  accountId,
  setAccountId,
  destinationAccountId,
  setDestinationAccountId,
  accounts = [],
  onAddAccount,
  date,
  setDate
}) {
  const destinationAccounts = accounts.filter((a) => a?.id !== accountId);

  const handleSwap = () => {
    if (!destinationAccountId) return;
    const prevSource = accountId;
    const prevDest = destinationAccountId;
    setAccountId(prevDest);
    setDestinationAccountId(prevSource);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
            Cuenta origen *
          </label>
          <AccountCombobox
            accounts={accounts}
            selectedAccountId={accountId}
            onSelectAccount={(id) => {
              setAccountId(id);
              if (id === destinationAccountId) {
                const alt = accounts.find((a) => a?.id !== id)?.id || '';
                setDestinationAccountId(alt);
              }
            }}
            onAddAccount={onAddAccount}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400">
              Cuenta destino *
            </label>
            {accounts.length > 1 && (
              <button
                type="button"
                onClick={handleSwap}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Invertir</span>
              </button>
            )}
          </div>
          <AccountCombobox
            accounts={destinationAccounts}
            selectedAccountId={destinationAccountId}
            onSelectAccount={setDestinationAccountId}
            onAddAccount={onAddAccount}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
          Fecha *
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-11 px-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition-all"
        />
      </div>
    </div>
  );
}
