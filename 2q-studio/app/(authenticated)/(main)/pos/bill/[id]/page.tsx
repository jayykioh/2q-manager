import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";

interface BillItem {
  id: string;
  quantity: number;
  sale_price: number;
  product: { name: string; type: string };
}

export default async function BillPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch order details
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        product:products ( name, type )
      ),
      store:stores ( name, address, phone )
    `)
    .eq("id", params.id)
    .single();

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold mb-4">Không tìm thấy hóa đơn</h1>
        <Link href="/pos" className="text-blue-500 hover:underline">Quay lại POS</Link>
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/pos" 
          className="flex items-center gap-2 text-sm text-mid hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại POS
        </Link>
        <button 
          onClick={() => {}} // Will be handled via client component or just a placeholder for now
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
          title="Kết nối máy in (Tính năng đang phát triển)"
        >
          <Printer size={16} />
          Kết nối máy in
        </button>
      </div>

      <div className="bg-white text-black p-6 rounded-md shadow-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold uppercase">{order.store.name}</h2>
          <p className="text-sm text-gray-600">{order.store.address}</p>
          <p className="text-sm text-gray-600">SĐT: {order.store.phone}</p>
        </div>

        <div className="border-b border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">Mã ĐH:</span>
            <span>{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">Ngày:</span>
            <span>{dayjs(order.created_at).format("DD/MM/YYYY HH:mm")}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">Khách hàng:</span>
            <span>{order.customer_name || 'Khách lẻ'} {order.customer_phone ? `- ${order.customer_phone}` : ''}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold">P.Thức:</span>
            <span className="uppercase">{order.payment_method}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-gray-300 pb-4 mb-4 min-h-[150px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Tên món</th>
                <th className="text-center py-2">SL</th>
                <th className="text-right py-2">Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              {(order.order_items as BillItem[]).map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-2">
                    {item.product.name}
                    <div className="text-xs text-gray-500">{item.product.type}</div>
                  </td>
                  <td className="text-center py-2 align-top">{item.quantity}</td>
                  <td className="text-right py-2 align-top">{formatCurrency(item.sale_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span>Tạm tính:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-500">
            <span>Giảm giá:</span>
            <span>-{formatCurrency(order.discount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-200">
            <span>Tổng cộng:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Cảm ơn quý khách và hẹn gặp lại!</p>
          <p className="text-xs mt-2">Wifi: 2Q Studio | Pass: 12345678</p>
        </div>
      </div>
    </div>
  );
}
