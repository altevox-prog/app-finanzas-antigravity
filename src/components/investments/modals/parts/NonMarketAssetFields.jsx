import React from 'react';
import { Coins } from 'lucide-react';
import AmountInput from '../../../common/AmountInput';
import FixedIncomeFields from '../FixedIncomeFields';

const INPUT_STYLE = { backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' };
const INPUT_CLS = "w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none transition-all";
const NUM_INPUT_CLS = "w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none";

export default function NonMarketAssetFields({
  category, name, setName, investedAmount, setInvestedAmount, currentAmount, setCurrentAmount,
  startDate, setStartDate, dueDate, setDueDate, interestRate, setInterestRate, subType, setSubType,
  handleEstimateCurrentCDT
}) {
  return (
    <div className="space-y-3.5 animate-fadeIn">
      <div>
        <label className="block text-[11px] font-bold opacity-70 mb-1">Nombre del Activo / Producto *</label>
        <input type="text" required placeholder={category === 'fixed' ? 'ej. CDT Bancolombia, CDT Nu...' : 'ej. Cajita Nu, Bolsillo Lulo...'} value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} style={INPUT_STYLE} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold opacity-70 mb-1">Monto Invertido (COP) *</label>
          <AmountInput value={investedAmount} allowDecimals required placeholder="0" onFocus={(e) => e.target.select()} onChange={(cleanVal, formatted) => { setInvestedAmount(formatted); if (!currentAmount || currentAmount === investedAmount) setCurrentAmount(formatted); }} className={NUM_INPUT_CLS} style={INPUT_STYLE} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold opacity-70">Valor Actual (COP) *</label>
            {category === 'fixed' && startDate && dueDate && interestRate && (
              <button type="button" onClick={handleEstimateCurrentCDT} className="text-[9px] text-[#007AFF] font-bold hover:underline cursor-pointer" title="Estimar acumulado">Estimar a hoy</button>
            )}
          </div>
          <AmountInput value={currentAmount} allowDecimals required placeholder="0" onFocus={(e) => e.target.select()} onChange={(cleanVal, formatted) => setCurrentAmount(formatted)} className="w-full text-xs font-black px-3 py-2.5 rounded-xl border border-transparent focus:outline-none" style={INPUT_STYLE} />
        </div>
      </div>

      {category === 'fixed' && (
        <FixedIncomeFields subType={subType} setSubType={setSubType} interestRate={interestRate} setInterestRate={setInterestRate} startDate={startDate} setStartDate={setStartDate} dueDate={dueDate} setDueDate={setDueDate} investedAmount={investedAmount} currency="COP" />
      )}

      {category === 'liquidity' && (
        <div className="p-3.5 rounded-2xl border space-y-2 animate-fadeIn" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#5AC8FA]">
              <Coins className="w-4 h-4" /><span>Fondo de Liquidez / Cuenta Remunerada</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-[#5AC8FA]/15 text-[#5AC8FA]">⚡ Liquidez Inmediata</span>
          </div>
          <div>
            <label className="block text-[10px] font-semibold opacity-60 mb-1">Tasa de Interés / Rendimiento Estimado (% E.A. Opcional)</label>
            <input type="number" step="0.01" placeholder="ej. 9.8" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-transparent focus:outline-none" style={INPUT_STYLE} />
          </div>
        </div>
      )}
    </div>
  );
}
