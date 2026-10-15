import React from 'react';
import { 
  Pencil, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Check, 
  X, 
  CornerDownRight 
} from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { PRESET_COLORS } from '../constants';

export default function CategoryCard({
  category,
  isExpanded,
  onToggleExpand,
  onEditCategory,
  onDeleteCategory,
  canDeleteCategory = true,
  // Subcategorías
  subInput = '',
  setSubInput,
  isActiveSubInput = false,
  onOpenSubInput,
  onCloseSubInput,
  onSubmitSubcategory,
  editingSubId,
  editSubName = '',
  setEditSubName,
  editSubColor = '#007AFF',
  setEditSubColor,
  onStartEditSub,
  onCancelEditSub,
  onSaveEditSub,
  onDeleteSubcategory
}) {
  const subcats = category.subcategories || [];

  return (
    <div className="rounded-2xl border transition-all overflow-hidden bg-white dark:bg-zinc-900/90 border-slate-200/80 dark:border-white/[0.08]">
      {/* Cabecera de Categoría: Icono Circular + Nombre + Acciones */}
      <div 
        className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer active:opacity-80 select-none gap-2"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icono Squircle con Color Personalizado y Emoji Nativo */}
          <CategoryIcon 
            icon={category.icon} 
            category={category} 
            color={category.color || '#FF9500'} 
            size="md" 
            withBadge={true} 
          />

          <div className="min-w-0 flex-1">
            <span className="text-[14px] sm:text-[15px] font-bold truncate block leading-tight text-slate-900 dark:text-white">
              {category.name}
            </span>
            <span className="text-[11px] opacity-60 font-normal block mt-0.5">
              {subcats.length === 0 ? 'Sin subcategorías' : `${subcats.length} subcategoría${subcats.length === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onEditCategory(category)}
            title="Editar categoría"
            className="p-2 opacity-50 hover:opacity-100 text-slate-600 dark:text-zinc-300 hover:text-[#007AFF] rounded-xl transition-colors active:scale-90 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {canDeleteCategory && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) {
                  onDeleteCategory(category.id);
                }
              }}
              title="Eliminar categoría"
              className="p-2 opacity-50 hover:opacity-100 text-slate-600 dark:text-zinc-300 hover:text-rose-500 rounded-xl transition-colors active:scale-90 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleExpand}
            title={isExpanded ? 'Contraer' : 'Expandir subcategorías'}
            className="p-2 opacity-60 hover:opacity-100 text-slate-600 dark:text-zinc-300 rounded-xl transition-transform active:scale-90 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#34C759]" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Desplegable de Subcategorías */}
      {isExpanded && (
        <div 
          className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-zinc-950/40 animate-slide-up space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              Subcategorías / Etiquetas de {category.name}
            </span>
            {!isActiveSubInput && (
              <button
                type="button"
                onClick={onOpenSubInput}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#34C759] hover:underline active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            )}
          </div>

          {subcats.length === 0 ? (
            <p className="text-[11px] opacity-50 py-1 italic">
              Sin subcategorías aún. Toca "Añadir" para crear una.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {subcats.map((sub) => {
                const isEditingThisSub = editingSubId === sub.id;

                if (isEditingThisSub) {
                  return (
                    <div 
                      key={sub.id} 
                      className="flex flex-col gap-1.5 p-2 rounded-xl border border-[#34C759] w-full sm:w-auto bg-slate-100 dark:bg-zinc-800"
                    >
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          autoFocus
                          value={editSubName}
                          onChange={(e) => setEditSubName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveEditSub(category.id, sub.id);
                            if (e.key === 'Escape') onCancelEditSub();
                          }}
                          className="text-xs bg-transparent focus:outline-none flex-1 font-medium text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => onSaveEditSub(category.id, sub.id)}
                          className="text-[#34C759] hover:opacity-80 p-1 cursor-pointer"
                          title="Guardar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEditSub}
                          className="opacity-50 hover:opacity-100 text-slate-500 dark:text-zinc-400 p-1 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/80 dark:border-white/[0.08]">
                        <span className="text-[10px] opacity-60">Color:</span>
                        {PRESET_COLORS.slice(0, 6).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditSubColor(c)}
                            className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${editSubColor === c ? 'scale-125 ring-1 ring-[#34C759]' : 'opacity-80 hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <span 
                    key={sub.id}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border shadow-sm group/sub bg-slate-100 dark:bg-zinc-800 border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-zinc-200"
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: sub.color || category.color || '#007AFF' }} 
                    />
                    <span className="truncate max-w-[120px]">{sub.name}</span>
                    <button
                      type="button"
                      onClick={() => onStartEditSub(sub)}
                      title="Editar etiqueta"
                      className="opacity-40 hover:opacity-100 hover:text-[#007AFF] transition-colors p-0.5 cursor-pointer"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la etiqueta "${sub.name}"?`)) {
                          onDeleteSubcategory(category.id, sub.id);
                        }
                      }}
                      title="Eliminar etiqueta"
                      className="opacity-40 hover:opacity-100 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Input rápido para añadir subcategoría */}
          {isActiveSubInput && (
            <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center gap-1.5 animate-slide-up">
              <CornerDownRight className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Nueva subcategoría..."
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSubmitSubcategory(category.id); }}
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#34C759]"
              />
              <button
                type="button"
                onClick={() => onSubmitSubcategory(category.id)}
                className="px-2.5 py-1.5 text-xs font-bold bg-[#34C759] text-white rounded-lg hover:bg-emerald-600 active:scale-95 cursor-pointer"
              >
                Añadir
              </button>
              <button
                type="button"
                onClick={onCloseSubInput}
                className="p-1.5 opacity-60 hover:opacity-100 text-slate-500 dark:text-zinc-400 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
