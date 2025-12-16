
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Plus, 
  Search, 
  Shield, 
  MoreVertical, 
  ArrowLeft, 
  Mail, 
  Clock, 
  Activity, 
  Lock, 
  CheckCircle, 
  Save, 
  X,
  Trash2,
  User,
  Edit,
  Loader2
} from 'lucide-react';
import type { AdminUser } from '../types';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';

export const AdminsPage: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Viewer' as AdminUser['role'] });

  // Detail View Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<AdminUser | null>(null);

  // Fetch real admins from Supabase
  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    if (!supabase) return; // Safety check
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedAdmins: AdminUser[] = data.map((profile: any) => ({
          id: profile.id,
          name: profile.full_name || 'Unknown User',
          email: profile.email || 'No email access', // Email might not be in profile table directly depending on schema
          role: profile.role || 'Viewer',
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'Admin')}&background=random`,
          last_active: profile.last_active ? new Date(profile.last_active).toLocaleString() : 'Never'
        }));
        setAdmins(mappedAdmins);
      }
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      addToast('Failed to load admin profiles', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter
  const filteredAdmins = admins.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleViewAdmin = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditForm(admin);
    setViewMode('detail');
    setIsEditing(false);
  };

  const handleDelete = async (id: string | number) => {
    if (await confirm({
        title: 'Remove Admin User',
        description: 'Are you sure you want to remove this admin profile? Note: This does not delete their Auth account, but removes their profile access.',
        confirmText: 'Remove Profile',
        variant: 'danger'
    })) {
      try {
        const { error } = await supabase
          .from('admin_profiles')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await logAuditAction('Delete Admin Profile', `ID: ${id}`);
        setAdmins(prev => prev.filter(a => a.id !== id));
        if (selectedAdmin?.id === id) setViewMode('list');
        addToast("Admin profile removed", "success");
      } catch (error: any) {
        addToast(error.message, "error");
      }
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await logAuditAction('Invite Admin', inviteForm.email, { role: inviteForm.role });
    setIsInviteModalOpen(false);
    setInviteForm({ name: '', email: '', role: 'Viewer' });
    addToast(`Invite simulation sent to ${inviteForm.email}. User needs to sign up.`, 'info');
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    
    try {
        const { error } = await supabase
            .from('admin_profiles')
            .update({
                full_name: editForm.name,
                role: editForm.role
            })
            .eq('id', editForm.id);

        if (error) throw error;

        await logAuditAction('Update Admin Profile', editForm.name, { role: editForm.role });
        setAdmins(prev => prev.map(a => a.id === editForm.id ? editForm : a));
        setSelectedAdmin(editForm);
        setIsEditing(false);
        addToast("Admin profile updated", "success");
    } catch (error: any) {
        addToast(error.message, "error");
    }
  };

  // Helper for mock activity log (We don't have real logs yet)
  const getActivityLog = (id: string | number) => [
    { action: 'Profile loaded', time: 'Just now' },
  ];

  // Helper for permissions based on role
  const getPermissions = (role: string) => {
    switch(role) {
      case 'Super Admin': return ['Full System Access', 'Manage Admins', 'Database Access', 'Billing'];
      case 'Admin': return ['Manage Orders', 'Manage Products', 'Manage Customers', 'View Analytics'];
      case 'Editor': return ['Edit Products', 'Manage Content', 'View Orders'];
      case 'Viewer': return ['View Analytics', 'View Products', 'Read Only Access'];
      default: return [];
    }
  };

  const inputClass = "w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-[#333] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all";

  // ----------------------------------------------------------------------
  // VIEW: DETAIL
  // ----------------------------------------------------------------------
  if (viewMode === 'detail' && selectedAdmin && editForm) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setViewMode('list')} title="Back to list">
                 <ArrowLeft size={20} className="mr-2"/> Back
              </Button>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent">
                 {isEditing ? 'Edit Profile' : 'Admin Profile'}
              </h1>
           </div>
           <div className="flex gap-2">
              {isEditing ? (
                 <>
                   <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                   <Button onClick={handleEditSave}><Save size={16} className="mr-2"/> Save Changes</Button>
                 </>
              ) : (
                 <>
                   <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/10" onClick={() => handleDelete(selectedAdmin.id)}>
                      <Trash2 size={16} className="mr-2"/> Remove User
                   </Button>
                   <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                 </>
              )}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Profile Card */}
           <div className="lg:col-span-1 space-y-6">
              <Card className="text-center p-6 border-t-4 border-t-brand-accent">
                 <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 border-4 border-white dark:border-[#262626] shadow-lg relative group">
                    <img src={selectedAdmin.avatar} alt={selectedAdmin.name} className="w-full h-full object-cover" />
                    {isEditing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                            <Edit size={24} className="text-white"/>
                        </div>
                    )}
                 </div>
                 {isEditing ? (
                    <div className="space-y-3 px-4">
                       <input 
                         className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-center font-bold bg-white dark:bg-[#333] text-gray-900 dark:text-white" 
                         value={editForm.name}
                         onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                       />
                       <select 
                         className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white"
                         value={editForm.role}
                         onChange={(e) => setEditForm({...editForm, role: e.target.value as AdminUser['role']})}
                       >
                          <option>Super Admin</option>
                          <option>Admin</option>
                          <option>Editor</option>
                          <option>Viewer</option>
                       </select>
                    </div>
                 ) : (
                    <>
                       <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedAdmin.name}</h2>
                       <div className="mt-2 flex justify-center">
                          <Badge variant={selectedAdmin.role === 'Super Admin' ? 'default' : 'secondary'}>{selectedAdmin.role}</Badge>
                       </div>
                    </>
                 )}
                 
                 <div className="mt-8 space-y-4 text-left border-t border-gray-100 dark:border-gray-700 pt-6">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                       <Mail size={16} className="text-gray-400"/>
                       <span>{selectedAdmin.email || 'Email hidden'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                       <Clock size={16} className="text-gray-400"/>
                       <span>Last active: {selectedAdmin.last_active}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                       <Shield size={16} className="text-gray-400"/>
                       <span>2FA Enabled</span>
                    </div>
                 </div>
              </Card>

              <Card>
                 <CardHeader><CardTitle>Permissions</CardTitle></CardHeader>
                 <CardContent>
                    <div className="space-y-2">
                       {getPermissions(isEditing ? editForm.role : selectedAdmin.role).map((perm, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                             <CheckCircle size={14} className="text-green-500" />
                             <span>{perm}</span>
                          </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>
           </div>

           {/* Activity Log */}
           <div className="lg:col-span-2">
              <Card>
                 <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
                 <CardContent>
                    <div className="space-y-6 pl-4 border-l-2 border-gray-100 dark:border-gray-700 ml-2">
                       {getActivityLog(selectedAdmin.id).map((log, i) => (
                          <div key={i} className="relative">
                             <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-[#262626]"></div>
                             <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.time}</p>
                          </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VIEW: LIST
  // ----------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent" title="Admin Users">Admin Users</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage team access and roles.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} title="Invite User">
           <Plus size={18} className="mr-2" /> Invite Admin
        </Button>
      </div>

      <Card>
         <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
             <div className="relative max-w-sm group">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-accent transition-colors" />
               <input 
                  type="text" 
                  placeholder="Search team members..." 
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
         <div className="overflow-x-auto">
            {loading ? (
                <div className="p-12 text-center flex flex-col items-center">
                    <Loader2 size={32} className="animate-spin text-brand-primary mb-2" />
                    <p className="text-sm text-gray-500">Loading profiles...</p>
                </div>
            ) : (
                <table className="w-full text-sm text-left">
                <thead className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                        <th className="px-6 py-4 font-semibold">User</th>
                        <th className="px-6 py-4 font-semibold">Role</th>
                        <th className="px-6 py-4 font-semibold">Last Active</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredAdmins.length > 0 ? filteredAdmins.map(admin => (
                        <tr key={admin.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => handleViewAdmin(admin)}>
                            <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <img src={admin.avatar} className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 border border-gray-100 dark:border-gray-600" alt="" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">{admin.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{admin.email}</p>
                                </div>
                            </div>
                            </td>
                            <td className="px-6 py-4">
                            <Badge variant={admin.role === 'Super Admin' ? 'default' : admin.role === 'Admin' ? 'secondary' : 'outline'}>
                                {admin.role}
                            </Badge>
                            </td>
                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${admin.last_active.includes('Just now') ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                {admin.last_active}
                            </td>
                            <td className="px-6 py-4 text-right">
                            <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical size={16} className="text-gray-400" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-1" onClick={(e) => e.stopPropagation()}>
                                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-200" onClick={() => handleViewAdmin(admin)}>
                                            <Edit size={14} /> Edit Profile
                                        </button>
                                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/10 rounded flex items-center gap-2 text-red-600" onClick={() => handleDelete(admin.id)}>
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </PopoverContent>
                            </Popover>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No admins found.</td></tr>
                    )}
                </tbody>
                </table>
            )}
         </div>
      </Card>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#262626] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
               <h3 className="font-bold text-lg text-gray-900 dark:text-white">Invite New Admin</h3>
               <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
               <div className="space-y-1">
                  <label className="text-sm font-medium dark:text-gray-300">Full Name</label>
                  <input 
                    className={inputClass}
                    placeholder="e.g. Jane Doe"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})}
                    required 
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-sm font-medium dark:text-gray-300">Email Address</label>
                  <input 
                    type="email" 
                    className={inputClass}
                    placeholder="jane@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                    required 
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-sm font-medium dark:text-gray-300">Role</label>
                  <select 
                     className={inputClass}
                     value={inviteForm.role}
                     onChange={(e) => setInviteForm({...inviteForm, role: e.target.value as AdminUser['role']})}
                  >
                     <option value="Admin">Admin</option>
                     <option value="Editor">Editor</option>
                     <option value="Viewer">Viewer</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                     {inviteForm.role === 'Admin' && "Can manage orders, products, and customers."}
                     {inviteForm.role === 'Editor' && "Can edit content and products only."}
                     {inviteForm.role === 'Viewer' && "Read-only access to analytics and products."}
                  </p>
               </div>
               
               <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                  <Button type="submit"><Mail size={16} className="mr-2"/> Send Invitation</Button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
