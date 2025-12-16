
import { supabase } from './supabase';

/**
 * Logs an administrative action to the database audit_logs table.
 * @param action - Short description of the action (e.g., "Updated Product")
 * @param target - The resource being affected (e.g., "Lipstick SKU-123")
 * @param details - Optional object containing metadata or diffs
 */
export const logAuditAction = async (action: string, target: string, details?: any) => {
  try {
    // 1. Get Current User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Get IP Address (Client-side best effort)
    let ip = 'Unknown';
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip;
    } catch (e) {
        console.warn('Could not fetch IP for audit log');
    }

    // 3. Insert Log
    const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        action,
        target_resource: target,
        details: details ? JSON.stringify(details) : null,
        ip_address: ip,
        created_at: new Date().toISOString()
    });

    if (error) {
        console.error('Failed to write audit log:', error);
    }
  } catch (error) {
    console.error('Audit Logging Exception:', error);
  }
};
