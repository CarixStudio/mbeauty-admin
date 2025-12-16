
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, ArrowLeft, Image as ImageIcon, Save, GripVertical, Globe, Video, Type, X, Star, Package, Loader2, Eye, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { ProductOption, ProductVariant, Product, ProductHighlight, ProductContentBlock, Category } from '../types';
import { ProductGeneralTab } from '../components/products/ProductGeneralTab';
import { ProductVariantsTab } from '../components/products/ProductVariantsTab';
import type { CurrencyConfig } from '../App';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { SimpleTooltip } from '../components/ui/Tooltip';
import { CopyButton } from '../components/ui/CopyButton';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { CloudinaryOptimizer } from '../lib/cloudinary';
import { logAuditAction } from '../lib/audit';

interface ProductsPageProps {
  navState: { mode?: string; id?: string | number };
  onNavigate: (page: string, id?: string | number, mode?: 'list' | 'create' | 'edit' | 'detail') => void;
  currency: CurrencyConfig;
}

// Default empty state for a new product
const DEFAULT_PRODUCT: Product = {
  id: '',
  name: '',
  slug: '',
  category: 'Skincare',
  price: 0,
  stock: 0,
  status: 'Draft',
  image: '',
  currency: 'USD',
  tags: [],
  key_ingredients: [],
  benefits: [],
  attributes: [],
  options: [],
  variants: [],
  images: [],
  highlights: [],
  content_blocks: [],
  related_products: []
};

