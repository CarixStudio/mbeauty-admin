
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Trash2, X, Bold, Italic, List, AlignLeft, AlignCenter, Sparkles, Loader2, Save } from 'lucide-react';
import type { Product, KeyIngredient, ProductBenefit } from '../../types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface ProductGeneralTabProps {
  formData: Product;
  updateField: (field: keyof Product, value: any) => void;
  updateArrayItem: (field: keyof Product, index: number, subField: string, value: any) => void;
  addArrayItem: <T>(field: keyof Product, item: T) => void;
  removeArrayItem: (field: keyof Product, index: number) => void;
  handleNameChange: (name: string) => void;
  isDetail: boolean;
  onSaveBasic?: () => void;
  onSaveIngredients?: () => void;
  isSaving?: boolean;
}

export const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
  formData,
  updateField,
  updateArrayItem,
  addArrayItem,
  removeArrayItem,
  handleNameChange,
  isDetail,
  onSaveBasic,
  onSaveIngredients,
  isSaving = false
}) => {
  const [aiKeywords, setAiKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const generateDescription = () => {
    setIsGenerating(true);
    // Mock AI Generation
    setTimeout(() => {
        const keywords = aiKeywords.split(',').map(k => k.trim());
        const generated = `Experience the ultimate in beauty with our new ${formData.name}. Formulated with ${keywords.join(' and ')}, this product delivers stunning results. Perfect for daily use, it ensures you look your best while nourishing your skin. Elevate your routine with Momoh Beauty.`;
        updateField('description', `Luxurious ${formData.name} with ${keywords[0] || 'premium ingredients'}.`);
        updateField('long_description', generated);
        setIsGenerating(false);
        setIsAiOpen(false);
        setAiKeywords('');
    }, 1500);
  };

  const inputClass = "w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-brand-accent bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100 dark:focus:border-brand-primary";
  const labelClass = "text-sm font-semibold text-gray-800 dark:text-gray-300";

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Basic Information</CardTitle>
            <div className="flex items-center gap-3">
                {!isDetail && (
                    <Popover open={isAiOpen} onOpenChange={setIsAiOpen}>
                        <PopoverTrigger asChild>
                            <Button size="sm" variant="outline" className="text-brand-primary dark:text-white border-brand-accent/30 hover:bg-brand-light dark:hover:bg-gray-700 h-9">
                                <Sparkles size={16} className="mr-2 text-brand-accent"/> AI Generate
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 dark:bg-[#262626] dark:border-gray-700" align="end">
                            <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">AI Description Generator</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Enter keywords separated by commas (e.g. hydrating, matte, organic)</p>
                            <textarea 
                                className="w-full border rounded p-2 text-sm mb-3 h-20 resize-none bg-white text-gray-900 dark:bg-[#333333] dark:border-gray-600 dark:text-gray-100"
                                placeholder="Keywords..."
                                value={aiKeywords}
                                onChange={(e) => setAiKeywords(e.target.value)}
                            />
                            <Button size="sm" className="w-full" onClick={generateDescription} disabled={!aiKeywords || isGenerating}>
                                {isGenerating ? <><Loader2 size={14} className="animate-spin mr-2"/> Generating...</> : 'Generate Content'}
                            </Button>
                        </PopoverContent>
                    </Popover>
                )}
                {onSaveBasic && (
                    <Button 
                        variant="secondary" 
                        onClick={onSaveBasic} 
                        isLoading={isSaving} 
                        className="h-11 px-6 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                    >
                        <Save size={20} className="mr-2"/> SAVE INFO
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className={labelClass}>Product Name</label>
            <input disabled={isDetail} type="text" className={inputClass} value={formData.name} onChange={(e) => handleNameChange(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Subtitle</label>
            <input disabled={isDetail} type="text" className={inputClass} value={formData.subtitle || ''} onChange={(e) => updateField('subtitle', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Description (Short)</label>
            <textarea disabled={isDetail} className={`${inputClass} h-24 resize-none`} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)}></textarea>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Long Description (Rich Text)</label>
            {!isDetail && (
              <div className="flex gap-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-b-0 rounded-t-lg">
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"><Bold size={14}/></button>
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"><Italic size={14}/></button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"><List size={14}/></button>
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"><AlignLeft size={14}/></button>
                <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"><AlignCenter size={14}/></button>
              </div>
            )}
            <textarea disabled={isDetail} className={`${inputClass} h-48 font-mono ${isDetail ? 'rounded-lg' : 'rounded-b-lg'}`} placeholder="<html>...</html>" value={formData.long_description || ''} onChange={(e) => updateField('long_description', e.target.value)}></textarea>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ingredients & Specs</CardTitle>
            {onSaveIngredients && (
                <Button 
                    variant="secondary" 
                    onClick={onSaveIngredients} 
                    isLoading={isSaving} 
                    className="h-11 px-6 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                >
                    <Save size={20} className="mr-2"/> SAVE SPECS
                </Button>
            )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <label className={labelClass}>Full Ingredients List</label>
            <textarea disabled={isDetail} className={`${inputClass} h-24`} value={formData.full_ingredients || ''} onChange={(e) => updateField('full_ingredients', e.target.value)}></textarea>
          </div>
          
          {/* Key Ingredients Repeatable */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={labelClass}>Key Ingredients</label>
              {!isDetail && <Button size="sm" variant="ghost" onClick={() => addArrayItem('key_ingredients', {name: '', description: '', image: ''} as KeyIngredient)}><Plus size={14}/> Add</Button>}
            </div>
            <div className="space-y-3">
              {formData.key_ingredients?.map((ing, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 items-start">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <input disabled={isDetail} placeholder="Ingredient Name" className={`${inputClass} py-1.5`} value={ing.name} onChange={(e) => updateArrayItem('key_ingredients', idx, 'name', e.target.value)} />
                    <textarea disabled={isDetail} placeholder="Description" className={`${inputClass} py-1.5 resize-none`} rows={2} value={ing.description} onChange={(e) => updateArrayItem('key_ingredients', idx, 'description', e.target.value)} />
                  </div>
                  {!isDetail && <button onClick={() => removeArrayItem('key_ingredients', idx)}><Trash2 size={14} className="text-red-500"/></button>}
                </div>
              ))}
            </div>
          </div>

            {/* Benefits Repeatable */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={labelClass}>Benefits</label>
              {!isDetail && <Button size="sm" variant="ghost" onClick={() => addArrayItem('benefits', {title: '', description: ''} as ProductBenefit)}><Plus size={14}/> Add</Button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.benefits?.map((ben, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 relative group">
                  <input disabled={isDetail} placeholder="Benefit Title" className={`${inputClass} py-1.5 mb-2 font-medium`} value={ben.title} onChange={(e) => updateArrayItem('benefits', idx, 'title', e.target.value)} />
                  <textarea disabled={isDetail} placeholder="Description" className={`${inputClass} py-1.5 resize-none`} rows={2} value={ben.description} onChange={(e) => updateArrayItem('benefits', idx, 'description', e.target.value)} />
                  {!isDetail && <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => removeArrayItem('benefits', idx)}><X size={14} className="text-gray-400 hover:text-red-500"/></button>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
