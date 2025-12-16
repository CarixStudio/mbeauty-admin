
import React from 'react';
import type { Order } from '../types';
import { Package, MapPin, Phone, Mail, CreditCard } from 'lucide-react';

interface OrderPrintViewProps {
  order: any; // Using any to match the dynamic structure from Orders page
  type: 'invoice' | 'label';
}

export const OrderPrintView: React.FC<OrderPrintViewProps> = ({ order, type }) => {
  
  if (type === 'label') {
    return (
      <div id="print-area" className="w-[4in] h-[6in] bg-white text-black p-4 border border-gray-300 mx-auto flex flex-col font-sans relative overflow-hidden">
        {/* Header / Courier */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
            <h1 className="font-bold text-3xl uppercase">Momoh</h1>
            <div className="text-right">
                <div className="font-bold text-lg">PRIORITY</div>
                <div className="text-xs">Express Delivery</div>
            </div>
        </div>

        {/* From Address */}
        <div className="text-xs mb-4">
            <div className="font-bold uppercase">From:</div>
            <div>Momoh Beauty Fulfillment</div>
            <div>123 Luxury Lane</div>
            <div>New York, NY 10012</div>
        </div>

        {/* To Address */}
        <div className="flex-1 mb-4 pl-4 border-l-4 border-black">
            <div className="font-bold uppercase text-sm mb-1">Ship To:</div>
            <div className="text-lg font-bold">{order.shipping_address?.name || order.customer}</div>
            <div className="text-base">{order.shipping_address?.address1}</div>
            {order.shipping_address?.address2 && <div className="text-base">{order.shipping_address?.address2}</div>}
            <div className="text-base">
                {order.shipping_address?.city}, {order.shipping_address?.province} {order.shipping_address?.zip}
            </div>
            <div className="text-base font-bold">{order.shipping_address?.country || 'US'}</div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4 border-t border-black pt-2">
            <div>
                <span className="font-bold">Order #:</span> {order.displayId}
            </div>
            <div>
                <span className="font-bold">Weight:</span> 1.2 LBS
            </div>
            <div>
                <span className="font-bold">Date:</span> {new Date(order.date).toLocaleDateString()}
            </div>
        </div>

        {/* Barcode Mock */}
        <div className="mt-auto pt-4 flex flex-col items-center justify-center">
            <div className="h-16 w-full bg-black/10 flex items-end justify-center pb-1 space-x-1">
                {/* Fake Barcode Lines */}
                {Array.from({length: 40}).map((_,i) => (
                    <div key={i} className="bg-black" style={{width: Math.random() > 0.5 ? '2px' : '4px', height: Math.random() > 0.5 ? '80%' : '100%'}}></div>
                ))}
            </div>
            <div className="text-xs font-mono mt-1 tracking-[0.2em]">{order.displayId.replace('#', '')}12345US</div>
        </div>
      </div>
    );
  }

  // Invoice Layout
  return (
    <div id="print-area" className="w-[210mm] min-h-[297mm] bg-white text-gray-900 p-12 mx-auto font-sans text-sm relative">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
            <div>
                <div className="w-12 h-12 bg-gray-900 text-white flex items-center justify-center text-xl font-bold rounded mb-4">M</div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">INVOICE</h1>
                <p className="text-gray-500 mt-1">Receipt #{order.displayId.replace('#', '')}</p>
            </div>
            <div className="text-right text-gray-500">
                <h3 className="font-bold text-gray-900 text-lg mb-1">Momoh Beauty Inc.</h3>
                <p>123 Luxury Lane</p>
                <p>New York, NY 10012</p>
                <p>United States</p>
                <p className="mt-2">support@momoh.com</p>
            </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
                <h3 className="text-gray-500 font-bold uppercase text-xs mb-3 tracking-wider">Bill To</h3>
                <div className="font-bold text-gray-900 text-base mb-1">{order.customer}</div>
                <div className="text-gray-600">{order.email}</div>
                <div className="text-gray-600">{order.shipping_address?.phone}</div>
            </div>
            <div>
                <h3 className="text-gray-500 font-bold uppercase text-xs mb-3 tracking-wider">Ship To</h3>
                <div className="font-bold text-gray-900 text-base mb-1">{order.shipping_address?.name || order.customer}</div>
                <div className="text-gray-600">
                    {order.shipping_address?.address1}<br/>
                    {order.shipping_address?.address2 && <>{order.shipping_address.address2}<br/></>}
                    {order.shipping_address?.city}, {order.shipping_address?.province} {order.shipping_address?.zip}<br/>
                    {order.shipping_address?.country}
                </div>
            </div>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
                <h3 className="text-gray-500 font-bold uppercase text-xs mb-2 tracking-wider">Order Date</h3>
                <p className="font-medium">{new Date(order.date).toLocaleDateString()}</p>
            </div>
            <div>
                <h3 className="text-gray-500 font-bold uppercase text-xs mb-2 tracking-wider">Payment Method</h3>
                <p className="font-medium flex items-center gap-2">
                    <CreditCard size={16}/> •••• 4242 (Stripe)
                </p>
            </div>
        </div>

        {/* Line Items */}
        <table className="w-full mb-8">
            <thead>
                <tr className="border-b-2 border-gray-900">
                    <th className="text-left py-3 font-bold uppercase text-xs">Item Description</th>
                    <th className="text-right py-3 font-bold uppercase text-xs">Qty</th>
                    <th className="text-right py-3 font-bold uppercase text-xs">Unit Price</th>
                    <th className="text-right py-3 font-bold uppercase text-xs">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {order.line_items?.map((item: any, i: number) => (
                    <tr key={i}>
                        <td className="py-4">
                            <div className="font-bold text-gray-900">{item.product}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{item.variant} • {item.sku}</div>
                        </td>
                        <td className="py-4 text-right">{item.quantity}</td>
                        <td className="py-4 text-right">${Number(item.price).toFixed(2)}</td>
                        <td className="py-4 text-right font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-12">
            <div className="w-64 space-y-2">
                <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${(Number(order.total) - 5.99).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-200">
                    <span>Shipping</span>
                    <span>$5.99</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900 pt-1">
                    <span>Total</span>
                    <span>${Number(order.total).toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 text-center text-gray-500 text-xs">
            <p className="mb-1">Thank you for choosing Momoh Beauty.</p>
            <p>If you have any questions about this invoice, please contact support@momoh.com</p>
        </div>
    </div>
  );
};