export const ProductsPage: React.FC<ProductsPageProps> = ({ navState, onNavigate, currency }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // List View Filters
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk Edit State
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [bulkPriceAction, setBulkPriceAction] = useState<'increase_percent' | 'decrease_percent' | 'set_fixed'>('increase_percent');
  const [bulkPriceValue, setBulkPriceValue] = useState<string>('0');

  // ----------------------------------------------------------------------
  // CREATE / EDIT STATE
  // ----------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<Product>(DEFAULT_PRODUCT);
  const [isSaving, setIsSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
        if (!supabase) return;
        const { data } = await supabase.from('categories').select('*');
        if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Fetch Products (List)
  const fetchProducts = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const categorySelect = categoryFilter !== 'All' ? 'categories!inner(name)' : 'categories(name)';
        
        let query = supabase.from('products').select(`
            *,
            ${categorySelect},
            product_variants:product_variants!product_variants_product_id_fkey(inventory_count, sku)
        `, { count: 'exact' });

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
        }
        if (categoryFilter !== 'All') {
            query = query.eq('categories.name', categoryFilter); 
        }
        if (statusFilter !== 'All') {
            query = query.eq('status', statusFilter);
        }
        if (showFeaturedOnly) {
            query = query.eq('is_featured', true);
        }

        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const mapped: Product[] = (data || []).map((p: any) => ({
            ...p,
            category: p.categories?.name || 'Uncategorized',
            image: CloudinaryOptimizer.url(p.image_url, { width: 100, crop: 'fill' }), 
            stock: p.product_variants ? p.product_variants.reduce((sum: number, v: any) => sum + (v.inventory_count || 0), 0) : 0,
            sku: p.product_variants?.[0]?.sku || ''
        }));

        let filteredData = mapped;
        if (stockFilter !== 'All') {
            if (stockFilter === 'In Stock') filteredData = mapped.filter(p => p.stock > 5);
            else if (stockFilter === 'Low Stock') filteredData = mapped.filter(p => p.stock > 0 && p.stock <= 5);
            else if (stockFilter === 'Out of Stock') filteredData = mapped.filter(p => p.stock === 0);
        }

        setProducts(filteredData);
        setTotalCount(stockFilter === 'All' ? (count || 0) : filteredData.length);

    } catch (error: any) {
        console.error("Fetch Error:", error);
        addToast("Failed to load products: " + error.message, 'error');
    } finally {
        setLoading(false);
    }
  }, [searchTerm, categoryFilter, statusFilter, stockFilter, showFeaturedOnly, currentPage, itemsPerPage, addToast]);

  useEffect(() => {
      if (navState.mode === 'list' || !navState.mode) {
          fetchProducts();
      }
  }, [fetchProducts, navState.mode]);

  const fetchProductDetail = useCallback(async (id: string) => {
      if (!supabase) return;
      setDetailLoading(true);
      try {
          const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories(name),
                product_variants:product_variants!product_variants_product_id_fkey(*),
                product_options(*, product_option_values(*)),
                product_images(*),
                product_highlights(*),
                product_content_blocks(*)
            `)
            .eq('id', id)
            .single();

          if (error) throw error;

          const form: Product = {
              id: data.id,
              name: data.name,
              slug: data.slug,
              subtitle: data.subtitle,
              category: data.categories?.name,
              category_id: data.category_id,
              subcategory: data.subcategory,
              description: data.description,
              long_description: data.long_description,
              price: data.price,
              compare_at_price: data.compare_at_price,
              currency: data.currency as any,
              stock: data.product_variants ? data.product_variants.reduce((sum: number, v: any) => sum + (v.inventory_count || 0), 0) : 0,
              status: data.status,
              image: data.image_url,
              hover_image_url: data.hover_image_url,
              swatch_image_url: data.swatch_image_url,
              section_background_image_url: data.section_background_image_url,
              sku: data.product_variants?.[0]?.sku || '', 
              is_featured: data.is_featured,
              badge_text: data.badge_text,
              scent_tag: data.scent_tag,
              color_hex: data.color_hex,
              tags: data.tags || [],
              application_info: data.application_info,
              full_ingredients: data.full_ingredients,
              key_ingredients: data.key_ingredients || [],
              benefits: data.benefits || [],
              attributes: data.attributes || [],
              highlights_heading: data.highlights_heading,
              images: (data.product_images || []).map((img: any) => ({
                  id: img.id,
                  url: img.image_url,
                  alt: img.alt_text,
                  display_order: img.display_order,
                  variant_id: img.variant_id
              })).sort((a: any, b: any) => a.display_order - b.display_order),
              highlights: (data.product_highlights || []).map((h: any) => ({
                  id: h.id,
                  title: h.title,
                  description: h.description,
                  image: h.image_url,
                  display_order: h.display_order
              })).sort((a: any, b: any) => a.display_order - b.display_order),
              content_blocks: (data.product_content_blocks || []).map((b: any) => ({
                  id: b.id,
                  type: b.block_type,
                  heading: b.heading,
                  body: b.body_text,
                  image_url: b.image_url,
                  video_url: b.video_url,
                  tolstoy_id: b.tolstoy_id,
                  display_order: b.display_order
              })).sort((a: any, b: any) => a.display_order - b.display_order),
              options: (data.product_options || []).map((opt: any) => ({
                  id: opt.id,
                  name: opt.name,
                  values: (opt.product_option_values || []).map((v: any) => v.value)
              })),
              variants: (data.product_variants || []).map((v: any) => ({
                  id: v.id,
                  sku: v.sku,
                  price: v.price,
                  cost_price: v.cost_price,
                  stock: v.inventory_count,
                  stripe_price_id: v.stripe_price_id,
                  name: `Variant ${v.sku}`,
                  updated_at: v.updated_at // Store version for OCC
              }))
          };

          setFormData(form);
      } catch (error: any) {
          console.error("Detail Fetch Error:", error);
          addToast("Could not load product details: " + error.message, 'error');
      } finally {
          setDetailLoading(false);
      }
  }, [addToast]);

  useEffect(() => {
     if (navState.mode === 'create') {
        setFormData({ ...DEFAULT_PRODUCT }); 
     } else if ((navState.mode === 'edit' || navState.mode === 'detail') && navState.id) {
        fetchProductDetail(navState.id.toString());
     }
  }, [navState.mode, navState.id, fetchProductDetail]);

  const updateField = (field: keyof Product, value: any) => {
     setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (name: string) => {
     setFormData(prev => {
        const newData = { ...prev, name };
        if (navState.mode === 'create') {
            newData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
        return newData;
     });
  };

  const addArrayItem = <T,>(field: keyof Product, item: T) => {
     setFormData(prev => ({ ...prev, [field]: [...(prev[field] as T[] || []), item] }));
  };

  const removeArrayItem = (field: keyof Product, index: number) => {
     setFormData(prev => ({ ...prev, [field]: (prev[field] as any[]).filter((_, i) => i !== index) }));
  };

  const updateArrayItem = (field: keyof Product, index: number, subField: string, value: any) => {
     setFormData(prev => {
        const arr = [...(prev[field] as any[])];
        arr[index] = { ...arr[index], [subField]: value };
        return { ...prev, [field]: arr };
     });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      setIsUploading(true);
      try {
          const publicId = await CloudinaryOptimizer.upload(file);
          const newImage = {
              id: `new_${Date.now()}`,
              url: publicId,
              alt: file.name.split('.')[0],
              display_order: (formData.images?.length || 0) + 1
          };
          
          addArrayItem('images', newImage);
          if (!formData.image && (!formData.images || formData.images.length === 0)) {
              updateField('image', publicId);
          }
          addToast("Image uploaded successfully", 'success');
      } catch (error: any) {
          addToast(`Upload failed: ${error.message}`, 'error');
      } finally {
          setIsUploading(false);
          e.target.value = ''; 
      }
  };

  const formatPrice = (val: number) => {
    return `${currency.symbol}${(val * currency.rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.checked) setSelectedProducts(products.map(p => p.id));
     else setSelectedProducts([]);
  };

  const handleSelectOne = (id: string) => {
     if (selectedProducts.includes(id)) setSelectedProducts(selectedProducts.filter(pid => pid !== id));
     else setSelectedProducts([...selectedProducts, id]);
  };

  const handleBulkAction = async (action: string) => {
     if (selectedProducts.length === 0) return;

     if (action === 'Edit Price') {
         setIsBulkPriceModalOpen(true);
         return;
     }

     const confirmed = await confirm({
        title: `Bulk ${action}`,
        description: `Are you sure you want to ${action.toLowerCase()} ${selectedProducts.length} products?`,
        confirmText: 'Yes, proceed',
        variant: action === 'Delete' ? 'danger' : 'default'
     });

     if (confirmed) {
        try {
            if (action === 'Delete') {
                await supabase.from('products').delete().in('id', selectedProducts);
                await logAuditAction('Bulk Delete Products', `${selectedProducts.length} products removed`);
                addToast(`${selectedProducts.length} products deleted`, 'success');
                setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
                setSelectedProducts([]);
            } else if (action === 'Set Active') {
                await supabase.from('products').update({ status: 'Active' }).in('id', selectedProducts);
                await logAuditAction('Bulk Status Update', `Set ${selectedProducts.length} products to Active`);
                addToast('Products set to Active', 'success');
                fetchProducts();
            } else if (action === 'Set Draft') {
                await supabase.from('products').update({ status: 'Draft' }).in('id', selectedProducts);
                await logAuditAction('Bulk Status Update', `Set ${selectedProducts.length} products to Draft`);
                addToast('Products set to Draft', 'success');
                fetchProducts();
            } else if (action === 'Archive') {
                await supabase.from('products').update({ status: 'Archived' }).in('id', selectedProducts);
                await logAuditAction('Bulk Status Update', `Archived ${selectedProducts.length} products`);
                addToast('Products archived', 'success');
                fetchProducts();
            }
        } catch (error: any) {
            addToast('Bulk action failed: ' + error.message, 'error');
        }
     }
  };

  const applyBulkPriceUpdate = async () => {
      if (selectedProducts.length === 0) return;
      
      const val = parseFloat(bulkPriceValue);
      if (isNaN(val)) {
          addToast('Invalid price value', 'error');
          return;
      }

      try {
          setIsBulkPriceModalOpen(false);
          addToast('Applying price updates...', 'info');

          if (bulkPriceAction === 'set_fixed') {
              await supabase.from('products').update({ price: val }).in('id', selectedProducts);
          } else {
              const multiplier = bulkPriceAction === 'increase_percent' ? (1 + val/100) : (1 - val/100);
              const updates = products
                  .filter(p => selectedProducts.includes(p.id))
                  .map(p => ({
                      id: p.id,
                      price: parseFloat((p.price * multiplier).toFixed(2))
                  }));

              for (const update of updates) {
                  await supabase.from('products').update({ price: update.price }).eq('id', update.id);
              }
          }
          
          await logAuditAction('Bulk Price Update', `Updated prices for ${selectedProducts.length} products`, { action: bulkPriceAction, value: val });
          addToast('Bulk price update complete', 'success');
          fetchProducts();
          setSelectedProducts([]);
      } catch (error: any) {
          addToast('Bulk update failed: ' + error.message, 'error');
      }
  };

  const generateVariants = () => {
    if (!formData.options || formData.options.length === 0) return;
    
    const cartesian = (a: string[][], b: string[]): string[][] => {
        const result: string[][] = [];
        a.forEach((aItem) => {
            b.forEach((bItem) => {
                result.push([...aItem, bItem]);
            });
        });
        return result;
    };

    const optionValues = formData.options.map(opt => opt.values);
    let normalizedCombos: string[][];

    if (optionValues.length === 0) {
        normalizedCombos = [];
    } else if (optionValues.length === 1) {
        normalizedCombos = optionValues[0].map(v => [v]);
    } else {
        const head = optionValues[0].map(v => [v]);
        const tail = optionValues.slice(1);
        normalizedCombos = tail.reduce((acc, curr) => cartesian(acc, curr), head);
    }

    const newVariants: ProductVariant[] = normalizedCombos.map((combo: string[]) => {
       const name = combo.join(' / ');
       return {
          id: `new_${Math.random()}`, 
          name: name,
          sku: `${formData.slug?.toUpperCase()}-${combo.map(s => s.substring(0,3)).join('').toUpperCase()}`,
          price: formData.price,
          stock: 0,
          cost_price: 0,
          options: {} 
       };
    });

    updateField('variants', newVariants);
    addToast('Variants generated successfully', 'success');
  };

  const handlePartialSave = async (dataToUpdate: Record<string, any>, successMessage: string) => {
      if (!formData.id || !supabase) return;
      
      const confirmed = await confirm({
          title: 'Save Changes',
          description: 'Are you sure you want to save changes to this section?',
          confirmText: 'Yes, Save'
      });

      if (!confirmed) return;

      setIsSaving(true);
      try {
          const { error } = await supabase.from('products').update(dataToUpdate).eq('id', formData.id).select();
          if (error) throw error;
          
          await logAuditAction('Update Product', formData.name, { updated_fields: Object.keys(dataToUpdate) });
          addToast(successMessage, 'success');
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleDoneEditing = async () => {
      const confirmed = await confirm({
          title: 'Finish Editing?',
          description: 'Any unsaved changes will be lost. Are you sure you are done?',
          confirmText: 'Yes, Leave',
          cancelText: 'Stay'
      });
      
      if (confirmed) {
          onNavigate('products', undefined, 'list');
      }
  };

  const saveBasicInfo = () => {
      handlePartialSave({
          name: formData.name,
          subtitle: formData.subtitle,
          description: formData.description,
          long_description: formData.long_description,
          slug: formData.slug
      }, 'Basic info updated');
  };

  const saveIngredients = () => {
      const cleanKeyIngredients = formData.key_ingredients?.map(k => ({
          name: k.name || '',
          description: k.description || '',
          image: k.image || ''
      }));
      const cleanBenefits = formData.benefits?.map(b => ({
          title: b.title || '',
          description: b.description || ''
      }));

      handlePartialSave({
          full_ingredients: formData.full_ingredients,
          key_ingredients: cleanKeyIngredients,
          benefits: cleanBenefits
      }, 'Ingredients & Benefits updated');
  };

  const saveMedia = async () => {
      if (!formData.id || !supabase) return;
      if (!await confirm({ title: 'Save Media', description: 'Save image changes?', confirmText: 'Save' })) return;

      setIsSaving(true);
      try {
          if (formData.images) {
            for (const img of formData.images) {
                const payload = {
                    product_id: formData.id,
                    image_url: img.url,
                    alt_text: img.alt,
                    display_order: img.display_order
                };
                if (img.id && !img.id.startsWith('new_') && !String(img.id).match(/^\d+$/)) { 
                    await supabase.from('product_images').update(payload).eq('id', img.id);
                } else {
                    await supabase.from('product_images').insert(payload);
                }
            }
          }
          const { error } = await supabase.from('products').update({
              image_url: formData.image || formData.images?.[0]?.url || '',
              hover_image_url: formData.hover_image_url,
              swatch_image_url: formData.swatch_image_url
          }).eq('id', formData.id).select();
          
          if (error) throw error;
          await logAuditAction('Update Product Media', formData.name);
          addToast('Media updated', 'success');
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const saveVariants = async () => {
      if (!formData.id || !supabase) return;
      
      if (!await confirm({ title: 'Save Variants', description: 'Overwrite existing variants? This action will update inventory counts.', confirmText: 'Save' })) return;

      setIsSaving(true);
      try {
        if (formData.options) {
            for (const opt of formData.options) {
                let optId = opt.id.startsWith('var_') || opt.id.startsWith('new_') ? undefined : opt.id;
                let savedOptId = optId;
                if (!optId) {
                    const { data } = await supabase.from('product_options').insert({ product_id: formData.id, name: opt.name }).select('id').single();
                    savedOptId = data?.id;
                } else {
                    await supabase.from('product_options').update({ name: opt.name }).eq('id', optId);
                }
                if (savedOptId) {
                    await supabase.from('product_option_values').delete().eq('option_id', savedOptId);
                    const valuesPayload = opt.values.map(v => ({ option_id: savedOptId, value: v }));
                    await supabase.from('product_option_values').insert(valuesPayload);
                }
            }
        }
        
        let conflictDetected = false;

        if (formData.variants) {
            for (const v of formData.variants) {
                const payload = {
                    product_id: formData.id,
                    sku: v.sku,
                    price: v.price,
                    cost_price: v.cost_price,
                    inventory_count: v.stock,
                    stripe_price_id: v.stripe_price_id
                };
                
                if (v.id && !v.id.startsWith('var_') && !v.id.startsWith('new_')) {
                    // Optimistic Concurrency Control (OCC) Check
                    // Only update if updated_at matches what we loaded initially
                    // We assume Supabase table has `updated_at` column which auto-updates on modification
                    
                    const { data, error } = await supabase.from('product_variants')
                        .update(payload)
                        .eq('id', v.id)
                        .eq('updated_at', v.updated_at) // LOCK: If timestamp changed, this returns 0 rows
                        .select();

                    if (error) throw error;
                    
                    if (!data || data.length === 0) {
                        conflictDetected = true;
                        console.warn(`Version conflict for variant ${v.sku}`);
                    }
                } else {
                    await supabase.from('product_variants').insert(payload);
                }
            }
        }

        if (conflictDetected) {
            addToast('Some updates failed because another admin modified the data. Please refresh and try again.', 'error');
            // Optionally force refresh here
            fetchProductDetail(formData.id);
        } else {
            await logAuditAction('Update Product Variants', formData.name);
            addToast('Variants updated successfully', 'success');
            // Refresh to get new timestamps
            fetchProductDetail(formData.id);
        }

      } catch (error: any) {
          addToast('Error saving variants: ' + error.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const saveOrganization = () => {
      let categoryId = formData.category_id;
      if (!categoryId && formData.category) {
          const cat = categories.find(c => c.name === formData.category);
          categoryId = cat?.id;
      }
      handlePartialSave({
          category_id: categoryId,
          status: formData.status
      }, 'Organization settings updated');
  };

  const savePricing = () => {
      handlePartialSave({
          price: formData.price,
          compare_at_price: formData.compare_at_price,
          color_hex: formData.color_hex
      }, 'Pricing updated');
  };

  const saveSEO = () => {
      handlePartialSave({
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          slug: formData.slug
      }, 'SEO settings updated');
  };

  const handleCreateProduct = async () => {
     if (!formData.name || formData.price <= 0) {
        addToast('Please fill in product name and price', 'error');
        return;
     }
     if (!supabase) return;

     setIsSaving(true);
     try {
        let categoryId = formData.category_id;
        if (!categoryId && formData.category) {
            const cat = categories.find(c => c.name === formData.category);
            categoryId = cat?.id;
        }

        const productPayload = {
            name: formData.name,
            slug: formData.slug,
            subtitle: formData.subtitle,
            description: formData.description,
            long_description: formData.long_description,
            price: formData.price,
            compare_at_price: formData.compare_at_price,
            category_id: categoryId,
            subcategory: formData.subcategory,
            image_url: formData.image || formData.images?.[0]?.url || '',
            status: formData.status,
            meta_title: formData.meta_title,
            meta_description: formData.meta_description
        };

        const { data, error } = await supabase.from('products').insert(productPayload).select('id').single();
        if (error) throw error;
        
        await logAuditAction('Create Product', formData.name);
        addToast("Product Created Successfully!", 'success');
        onNavigate('products', data.id, 'edit');

     } catch (error: any) {
        console.error("Save Error:", error);
        addToast("Failed to create product: " + error.message, 'error');
     } finally {
        setIsSaving(false);
     }
  };

  if (['create', 'edit', 'detail'].includes(navState.mode || '')) {
     const isDetail = navState.mode === 'detail';
     const isCreate = navState.mode === 'create';
     const isEdit = navState.mode === 'edit';
     
     if (detailLoading) {
         return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
     }

     return (
       <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
         <Breadcrumbs items={[
            { label: 'Products', onClick: () => onNavigate('products', undefined, 'list') },
            { label: navState.mode === 'create' ? 'Add Product' : formData.name }
         ]} />

         <div className="flex items-center justify-between sticky top-0 bg-brand-light dark:bg-[#171717] z-30 py-4 border-b border-gray-200/50 dark:border-gray-800 backdrop-blur-sm">
           <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => onNavigate('products', undefined, 'list')}>
                 <ArrowLeft size={20} className="mr-2"/> Back
              </Button>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit hidden md:block">{navState.mode === 'create' ? 'Add Product' : formData.name}</h1>
              {formData.status && <Badge className="hidden md:inline-flex">{formData.status}</Badge>}
           </div>
           
           {isCreate && (
             <div className="flex gap-2">
               <Button variant="outline" onClick={() => onNavigate('products', undefined, 'list')}>Discard</Button>
               <Button onClick={handleCreateProduct} isLoading={isSaving}>
                  <Save size={16} className="mr-2"/> Create Product
               </Button>
             </div>
           )}

           {isEdit && (
              <Button variant="outline" onClick={handleDoneEditing}>
                 Done Editing
              </Button>
           )}

           {isDetail && (
              <Button onClick={() => onNavigate('products', formData.id, 'edit')}>
                 <Edit size={16} className="mr-2" /> Edit
              </Button>
           )}
         </div>

         <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex gap-8 min-w-max">
               {['general', 'variants', 'media', 'content', 'seo', 'related'].map(tab => (
                  <button 
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-brand-accent text-brand-primary dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
                  >
                     {tab}
                  </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {activeTab === 'general' && (
                    <ProductGeneralTab 
                        formData={formData}
                        updateField={updateField}
                        updateArrayItem={updateArrayItem}
                        addArrayItem={addArrayItem}
                        removeArrayItem={removeArrayItem}
                        handleNameChange={handleNameChange}
                        isDetail={isDetail}
                        onSaveBasic={isEdit ? saveBasicInfo : undefined}
                        onSaveIngredients={isEdit ? saveIngredients : undefined}
                        isSaving={isSaving}
                    />
                )}
                {activeTab === 'variants' && (
                    <ProductVariantsTab 
                        formData={formData}
                        updateArrayItem={updateArrayItem}
                        removeArrayItem={removeArrayItem}
                        addArrayItem={addArrayItem}
                        generateVariants={generateVariants}
                        isDetail={isDetail}
                        onSave={isEdit ? saveVariants : undefined}
                        isSaving={isSaving}
                    />
                )}
                {/* ... other tabs same as before ... */}
                {activeTab === 'media' && (
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Product Images</CardTitle>
                            {isEdit && (
                                <Button 
                                    variant="secondary" 
                                    onClick={saveMedia} 
                                    isLoading={isSaving} 
                                    className="h-11 px-6 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                                >
                                    <Save size={20} className="mr-2"/> SAVE MEDIA
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {formData.images?.map((img, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col group relative">
                                    <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                                        <img 
                                            src={CloudinaryOptimizer.url(img.url, { width: 300, crop: 'fill' })} 
                                            className="w-full h-full object-cover" 
                                            alt={img.alt} 
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Invalid+ID'; }}
                                        />
                                        {!isDetail && <button onClick={() => removeArrayItem('images', idx)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>}
                                    </div>
                                    <div className="p-2 space-y-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-400">Public ID / URL</label>
                                            <input 
                                                disabled={isDetail} 
                                                className="w-full text-xs p-1.5 border rounded bg-white dark:bg-[#333] dark:border-gray-600 text-gray-900 dark:text-white" 
                                                value={img.url} 
                                                onChange={(e) => updateArrayItem('images', idx, 'url', e.target.value)} 
                                                placeholder="e.g. lipstick_01"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-400">Alt Text</label>
                                            <input 
                                                disabled={isDetail} 
                                                className="w-full text-xs p-1.5 border rounded bg-white dark:bg-[#333] dark:border-gray-600 text-gray-900 dark:text-white" 
                                                value={img.alt} 
                                                onChange={(e) => updateArrayItem('images', idx, 'alt', e.target.value)} 
                                                placeholder="Alt text"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!isDetail && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors relative min-h-[120px]">
                                        {isUploading ? (
                                            <Loader2 size={24} className="animate-spin text-brand-primary" />
                                        ) : (
                                            <>
                                                <ImageIcon size={24} className="mb-2" />
                                                <span className="text-xs font-medium">Upload File</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={handleImageUpload}
                                                />
                                            </>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => addArrayItem('images', { id: `new_${Date.now()}`, url: '', alt: '', display_order: (formData.images?.length || 0) + 1 })}
                                        className="h-12 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-brand-primary dark:text-white font-medium text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-2"
                                    >
                                        <Type size={14} /> Add by ID/URL
                                    </button>
                                </div>
                            )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Hover Image URL</label>
                                <div className="flex gap-2">
                                    <input disabled={isDetail} type="text" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.hover_image_url || ''} onChange={(e) => updateField('hover_image_url', e.target.value)} />
                                    {formData.hover_image_url && <img src={CloudinaryOptimizer.url(formData.hover_image_url, { width: 50 })} className="w-10 h-10 rounded border object-cover" alt="hover" />}
                                </div>
                            </div>
                                <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Swatch Image URL</label>
                                <div className="flex gap-2">
                                    <input disabled={isDetail} type="text" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.swatch_image_url || ''} onChange={(e) => updateField('swatch_image_url', e.target.value)} />
                                    {formData.swatch_image_url && <img src={CloudinaryOptimizer.url(formData.swatch_image_url, { width: 50 })} className="w-10 h-10 rounded border object-cover" alt="swatch" />}
                                </div>
                            </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {activeTab === 'content' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Highlights Section</CardTitle>
                            {!isDetail && <Button size="sm" variant="outline" onClick={() => addArrayItem<ProductHighlight>('highlights', {title: '', description: '', image: '', display_order: 0})}><Plus size={14}/> Add Highlight</Button>}
                            </CardHeader>
                            <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Section Heading</label>
                                <input disabled={isDetail} type="text" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.highlights_heading || ''} onChange={(e) => updateField('highlights_heading', e.target.value)} />
                            </div>
                            <div className="space-y-4">
                                {formData.highlights?.map((hl, idx) => (
                                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg flex gap-4">
                                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded shrink-0 flex items-center justify-center text-gray-400">
                                            {hl.image ? <img src={CloudinaryOptimizer.url(hl.image, {width: 100})} className="w-full h-full object-cover rounded"/> : <ImageIcon size={20}/>}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                        <input disabled={isDetail} placeholder="Title" className="w-full p-1.5 text-sm border dark:border-gray-600 rounded font-medium bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={hl.title} onChange={(e) => updateArrayItem('highlights', idx, 'title', e.target.value)} />
                                        <textarea disabled={isDetail} placeholder="Description" className="w-full p-1.5 text-sm border dark:border-gray-600 rounded resize-none bg-white dark:bg-[#333] text-gray-900 dark:text-white" rows={2} value={hl.description} onChange={(e) => updateArrayItem('highlights', idx, 'description', e.target.value)} />
                                        <input disabled={isDetail} placeholder="Image URL" className="w-full p-1.5 text-xs border dark:border-gray-600 rounded bg-white dark:bg-[#333] text-gray-500" value={hl.image} onChange={(e) => updateArrayItem('highlights', idx, 'image', e.target.value)} />
                                        </div>
                                        {!isDetail && <button onClick={() => removeArrayItem('highlights', idx)}><X size={16} className="text-gray-400 hover:text-red-500"/></button>}
                                    </div>
                                ))}
                            </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                {activeTab === 'seo' && (
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Search Engine Optimization</CardTitle>
                            {isEdit && (
                                <Button 
                                    variant="secondary" 
                                    onClick={saveSEO} 
                                    isLoading={isSaving} 
                                    className="h-11 px-6 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                                >
                                    <Save size={20} className="mr-2"/> SAVE SEO
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Globe size={14}/> Google Search Preview</h4>
                            <div className="bg-white dark:bg-[#262626] p-4 rounded shadow-sm max-w-xl border dark:border-gray-700">
                                <div className="text-xs text-[#202124] dark:text-gray-300 flex items-center gap-1 mb-1">
                                    <span>momohbeauty.com</span> 
                                    <span className="text-gray-400">›</span> 
                                    <span>products</span>
                                    <span className="text-gray-400">›</span>
                                    <span>{formData.slug || 'product-slug'}</span>
                                </div>
                                <div className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer font-medium mb-1 truncate">
                                    {formData.meta_title || formData.name || 'Product Title'}
                                </div>
                                <div className="text-sm text-[#4d5156] dark:text-gray-400 line-clamp-2">
                                    {formData.meta_description || formData.description || 'Product description will appear here...'}
                                </div>
                            </div>
                            </div>
                            
                            <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Meta Title</label>
                                <input disabled={isDetail} type="text" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.meta_title || ''} onChange={(e) => updateField('meta_title', e.target.value)} maxLength={60} />
                                <div className="text-xs text-right text-gray-400">{(formData.meta_title?.length || 0)}/60</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Meta Description</label>
                                <textarea disabled={isDetail} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg h-24 resize-none bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.meta_description || ''} onChange={(e) => updateField('meta_description', e.target.value)} maxLength={160}></textarea>
                                <div className="text-xs text-right text-gray-400">{(formData.meta_description?.length || 0)}/160</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">URL Slug</label>
                                <div className="flex">
                                    <span className="p-2 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500 dark:text-gray-300 text-sm">/products/</span>
                                    <input disabled={isDetail} type="text" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.slug || ''} onChange={(e) => updateField('slug', e.target.value)} />
                                </div>
                            </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <CardTitle>Publishing</CardTitle>
                        </div>
                        {isEdit && (
                            <Button 
                                variant="secondary" 
                                onClick={saveOrganization} 
                                isLoading={isSaving} 
                                className="w-full h-10 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                            >
                                <Save size={18} className="mr-2"/> SAVE
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Status</label>
                    <select disabled={isDetail} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.status} onChange={(e) => updateField('status', e.target.value)}>
                        <option>Active</option>
                        <option>Draft</option>
                        <option>Archived</option>
                        <option>Low Stock</option>
                        <option>Out of Stock</option>
                    </select>
                    </div>
                </CardContent>
            </Card>

            {/* Organization and Pricing Cards (unchanged from previous) */}
            {/* ... */}
            
            <Card>
                <CardHeader className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <CardTitle>Organization</CardTitle>
                        </div>
                        {isEdit && (
                            <Button 
                                variant="secondary" 
                                onClick={saveOrganization} 
                                isLoading={isSaving} 
                                className="w-full h-10 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                            >
                                <Save size={18} className="mr-2"/> SAVE
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Category</label>
                    <select disabled={isDetail} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.category} onChange={(e) => updateField('category', e.target.value)}>
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <CardTitle>Pricing & Visuals</CardTitle>
                        </div>
                        {isEdit && (
                            <Button 
                                variant="secondary" 
                                onClick={savePricing} 
                                isLoading={isSaving} 
                                className="w-full h-10 border-2 border-brand-accent/50 text-brand-primary font-bold hover:bg-brand-accent hover:text-white dark:bg-gray-800 dark:text-white dark:border-brand-accent dark:hover:bg-brand-accent transition-all shadow-sm"
                            >
                                <Save size={18} className="mr-2"/> SAVE
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Price (Base USD)</label>
                        <input disabled={isDetail} type="number" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.price} onChange={(e) => updateField('price', Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Compare At</label>
                        <input disabled={isDetail} type="number" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.compare_at_price || ''} onChange={(e) => updateField('compare_at_price', Number(e.target.value))} />
                    </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                    Converted: {formatPrice(formData.price)}
                    </div>
                    <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Color Hex</label>
                    <div className="flex gap-2">
                        <input disabled={isDetail} type="color" className="w-10 h-10 p-1 rounded border cursor-pointer" value={formData.color_hex || '#ffffff'} onChange={(e) => updateField('color_hex', e.target.value)} />
                        <input disabled={isDetail} type="text" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg uppercase bg-white dark:bg-[#333] text-gray-900 dark:text-white" value={formData.color_hex || ''} onChange={(e) => updateField('color_hex', e.target.value)} />
                    </div>
                    </div>
                </CardContent>
            </Card>
            </div>
         </div>
       </div>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Products</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your product catalog.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => onNavigate('products', undefined, 'create')}>
               <Plus size={18} className="mr-2" /> Add Product
            </Button>
        </div>
      </div>
      
      {/* ... List View logic remains similar ... */}
      <Card className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input 
                   type="text" 
                   placeholder="Search Products by name, SKU..." 
                   className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                   value={searchTerm}
                   onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                   onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                 />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                  <select 
                     className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                     value={categoryFilter}
                     onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  >
                     <option value="All">All Categories</option>
                     {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select 
                     className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                     value={stockFilter}
                     onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
                  >
                     <option value="All">All Stock</option>
                     <option value="In Stock">In Stock</option>
                     <option value="Low Stock">Low Stock</option>
                     <option value="Out of Stock">Out of Stock</option>
                  </select>
                  <Button variant="outline" className={`border-gray-200 dark:border-gray-600 ${showFeaturedOnly ? 'bg-brand-light border-brand-accent text-brand-primary dark:bg-gray-800' : 'text-gray-700 dark:text-gray-300'}`} onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}>
                     <Star size={16} className={`mr-2 ${showFeaturedOnly ? 'fill-current' : ''}`} /> Featured
                  </Button>
              </div>
          </div>
      </Card>

      {selectedProducts.length > 0 && (
         <div className="bg-brand-light dark:bg-gray-800 border border-brand-accent/20 dark:border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between animate-in fade-in slide-in-from-top-2 gap-3">
             <div className="flex items-center gap-2">
                <span className="bg-brand-primary dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-2 py-0.5 rounded">{selectedProducts.length}</span>
                <span className="text-sm font-medium text-brand-primary dark:text-white">products selected</span>
             </div>
             <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" variant="outline" className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" onClick={() => handleBulkAction('Set Active')}>Set Active</Button>
                <Button size="sm" variant="outline" className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" onClick={() => handleBulkAction('Set Draft')}>Set Draft</Button>
                <Button size="sm" variant="outline" className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" onClick={() => handleBulkAction('Edit Price')}>Edit Price</Button>
                <Button size="sm" variant="outline" className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" onClick={() => handleBulkAction('Archive')}>Archive</Button>
                <Button size="sm" variant="outline" className="bg-white text-red-600 border-red-200 hover:bg-red-50 dark:bg-gray-700 dark:text-red-400 dark:border-red-900/50" onClick={() => handleBulkAction('Delete')}>Delete</Button>
             </div>
         </div>
      )}

      <Card className="overflow-hidden hidden md:block">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                     <th className="p-4 w-4">
                        <input 
                           type="checkbox" 
                           className="rounded border-gray-300 dark:border-gray-600 w-4 h-4 text-brand-primary focus:ring-brand-primary"
                           onChange={handleSelectAll}
                           checked={products.length > 0 && selectedProducts.length === products.length}
                        />
                     </th>
                     <th className="px-6 py-3">Product</th>
                     <th className="px-6 py-3">Category</th>
                     <th className="px-6 py-3">Status</th>
                     <th className="px-6 py-3">Stock</th>
                     <th className="px-6 py-3">Price ({currency.code})</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                      Array(5).fill(0).map((_, i) => (
                          <tr key={i}>
                              <td colSpan={7} className="p-4"><Skeleton className="h-8 w-full" /></td>
                          </tr>
                      ))
                  ) : products.length > 0 ? products.map(product => (
                     <tr key={product.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${selectedProducts.includes(product.id) ? 'bg-brand-light/30 dark:bg-gray-800' : ''}`} onClick={() => onNavigate('products', product.id, 'detail')}>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                           <input 
                              type="checkbox" 
                              className="rounded border-gray-300 dark:border-gray-600 w-4 h-4 text-brand-primary focus:ring-brand-primary" 
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleSelectOne(product.id)}
                           />
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <img src={product.image} className="w-10 h-10 rounded object-cover bg-gray-100 dark:bg-gray-800" alt="" />
                              <div>
                                 <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                 <div className="flex items-center gap-2">
                                    {product.sku && <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>}
                                    {product.sku && <CopyButton text={product.sku} />}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.category}</td>
                        <td className="px-6 py-4">
                           <Badge variant={product.status === 'Active' ? 'success' : product.status === 'Draft' ? 'secondary' : 'warning'}>{product.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`text-sm font-medium ${product.stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                              {product.stock} units
                           </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatPrice(product.price)}</td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                           <div className="flex items-center justify-end gap-2">
                              <SimpleTooltip content="View Details">
                                <Button variant="ghost" size="sm" onClick={() => onNavigate('products', product.id, 'detail')}>
                                    <Eye size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white" />
                                </Button>
                              </SimpleTooltip>
                              <SimpleTooltip content="Edit Product">
                                <Button variant="ghost" size="sm" onClick={() => onNavigate('products', product.id, 'edit')}>
                                    <Edit size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white" />
                                </Button>
                              </SimpleTooltip>
                              <SimpleTooltip content="Delete Product">
                                <Button variant="ghost" size="sm" className="hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleBulkAction('Delete')}>
                                    <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" />
                                </Button>
                              </SimpleTooltip>
                           </div>
                        </td>
                     </tr>
                  )) : (
                     <tr><td colSpan={7} className="p-0">
                        <EmptyState 
                            icon={Package} 
                            title="No products found" 
                            description="Try adjusting your filters or search terms."
                            actionLabel="Clear Filters"
                            onAction={() => { setSearchTerm(''); setCategoryFilter('All'); setStatusFilter('All'); }}
                        />
                     </td></tr>
                  )}
               </tbody>
            </table>
         </div>

         <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
               Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
            </div>
            <div className="flex gap-2">
               <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft size={16}/></Button>
               <Button variant="outline" size="sm" disabled={currentPage * itemsPerPage >= totalCount} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16}/></Button>
            </div>
         </div>
      </Card>

      <div className="md:hidden space-y-4">
        {loading ? <Skeleton className="h-32 w-full" /> : 
         products.length > 0 ? products.map(product => (
            <Card key={product.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3" onClick={() => onNavigate('products', product.id, 'detail')}>
                    <img src={product.image} className="w-12 h-12 rounded object-cover bg-gray-100 dark:bg-gray-800" alt="" />
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</p>
                    </div>
                </div>
                
                <div className="flex justify-between items-center py-2 border-t border-b border-gray-100 dark:border-gray-700">
                    <Badge variant={product.status === 'Active' ? 'success' : product.status === 'Draft' ? 'secondary' : 'warning'}>{product.status}</Badge>
                    <span className="font-bold text-gray-900 dark:text-white">{formatPrice(product.price)}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${product.stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {product.stock} units
                    </span>
                    <Button variant="outline" size="sm" onClick={() => onNavigate('products', product.id, 'edit')}>Edit</Button>
                </div>
            </Card>
        )) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#262626] rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No products found.
            </div>
        )}
      </div>

      {isBulkPriceModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Content */}
            <div className="bg-white dark:bg-[#262626] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-gray-700">
               <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Bulk Price Update</h3>
                  <button onClick={() => setIsBulkPriceModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="space-y-2">
                     <label className="text-sm font-medium dark:text-gray-300">Action Type</label>
                     <select 
                        className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                        value={bulkPriceAction}
                        onChange={(e) => setBulkPriceAction(e.target.value as any)}
                     >
                        <option value="increase_percent">Increase by Percentage (%)</option>
                        <option value="decrease_percent">Decrease by Percentage (%)</option>
                        <option value="set_fixed">Set Fixed Price ({currency.symbol})</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium dark:text-gray-300">Value</label>
                     <input 
                        type="number" 
                        className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                        value={bulkPriceValue}
                        onChange={(e) => setBulkPriceValue(e.target.value)}
                     />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                     This will affect {selectedProducts.length} selected products.
                  </p>
               </div>

               <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800">
                  <Button variant="outline" onClick={() => setIsBulkPriceModalOpen(false)}>Cancel</Button>
                  <Button onClick={applyBulkPriceUpdate}>Apply Changes</Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
