
import useSWR from 'swr';
import { supabase } from './supabase';

// Generic Fetcher
const fetcher = async (key: string) => {
    // This is a placeholder as we use specific queries inside hooks
    return null;
};

export function useOrder(id: string | number) {
    return useSWR(id ? `orders/${id}` : null, async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                customers ( * ),
                order_items ( 
                    *, 
                    product_variants ( 
                        *,
                        products!product_variants_product_id_fkey ( name, image_url ) 
                    ) 
                ),
                order_events ( * ),
                order_notes ( *, admin_profiles (full_name) )
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    });
}

export function useCustomer(id: string | number) {
    return useSWR(id ? `customers/${id}` : null, async () => {
        // Fetch customer details
        const { data: customer, error: custError } = await supabase
            .from('customers')
            .select('*, customer_addresses(*)')
            .eq('id', id)
            .single();
            
        if (custError) throw custError;

        // Fetch Orders separately to avoid large joins if not needed immediately, 
        // or calculate aggregate here.
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select('id, total_amount, payment_status, created_at, status, order_number')
            .eq('customer_id', id)
            .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        // Calculate Total Spent (Paid only)
        const totalSpent = orders
            ? orders
                .filter((o: any) => o.payment_status?.toLowerCase() === 'paid')
                .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0) 
            : 0;

        return {
            ...customer,
            calculated_spent: totalSpent,
            orders: orders || []
        };
    });
}
