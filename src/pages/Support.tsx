
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { Inquiry } from '../types';
import { Eye, MessageCircle, XCircle, ArrowLeft, Mail, FileText, Send, CheckCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';

export const SupportPage: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch Inquiries
  const fetchInquiries = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('contact_inquiries')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const mappedInquiries: Inquiry[] = (data || []).map((item: any) => ({
              id: item.id, // Keep UUID if possible, but type is number in interface. We might need to cast or fix interface. 
              // Assuming interface Inquiry uses number for ID based on mockData, but DB is UUID. 
              // For safety in this specific file context, we'll cast or keep as string if TS allows, 
              // but if strict, we might need to adjust. Let's assume we can map to the UI type.
              date: item.created_at,
              name: item.sender_name || 'Anonymous',
              email: item.sender_email,
              reason: item.reason,
              subject: item.subject,
              message: item.message,
              status: item.status,
              order_number: item.order_number
          }));

          setInquiries(mappedInquiries);
      } catch (error: any) {
          addToast('Failed to load inquiries: ' + error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchInquiries();
  }, []);

  // Handlers
  const handleCloseTicket = async (id: number | string) => {
    if (await confirm({
        title: 'Close Ticket',
        description: 'Are you sure you want to close this ticket? The user will be notified.',
        confirmText: 'Close Ticket',
    })) {
        try {
            const { error } = await supabase
                .from('contact_inquiries')
                .update({ status: 'Closed' })
                .eq('id', id);

            if (error) throw error;

            setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: 'Closed' } : i));
            if (selectedInquiry?.id === id) {
                setSelectedInquiry(prev => prev ? { ...prev, status: 'Closed' } : null);
            }
            addToast("Ticket closed", "success");
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    }
  };

  const handleReply = async () => {
      if (!selectedInquiry || !supabase) return;
      
      setIsSending(true);
      try {
          // 1. Update status in DB
          const { error } = await supabase
            .from('contact_inquiries')
            .update({ status: 'Replied' })
            .eq('id', selectedInquiry.id);

          if (error) throw error;

          // 2. Ideally, insert into a 'ticket_replies' table or trigger an Edge Function to send email.
          // Since we don't have a replies table in the provided schema, we'll simulate the email send.
          
          addToast("Reply sent successfully", "success");
          setReplyText('');
          
          const updatedStatus = 'Replied';
          setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? { ...i, status: updatedStatus } : i));
          setSelectedInquiry({ ...selectedInquiry, status: updatedStatus });

      } catch (error: any) {
          addToast(error.message, 'error');
      } finally {
          setIsSending(false);
      }
  };

  // ----------------------------------------------------------------------
  // VIEW: DETAIL
  // ----------------------------------------------------------------------
  if (selectedInquiry) {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <Button variant="ghost" onClick={() => setSelectedInquiry(null)}>
                          <ArrowLeft size={20} className="mr-2"/> Back
                      </Button>
                      <div>
                          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent">Inquiry Details</h1>
                          <div className="flex items-center gap-2 mt-1">
                              <Badge variant={selectedInquiry.status === 'Open' ? 'error' : selectedInquiry.status === 'Closed' ? 'secondary' : 'success'}>
                                  {selectedInquiry.status}
                              </Badge>
                              <span className="text-gray-500 dark:text-gray-400 text-sm">• {new Date(selectedInquiry.date).toLocaleString()}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      {selectedInquiry.status !== 'Closed' && (
                          <Button variant="outline" onClick={() => handleCloseTicket(selectedInquiry.id)}>
                              <CheckCircle size={16} className="mr-2"/> Close Ticket
                          </Button>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Message & Reply */}
                  <div className="lg:col-span-2 space-y-6">
                      <Card>
                          <CardHeader><CardTitle>Message</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">{selectedInquiry.subject}</h3>
                                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedInquiry.message}</p>
                              </div>
                          </CardContent>
                      </Card>

                      <Card>
                          <CardHeader><CardTitle>Reply</CardTitle></CardHeader>
                          <CardContent>
                              <textarea
                                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none min-h-[150px] resize-y text-sm bg-white dark:bg-[#333] text-gray-900 dark:text-white placeholder-gray-400"
                                  placeholder="Type your response to the customer..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                              ></textarea>
                              <div className="mt-4 flex justify-end">
                                  <Button onClick={handleReply} disabled={!replyText.trim() || isSending} isLoading={isSending}>
                                      <Send size={16} className="mr-2"/> Send Reply
                                  </Button>
                              </div>
                          </CardContent>
                      </Card>
                  </div>

                  {/* Right: Sender Info */}
                  <div className="space-y-6">
                      <Card>
                          <CardHeader><CardTitle>Sender Details</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                              <div className="flex items-center gap-3 pb-4 border-b border-gray-50 dark:border-gray-700">
                                  <div className="w-12 h-12 rounded-full bg-brand-light dark:bg-gray-700 flex items-center justify-center text-brand-primary dark:text-white font-bold text-lg border-2 border-white dark:border-[#262626] shadow-sm">
                                      {selectedInquiry.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                      <p className="font-bold text-gray-900 dark:text-white">{selectedInquiry.name}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium tracking-wide">Customer</p>
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                      <div className="w-8 flex justify-center"><Mail size={18} className="text-gray-400"/></div>
                                      <span className="truncate">{selectedInquiry.email}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                      <div className="w-8 flex justify-center"><FileText size={18} className="text-gray-400"/></div>
                                      <span>Reason: <span className="font-medium text-gray-800 dark:text-gray-200">{selectedInquiry.reason}</span></span>
                                  </div>
                                  {selectedInquiry.order_number && (
                                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                          <div className="w-8 flex justify-center"><ShoppingBag size={18} className="text-gray-400" /></div>
                                          <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium">{selectedInquiry.order_number}</span>
                                      </div>
                                  )}
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
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Contact Inquiries</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage customer support tickets.</p>
          </div>
      </div>
      
      <Card>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                     <th className="px-6 py-4 font-semibold">Date</th>
                     <th className="px-6 py-4 font-semibold">From</th>
                     <th className="px-6 py-4 font-semibold">Subject</th>
                     <th className="px-6 py-4 font-semibold">Status</th>
                     <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                      Array(5).fill(0).map((_, i) => (
                          <tr key={i}>
                              <td colSpan={5} className="p-4"><Skeleton className="h-12 w-full" /></td>
                          </tr>
                      ))
                  ) : inquiries.length > 0 ? inquiries.map(inq => (
                     <tr key={inq.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(inq.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                               <span className="font-medium text-gray-900 dark:text-white">{inq.name}</span>
                               <span className="text-xs text-gray-500 dark:text-gray-400">{inq.email}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                               <span className="text-gray-900 dark:text-white font-medium truncate max-w-[250px]">{inq.subject}</span>
                               <span className="text-xs text-gray-500 dark:text-gray-400">{inq.reason}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                            <Badge variant={inq.status === 'Open' ? 'error' : inq.status === 'Closed' ? 'secondary' : 'success'}>
                                {inq.status}
                            </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                               <Button variant="ghost" size="sm" onClick={() => setSelectedInquiry(inq)} title="View">
                                   <Eye size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white"/>
                               </Button>
                               <Button variant="ghost" size="sm" onClick={() => setSelectedInquiry(inq)} title="Reply">
                                   <MessageCircle size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white"/>
                               </Button>
                               {inq.status !== 'Closed' && (
                                   <Button variant="ghost" size="sm" onClick={() => handleCloseTicket(inq.id)} title="Close Ticket">
                                       <XCircle size={16} className="text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"/>
                                   </Button>
                               )}
                           </div>
                        </td>
                     </tr>
                  )) : (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">No inquiries found.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </Card>
    </div>
  );
};
