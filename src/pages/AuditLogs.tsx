
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw, Search, Shield, User, Clock, Monitor, Loader2 } from 'lucide-react';
import type { AuditLog } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export const AuditLogsPage: React.FC = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
      setLoading(true);
      try {
          // 1. Fetch Logs
          const { data: logsData, error: logsError } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100); // Limit for performance

          if (logsError) throw logsError;
          if (!logsData) {
              setLogs([]);
              return;
          }

          // 2. Fetch User Details (Manual Join to avoid missing relations)
          const userIds = Array.from(new Set(logsData.map((l: any) => l.user_id).filter(Boolean)));
          let userMap: Record<string, { name: string, avatar: string }> = {};

          if (userIds.length > 0) {
              const { data: profiles } = await supabase
                  .from('admin_profiles')
                  .select('id, full_name, avatar_url')
                  .in('id', userIds);
              
              if (profiles) {
                  profiles.forEach((p: any) => {
                      userMap[p.id] = {
                          name: p.full_name || 'Unknown User',
                          avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'User')}&background=random`
                      };
                  });
              }
          }

          const mappedLogs: AuditLog[] = logsData.map((l: any) => {
              const user = userMap[l.user_id] || { name: 'System', avatar: '' };
              return {
                  id: l.id,
                  user: user.name,
                  user_avatar: user.avatar,
                  action: l.action,
                  target: l.target_resource || '-',
                  ip_address: l.ip_address || 'Unknown',
                  timestamp: l.created_at
              };
          });

          setLogs(mappedLogs);
      } catch (error: any) {
          console.error("Audit fetch error", error);
          addToast(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Row Renderer for Virtual List
  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
      const log = filteredLogs[index];
      return (
          <div style={style} className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-[25%] flex items-center gap-3">
                  {log.user_avatar ? (
                      <img src={log.user_avatar} className="w-8 h-8 rounded-full bg-gray-200" alt="" />
                  ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><User size={14}/></div>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{log.user}</span>
              </div>
              <div className="w-[30%] text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {log.action}
              </div>
              <div className="w-[20%] text-sm text-gray-500 dark:text-gray-400">
                  {log.target}
              </div>
              <div className="w-[15%] flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Monitor size={12}/> {log.ip_address}
              </div>
              <div className="w-[10%] text-right text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleDateString()}
              </div>
          </div>
      );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit flex items-center gap-2">
            <Shield size={24} className="text-brand-accent"/> Security Audit Logs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Immutable record of all administrative actions.</p>
        </div>
        <Button variant="ghost" onClick={fetchLogs}><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></Button>
      </div>

      <Card className="flex flex-col flex-1 overflow-hidden">
         <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl shrink-0">
            <div className="relative max-w-md">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-accent" 
                 placeholder="Search logs by user, action or target..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
         
         <div className="bg-white dark:bg-[#262626] border-b border-gray-100 dark:border-gray-700 px-6 py-3 flex text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
             <div className="w-[25%]">User</div>
             <div className="w-[30%]">Action</div>
             <div className="w-[20%]">Target</div>
             <div className="w-[15%]">IP Address</div>
             <div className="w-[10%] text-right">Date</div>
         </div>

         <div className="flex-1 min-h-0 bg-white dark:bg-[#262626]">
            {loading ? (
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-brand-primary" size={32} />
                </div>
            ) : filteredLogs.length > 0 ? (
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            height={height}
                            itemCount={filteredLogs.length}
                            itemSize={64}
                            width={width}
                        >
                            {Row}
                        </List>
                    )}
                </AutoSizer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-500">No logs found matching criteria.</div>
            )}
         </div>
      </Card>
    </div>
  );
};
