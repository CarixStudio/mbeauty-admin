
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImportExportModal } from '../components/ui/ImportExportModal';
import { 
  Database, 
  Table as TableIcon, 
  Play, 
  Download, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Edit2, 
  Terminal, 
  ChevronRight, 
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';

// List of tables from your schema
const DB_TABLES = [
    'admin_notifications',
    'admin_profiles',
    'analytics_churn_snapshots',
    'analytics_cohort_retention',
    'analytics_heatmap_points',
    'analytics_page_stats',
    'analytics_sales_by_region',
    'analytics_sales_by_time',
    'analytics_traffic_sources',
    'audit_logs',
    'cart_items',
    'carts',
    'categories',
    'contact_inquiries',
    'customer_addresses',
    'customer_segment_snapshots',
    'customer_segments',
    'customers',
    'marketing_campaigns',
    'order_events',
    'order_items',
    'order_notes',
    'order_promotions',
    'order_returns',
    'orders',
    'product_components',
    'product_content_blocks',
    'product_highlights',
    'product_images',
    'product_option_values',
    'product_options',
    'product_variants',
    'product_waitlist',
    'products',
    'promotional_banners',
    'promotions',
    'related_products',
    'reviews',
    'scheduled_actions',
    'sentiment_snapshots',
    'shipping_rates',
    'store_settings',
    'subscribers',
    'user_sessions',
    'variant_option_values'
];

export const DatabasePage: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // ----------------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------------
  const [selectedTableName, setSelectedTableName] = useState<string>('products');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  // Table View State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [isNewRow, setIsNewRow] = useState(false);
  
  // SQL Query State
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM products LIMIT 5');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // ----------------------------------------------------------------------
  // DATA FETCHING
  // ----------------------------------------------------------------------
  const fetchTableData = async () => {
      setLoading(true);
      setEditingRowId(null);
      setIsNewRow(false);
      try {
          let query = supabase
            .from(selectedTableName)
            .select('*', { count: 'exact' });
            
          // Simple search implementation if search term exists
          if (searchTerm) {
              // Try to find a text column to search on. This is a heuristic.
              const textCols = ['name', 'title', 'email', 'description', 'id'];
              const searchFilter = textCols.map(col => `${col}.ilike.%${searchTerm}%`).join(',');
              // Note: OR filters might fail if columns don't exist, strictly speaking we should inspect schema first.
              // For robustness in this generic view, we might skip server-side search or implement it carefully.
              // We'll try strictly filtering by ID if it's a UUID, else generic name match if column exists.
              // For safety/simplicity in this generic view, we will just fetch recent and filter client side if small, or just fetch page.
              // Let's stick to pagination for now to ensure stability.
          }

          const from = page * pageSize;
          const to = from + pageSize - 1;

          // Default sort by created_at if it exists, else id
          // Since we don't know schema for sure, we try created_at, if fail, we assume default order
          const { data, count, error } = await query.range(from, to);

          if (error) throw error;
          
          setTableData(data || []);
          setTotalCount(count || 0);

      } catch (error: any) {
          addToast('Error loading table: ' + error.message, 'error');
          setTableData([]);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchTableData();
  }, [selectedTableName, page]);

  // ----------------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------------
  // Get columns from the first item, or empty if no items
  const columns = useMemo(() => {
    if (tableData.length === 0) return [];
    return Object.keys(tableData[0]);
  }, [tableData]);

  // Client-side filtering for current page
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    return tableData.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tableData, searchTerm]);

  const hasPrimaryKey = useMemo(() => {
      // Check if table has 'id' column for editing support
      if (tableData.length === 0) return true; // Assume yes until data loads
      return 'id' in tableData[0];
  }, [tableData]);

  // ----------------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------------
  const handleEditRow = (row: any) => {
    if (!hasPrimaryKey) {
        addToast("Cannot edit rows without an 'id' column in this view.", 'warning');
        return;
    }
    setEditingRowId(row.id);
    setEditFormData({ ...row });
    setIsNewRow(false);
  };

  const handleAddRow = () => {
    const newRow: any = {};
    columns.forEach(col => {
        if (col !== 'id' && col !== 'created_at' && col !== 'updated_at') {
            newRow[col] = '';
        }
    });
    // Temp ID
    const tempId = 'new_' + Date.now();
    setEditingRowId(tempId);
    setEditFormData(newRow);
    setTableData([ { ...newRow, id: tempId }, ...tableData]);
    setIsNewRow(true);
  };

  const handleCancelEdit = () => {
      if (isNewRow) {
          setTableData(prev => prev.filter(row => row.id !== editingRowId));
      }
      setEditingRowId(null);
      setEditFormData({});
      setIsNewRow(false);
  };

  const handleSaveRow = async () => {
    try {
        // Clean payload
        const payload = { ...editFormData };
        delete payload.id; // Don't update PK
        delete payload.created_at; // Let DB handle
        delete payload.updated_at; // Let DB handle

        // Fix JSON fields (simple heuristic: if it looks like JSON array/obj, parse it)
        Object.keys(payload).forEach(key => {
            if (typeof payload[key] === 'string' && (payload[key].startsWith('{') || payload[key].startsWith('['))) {
                try {
                    payload[key] = JSON.parse(payload[key]);
                } catch (e) {
                    // keep as string
                }
            }
        });

        if (isNewRow) {
            const { data, error } = await supabase.from(selectedTableName).insert(payload).select();
            if (error) throw error;
            
            // Replace temp row with real row
            setTableData(prev => [data[0], ...prev.filter(r => r.id !== editingRowId)]);
            addToast('Row inserted successfully', 'success');
        } else {
            const { error } = await supabase
                .from(selectedTableName)
                .update(payload)
                .eq('id', editingRowId);
            
            if (error) throw error;
            
            setTableData(prev => prev.map(r => r.id === editingRowId ? { ...r, ...editFormData } : r));
            addToast('Row updated successfully', 'success');
        }
        setEditingRowId(null);
        setEditFormData({});
        setIsNewRow(false);
    } catch (error: any) {
        addToast('Save failed: ' + error.message, 'error');
    }
  };

  const handleDeleteRow = async (id: string | number) => {
    if (!hasPrimaryKey) return;
    
    if (await confirm({ 
        title: 'Delete Row', 
        description: 'Are you sure you want to delete this record? This cannot be undone.',
        variant: 'danger'
    })) {
        try {
            const { error } = await supabase.from(selectedTableName).delete().eq('id', id);
            if (error) throw error;
            setTableData(prev => prev.filter(r => r.id !== id));
            addToast('Row deleted', 'success');
        } catch (error: any) {
            addToast('Delete failed: ' + error.message, 'error');
        }
    }
  };

  const handleRunQuery = () => {
    setQueryResult("Executing raw SQL from client is restricted. Please use the Table Editor or Supabase Dashboard for complex queries.");
  };

  const handleInputChange = (col: string, value: string) => {
     setEditFormData(prev => ({ ...prev, [col]: value }));
  };

  // ----------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 shrink-0 gap-4">
         <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Database Editor</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Direct CRUD access to application tables.</p>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setIsQueryPanelOpen(!isQueryPanelOpen)} className="w-full sm:w-auto">
               <Terminal size={16} className="mr-2"/> SQL Console
            </Button>
         </div>
      </div>

      {/* Main Layout - Column on mobile, Row on Large */}
      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0 overflow-hidden">
         
         {/* Sidebar: Tables List */}
         <Card className="w-full lg:w-64 flex flex-col shrink-0 max-h-48 lg:max-h-none">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl sticky top-0 z-10">
               <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Database size={14}/> Schema Tables
               </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
               {DB_TABLES.map(tableName => (
                  <button
                     key={tableName}
                     onClick={() => { setSelectedTableName(tableName); setPage(0); }}
                     className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                        selectedTableName === tableName 
                           ? 'bg-brand-primary text-white shadow-sm' 
                           : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                     }`}
                  >
                     <TableIcon size={14} className={selectedTableName === tableName ? 'text-brand-accent' : 'text-gray-400'} />
                     <span className="capitalize truncate flex-1">{tableName.replace(/_/g, ' ')}</span>
                  </button>
               ))}
            </div>
         </Card>

         {/* Main Content: Table Data */}
         <div className="flex-1 flex flex-col min-w-0 gap-4">
            
            {/* Query Runner Panel (Collapsible) */}
            {isQueryPanelOpen && (
               <Card className="shrink-0 bg-gray-900 border-gray-800 animate-in slide-in-from-top-4">
                  <CardHeader className="py-3 px-4 border-b border-gray-800 flex justify-between items-center">
                     <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Terminal size={14}/> SQL Query Editor
                     </div>
                     <button onClick={() => setIsQueryPanelOpen(false)} className="text-gray-500 hover:text-white"><X size={14}/></button>
                  </CardHeader>
                  <CardContent className="p-0">
                     <div className="flex flex-col md:flex-row">
                        <div className="flex-1">
                           <textarea 
                              className="w-full h-32 bg-transparent text-green-400 font-mono text-sm p-4 outline-none resize-none placeholder-gray-700"
                              value={sqlQuery}
                              onChange={(e) => setSqlQuery(e.target.value)}
                              spellCheck={false}
                           />
                        </div>
                        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-800 p-4 bg-black/20 text-xs font-mono text-gray-300">
                           <div className="uppercase text-gray-600 font-bold mb-2">Output</div>
                           <pre className="whitespace-pre-wrap">{queryResult || 'Ready to execute.'}</pre>
                        </div>
                     </div>
                     <div className="px-4 py-2 border-t border-gray-800 bg-gray-800/50 flex justify-end">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-none h-8" onClick={handleRunQuery}>
                           <Play size={12} className="mr-2 fill-current"/> Run Query
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            )}

            {/* Data Table */}
            <Card className="flex-1 flex flex-col overflow-hidden relative">
               {/* Toolbar */}
               <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row items-center justify-between gap-4 bg-white dark:bg-[#262626] rounded-t-xl">
                  <div className="flex items-center gap-2 w-full xl:w-auto">
                     <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">{selectedTableName.replace(/_/g, ' ')}</h3>
                     <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full whitespace-nowrap">{totalCount} records</span>
                     {!hasPrimaryKey && !loading && <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded ml-2"><AlertTriangle size={10}/> Read Only (No ID)</span>}
                  </div>
                  
                  <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
                     <div className="relative flex-1 xl:flex-none min-w-[200px]">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                           type="text" 
                           placeholder="Search current view..." 
                           className="pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full xl:w-48 focus:outline-none focus:border-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden xl:block"></div>
                     <Button size="sm" variant="outline" onClick={fetchTableData} disabled={loading}>
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""}/>
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => setIsExportOpen(true)}>
                        <Download size={14} className="mr-2"/> Export
                     </Button>
                     {hasPrimaryKey && (
                        <Button size="sm" onClick={handleAddRow} disabled={editingRowId !== null}>
                            <Plus size={14} className="mr-2"/> Add Row
                        </Button>
                     )}
                  </div>
               </div>

               {/* Grid */}
               <div className="flex-1 overflow-auto bg-white dark:bg-[#262626]">
                  {loading && tableData.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                          <Loader2 className="animate-spin text-brand-primary" size={32} />
                      </div>
                  ) : (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase sticky top-0 z-10 shadow-sm">
                            <tr>
                            <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 w-16 text-center font-mono">ID</th>
                            {columns.filter(c => c !== 'id').map(col => (
                                <th key={col} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold whitespace-nowrap min-w-[150px]">
                                    {col.replace(/_/g, ' ')}
                                </th>
                            ))}
                            <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-right sticky right-0 bg-gray-50 dark:bg-gray-800 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredData.length > 0 ? filteredData.map((row) => {
                            const isEditing = editingRowId === row.id;
                            const rowId = String(row.id || 'N/A').substring(0, 8);
                            return (
                                <tr key={row.id || Math.random()} className={`group transition-colors ${isEditing ? 'bg-brand-light/20 dark:bg-brand-accent/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 text-center select-all" title={String(row.id)}>{rowId}</td>
                                    {columns.filter(c => c !== 'id').map(col => (
                                        <td key={col} className="px-4 py-3 max-w-[300px] truncate">
                                        {isEditing ? (
                                            <input 
                                                type="text" 
                                                className="w-full p-1 text-sm border border-brand-accent/50 rounded bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                                                value={editFormData[col] !== undefined ? editFormData[col] : (typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col])}
                                                onChange={(e) => handleInputChange(col, e.target.value)}
                                            />
                                        ) : (
                                            <span className="text-gray-700 dark:text-gray-300" title={typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}>
                                                {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                            </span>
                                        )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-[#262626] group-hover:bg-gray-50 dark:group-hover:bg-gray-800 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-transparent">
                                        <div className="flex items-center justify-end gap-2">
                                        {isEditing ? (
                                            <>
                                                <button onClick={handleSaveRow} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors" title="Save">
                                                    <Save size={14} />
                                                </button>
                                                <button onClick={handleCancelEdit} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors" title="Cancel">
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : hasPrimaryKey && (
                                            <>
                                                <button onClick={() => handleEditRow(row)} className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-light dark:hover:bg-gray-700 rounded transition-colors" title="Edit">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                        </div>
                                    </td>
                                </tr>
                            );
                            }) : (
                            <tr>
                                <td colSpan={columns.length + 1} className="p-12 text-center text-gray-400 italic">
                                    No data found in table "{selectedTableName}".
                                </td>
                            </tr>
                            )}
                        </tbody>
                    </table>
                  )}
               </div>
               
               {/* Simple Pagination */}
               <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-2 bg-white dark:bg-[#262626]">
                   <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>&lt; Prev</Button>
                   <span className="text-xs text-gray-500 self-center">Page {page + 1}</span>
                   <Button size="sm" variant="ghost" disabled={(page + 1) * pageSize >= totalCount} onClick={() => setPage(p => p + 1)}>Next &gt;</Button>
               </div>
            </Card>
         </div>
      </div>

      <ImportExportModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        type="export" 
        entityName={`${selectedTableName} Table`} 
      />
    </div>
  );
};
