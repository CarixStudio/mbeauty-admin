
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Trash2, Save } from 'lucide-react';
import type { Product, ProductOption } from '../../types';

interface ProductVariantsTabProps {
  formData: Product;
  updateArrayItem: (field: keyof Product, index: number, subField: string, value: any) => void;
  removeArrayItem: (field: keyof Product, index: number) => void;
  addArrayItem: <T>(field: keyof Product, item: T) => void;
  generateVariants: () => void;
  isDetail: boolean;
  onSave?: () => void;
  isSaving?: boolean;
}

export const ProductVariantsTab: React.FC<ProductVariantsTabProps> = ({
  formData,
  updateArrayItem,
  removeArrayItem,
  addArrayItem,
  generateVariants,
  isDetail,
  onSave,
  isSaving = false
}) => {
  const inputClass = "p-2 border rounded text-sm bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:border-brand-accent";

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Product Options</CardTitle>
        <div className="flex gap-2">
            {!isDetail && <Button size="sm" variant="outline" onClick={() => addArrayItem('options', {id: `new_${Date.now()}`, name: '', values: []} as ProductOption)}><Plus size={16} className="mr-1"/> Add Option</Button>}
            {onSave && (
                <Button 
                    variant="secondary" 
                    onClick={onSave} 
                    isLoading={isSaving} 
                    className="h-11 px-6 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                >
                    <Save size={20} className="mr-2"/> SAVE VARIANTS
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Option Generator */}
        {formData.options?.map((opt, idx) => (
          <div key={opt.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <input disabled={isDetail} type="text" placeholder="Option Name (e.g. Size)" className={`${inputClass} w-full sm:w-48`} value={opt.name} onChange={(e) => updateArrayItem('options', idx, 'name', e.target.value)} />
              <input disabled={isDetail} type="text" placeholder="Values (comma separated)" className={`${inputClass} flex-1`} value={opt.values.join(', ')} onChange={(e) => updateArrayItem('options', idx, 'values', e.target.value.split(',').map(s => s.trim()))} />
              {!isDetail && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeArrayItem('options', idx)}><Trash2 size={16} /></Button>}
            </div>
          </div>
        ))}
        
        {!isDetail && formData.options && formData.options.length > 0 && (
          <div className="flex justify-end border-b border-gray-100 dark:border-gray-700 pb-6">
            <Button onClick={generateVariants}>Generate Variants Matrix</Button>
          </div>
        )}

        {/* Variants Matrix */}
        <div className="overflow-x-auto">
          <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-200">Variant Matrix ({formData.variants?.length || 0})</h4>
          <table className="w-full text-sm text-left border dark:border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="p-3 border-b dark:border-gray-700">Combination</th>
                <th className="p-3 border-b dark:border-gray-700">Price</th>
                <th className="p-3 border-b dark:border-gray-700">Cost</th>
                <th className="p-3 border-b dark:border-gray-700">SKU</th>
                <th className="p-3 border-b dark:border-gray-700">Stock</th>
                <th className="p-3 border-b dark:border-gray-700">Stripe ID</th>
                {!isDetail && <th className="p-3 border-b dark:border-gray-700 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {formData.variants?.map((variant, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3 font-medium text-gray-900 dark:text-gray-200">
                     <span className="bg-brand-light dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono text-brand-primary dark:text-white border border-brand-accent/20">
                        {variant.name}
                     </span>
                  </td>
                  <td className="p-3"><input disabled={isDetail} type="number" className="w-24 p-1 border rounded bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-accent" value={variant.price} onChange={(e) => updateArrayItem('variants', idx, 'price', Number(e.target.value))} /></td>
                  <td className="p-3"><input disabled={isDetail} type="number" placeholder="0.00" className="w-20 p-1 border rounded bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-accent" value={variant.cost_price || ''} onChange={(e) => updateArrayItem('variants', idx, 'cost_price', Number(e.target.value))} /></td>
                  <td className="p-3"><input disabled={isDetail} type="text" className="w-32 p-1 border rounded uppercase bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-accent" value={variant.sku} onChange={(e) => updateArrayItem('variants', idx, 'sku', e.target.value)} /></td>
                  <td className="p-3"><input disabled={isDetail} type="number" className="w-20 p-1 border rounded bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-accent" value={variant.stock} onChange={(e) => updateArrayItem('variants', idx, 'stock', Number(e.target.value))} /></td>
                  <td className="p-3"><input disabled={isDetail} type="text" className="w-32 p-1 border rounded bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-accent" placeholder="price_..." value={variant.stripe_price_id || ''} onChange={(e) => updateArrayItem('variants', idx, 'stripe_price_id', e.target.value)} /></td>
                  {!isDetail && <td className="p-3 text-right"><button onClick={() => removeArrayItem('variants', idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>}
                </tr>
              ))}
              {(!formData.variants || formData.variants.length === 0) && <tr><td colSpan={7} className="p-8 text-center text-gray-500 italic">No variants generated yet. Add options and click generate.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
