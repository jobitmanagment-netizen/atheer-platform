import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';

/**
 * Mobile-friendly bottom-sheet token/option selector.
 * Replaces native <select> elements for a better touch experience.
 *
 * @param {Array} options        - [{ value, label, color?, icon? }] or string[]
 * @param {string|number} value  - currently selected value
 * @param {Function} onChange     - (value) => void
 * @param {string} placeholder
 * @param {string} title          - drawer header title
 */
export default function SelectSheet({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  title = 'Select Option',
  renderTrigger,
}) {
  const [open, setOpen] = useState(false);

  // Normalize options to objects
  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selected = normalized.find(o => o.value === value);
  const selectedColor = selected?.color || '#EAECEF';
  const selectedLabel = selected?.label || placeholder;

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: () => setOpen(true), label: selectedLabel, value })
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-sm font-black outline-none transition-all"
          style={{ color: selectedColor }}
        >
          {selected?.icon}
          <span>{selectedLabel}</span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: '#848E9C' }} />
        </button>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent style={{ background: '#1E2329', borderColor: '#2B3139' }}>
          <DrawerHeader>
            <DrawerTitle style={{ color: '#EAECEF' }}>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-2 pb-6 max-h-[60vh] overflow-y-auto">
            {normalized.map(o => {
              const isSelected = o.value === value;
              const color = o.color || '#EAECEF';
              return (
                <button
                  key={o.value}
                  onClick={() => handleSelect(o.value)}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: isSelected ? `${color}18` : 'transparent',
                    color: isSelected ? color : '#848E9C',
                    border: isSelected ? `1px solid ${color}30` : '1px solid transparent',
                  }}
                >
                  {o.icon}
                  <span className="flex-1 text-left">{o.label}</span>
                  {isSelected && (
                    <span className="text-xs font-black" style={{ color }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}