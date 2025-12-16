
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { ScheduledAction } from '../types';
import { CalendarClock, Plus, Trash2, CheckCircle, Clock, AlertTriangle, Play, Edit2, X, Save, RefreshCw, Loader2 } from 'lucide-react';
import { DatePicker } from '../components/ui/date-picker';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';

export const ScheduledActionsPage: React.FC = () => {
  const { addToast } = useToast();
  const [actions, setActions] = useState<ScheduledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newAction, setNewAction] = useState<Partial<ScheduledAction>>({
     type: 'Price Change',
     target_name: '',
     details: '',
     status: 'Pending'
  });
  const [scheduleDate, setScheduleDate] = useState<Date>();

  const fetchActions = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('scheduled_actions')
            .select('*')
            .order('scheduled_for', { ascending: true });
            
          if (error) throw error;
          
          const mappedActions: ScheduledAction[] = (data || []).map((a: any) => ({
              id: a.id,
              type: a.action_type,
              target_name: a.target_name,
              details: a.details,
              scheduled_date: a.scheduled_for,
              status: a.status
          }));
          
          setActions(mappedActions);
      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchActions();
  }, []);

  const filteredActions = actions.filter(action => {
     if (filter === 'All') return true;
     return action.status === filter;
  });

  const handleDelete = async (id: number) => {
     if (confirm('Are you sure you want to delete this scheduled action?')) {
        try {
            const { error } = await supabase.from('scheduled_actions').delete().eq('id', id);
            if (error) throw error;
            setActions(prev => prev.filter(a => a.id !== id));
            addToast('Action deleted successfully', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
     }
  };

  const handleRunNow = async (id: number) => {
     if (confirm('Execute this action immediately?')) {
        try {
            const { error } = await supabase.from('scheduled_actions').update({ status: 'Completed', executed_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'Completed' } : a));
            addToast('Action marked as executed', 'success');
        } catch (error: any) {
            addToast(error.message, 'error');
        }
     }
  };

  const handleOpenCreate = () => {
      setEditingId(null);
      setNewAction({ type: 'Price Change', target_name: '', details: '', status: 'Pending' });
      setScheduleDate(undefined);
      setIsModalOpen(true);
  };

  const handleOpenEdit = (action: ScheduledAction) => {
      setEditingId(action.id);
      setNewAction({
          type: action.type,
          target_name: action.target_name,
          details: action.details,
          status: action.status
      });
      setScheduleDate(new Date(action.scheduled_date));
      setIsModalOpen(true);
  };

  const handleSave = async () => {
     if (!newAction.target_name || !scheduleDate) {
        addToast('Please fill in all required fields', 'error');
        return;
     }
     
     setIsSaving(true);
     
     try {
         const payload = {
             action_type: newAction.type,
             target_name: newAction.target_name,
             details: newAction.details,
             scheduled_for: scheduleDate.toISOString(),
             status: newAction.status || 'Pending'
         };

         if (editingId) {
             const { error } = await supabase.from('scheduled_actions').update(payload).eq('id', editingId);
             if (error) throw error;
             addToast('Action updated successfully', 'success');
         } else {
             const { error } = await supabase.from('scheduled_actions').insert(payload);
             if (error) throw error;
             addToast('Action scheduled successfully', 'success');
         }
         
         setIsModalOpen(false);
         setNewAction({ type: 'Price Change', target_name: '', details: '', status: 'Pending' });
         setScheduleDate(undefined);
         setEditingId(null);
         fetchActions();
     } catch (error: any) {
         addToast(error.message, 'error');
     } finally {
         setIsSaving(false);
     }
  };

  const getStatusBadge = (status: string) => {
     switch(status) {
        case 'Pending': return <Badge variant="warning" className="flex items-center gap-1"><Clock size={10}/> Pending</Badge>;
        case 'Completed': return <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={10}/> Completed</Badge>;
        case 'Failed': return <Badge variant="error" className="flex items-center gap-1"><AlertTriangle size={10}/> Failed</Badge>;
        default: return <Badge>{status}</Badge>;
     }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit flex items-center gap-2">
            <CalendarClock size={24} className="text-brand-accent"/> Scheduled Actions
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Automate future tasks like sales, launches, and updates.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" onClick={fetchActions}><RefreshCw size={16}/></Button>
            <Button onClick={handleOpenCreate}>
                <Plus size={18} className="mr-2" /> Schedule New Action
            </Button>
        </div>
      </div>

      <Card>
         <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto bg-gray-50 dark:bg-gray-800 rounded-t-xl">
            {['All', 'Pending', 'Completed', 'Failed'].map(f => (
               <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-brand-primary text-white dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
               >
                  {f}
               </button>
            ))}
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                     <th className="px-6 py-4">Action Type</th>
                     <th className="px-6 py-4">Target</th>
                     <th className="px-6 py-4">Scheduled For</th>
                     <th className="px-6 py-4">Details</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                      <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-primary" /></td></tr>
                  ) : filteredActions.length > 0 ? filteredActions.map(action => (
                     <tr key={action.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{action.type}</td>
                        <td className="px-6 py-4 text-brand-primary dark:text-brand-accent">{action.target_name}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(action.scheduled_date).toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate" title={action.details}>{action.details || '-'}</td>
                        <td className="px-6 py-4">{getStatusBadge(action.status)}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                              {action.status === 'Pending' && (
                                 <Button variant="ghost" size="sm" onClick={() => handleRunNow(action.id)} title="Run Now">
                                    <Play size={16} className="text-green-600 hover:text-green-700"/>
                                 </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(action)} title="Edit">
                                 <Edit2 size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white"/>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(action.id)} title="Delete">
                                 <Trash2 size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"/>
                              </Button>
                           </div>
                        </td>
                     </tr>
                  )) : (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">No scheduled actions found.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </Card>

      {/* Schedule Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#262626] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-gray-700">
               <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{editingId ? 'Edit Action' : 'Schedule New Action'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="space-y-1">
                     <label className="text-sm font-medium dark:text-gray-300">Action Type</label>
                     <select 
                        className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        value={newAction.type}
                        onChange={(e) => setNewAction({...newAction, type: e.target.value as any})}
                     >
                        <option>Price Change</option>
                        <option>Product Launch</option>
                        <option>Start Sale</option>
                        <option>End Sale</option>
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-medium dark:text-gray-300">Target Name</label>
                     <input 
                        type="text" 
                        placeholder="Product or Category Name"
                        className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        value={newAction.target_name}
                        onChange={(e) => setNewAction({...newAction, target_name: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-medium dark:text-gray-300">Scheduled Date</label>
                     <DatePicker date={scheduleDate} setDate={setScheduleDate} className="w-full" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-medium dark:text-gray-300">Details / Notes</label>
                     <textarea 
                        className="w-full p-2 border dark:border-gray-600 rounded-lg resize-none h-20 bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        placeholder="Describe the action..."
                        value={newAction.details}
                        onChange={(e) => setNewAction({...newAction, details: e.target.value})}
                     />
                  </div>
                  {editingId && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium dark:text-gray-300">Status</label>
                        <select 
                            className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-[#333] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
                            value={newAction.status}
                            onChange={(e) => setNewAction({...newAction, status: e.target.value as any})}
                        >
                            <option>Pending</option>
                            <option>Completed</option>
                            <option>Failed</option>
                        </select>
                      </div>
                  )}
               </div>

               <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} isLoading={isSaving}>
                     <Save size={16} className="mr-2"/> {editingId ? 'Update' : 'Schedule'}
                  </Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
