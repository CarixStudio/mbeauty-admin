
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Layers, Save, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Category } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export const CategoriesPage: React.FC = () => {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Categories
  const fetchCategories = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        setCategories(data || []);
    } catch (error: any) {
        addToast('Failed to load categories: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filter Categories
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, slug: category.slug });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This will affect products linked to it.')) return;
    
    try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        setCategories(prev => prev.filter(c => c.id !== id));
        addToast('Category deleted successfully', 'success');
    } catch (error: any) {
        addToast('Delete failed: ' + error.message, 'error');
    }
  };

  const handleNameChange = (val: string) => {
    // Auto-generate slug if creating new
    const newSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData({ name: val, slug: newSlug });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
        addToast('Name and Slug are required', 'error');
        return;
    }

    setIsSaving(true);
    try {
        if (editingCategory) {
            // Update
            const { error } = await supabase
                .from('categories')
                .update({ name: formData.name, slug: formData.slug })
                .eq('id', editingCategory.id);
            
            if (error) throw error;
            
            setCategories(prev => prev.map(c => 
                c.id === editingCategory.id ? { ...c, name: formData.name, slug: formData.slug } : c
            ));
            addToast('Category updated', 'success');
        } else {
            // Create
            const { data, error } = await supabase
                .from('categories')
                .insert([{ name: formData.name, slug: formData.slug }])
                .select()
                .single();
            
            if (error) throw error;
            
            setCategories(prev => [...prev, data]);
            addToast('Category created', 'success');
        }
        setIsModalOpen(false);
    } catch (error: any) {
        addToast('Save failed: ' + error.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit" title="Categories">Categories</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Organize your products into catalogs.</p>
        </div>
        <Button onClick={openCreateModal} title="Create new category">
           <Plus size={18} className="mr-2" /> Add Category
        </Button>
      </div>

      <Card>
         <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl">
            <div className="relative max-w-md">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Search categories..." 
                 className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                     <th className="px-6 py-4 font-semibold">Name</th>
                     <th className="px-6 py-4 font-semibold">Slug</th>
                     <th className="px-6 py-4 font-semibold">Products</th>
                     <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                      <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" /></td></tr>
                  ) : filteredCategories.length > 0 ? (
                    filteredCategories.map(category => (
                       <tr key={category.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4">
                             <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                          </td>
                          <td className="px-6 py-4">
                             <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">/{category.slug}</span>
                          </td>
                          <td className="px-6 py-4">
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand-primary border border-brand-accent/20 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                {category.product_count} items
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditModal(category)} title="Edit">
                                   <Edit2 size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)} title="Delete">
                                   <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                                </Button>
                             </div>
                          </td>
                       </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No categories found.</td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </Card>

      {/* Create/Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#262626] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
               <h3 className="font-bold text-lg text-gray-900 dark:text-white">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
               <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                    placeholder="e.g. Skincare"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    autoFocus
                    required
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500 dark:text-gray-400 text-sm">/</span>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all font-mono text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                      placeholder="e.g. skincare"
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value})}
                      required
                    />
                  </div>
               </div>

               <div className="pt-4 flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" isLoading={isSaving}>
                     <Save size={16} className="mr-2" /> Save Category
                  </Button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
