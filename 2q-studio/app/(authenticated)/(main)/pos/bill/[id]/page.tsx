import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { PrintButton } from "@/components/PrintButton";

interface BillItem {
  id: string;
  quantity: number;
  sale_price: number;
  product: { name: string; type: string } | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  if (!UUID_PATTERN.test(id)) {
    return (
      <div className="print-hide flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-xl font-bold">Mã hóa đơn không hợp lệ</h1>
        <Link href="/pos" className="text-blue-500 hover:underline">Quay lại POS</Link>
      </div>
    );
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        product:products ( name, type )
      ),
      store:stores ( name, address )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load bill", { orderId: id, message: error.message });
    return (
      <div className="print-hide flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-xl font-bold">Không tải được hóa đơn</h1>
        <Link href="/pos" className="text-blue-500 hover:underline">Quay lại POS</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="print-hide flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-xl font-bold">Không tìm thấy hóa đơn</h1>
        <Link href="/pos" className="text-blue-500 hover:underline">Quay lại POS</Link>
      </div>
    );
  }

  const items = (order.order_items || []) as BillItem[];

  return (
    <div className="receipt-page mx-auto max-w-lg px-4 py-8">
      <div className="print-hide mb-6 flex items-start justify-between gap-4">
        <Link
          href="/pos"
          className="flex items-center gap-2 text-sm text-mid transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} />
          Quay lại POS
        </Link>
        <PrintButton />
      </div>

      <div className="receipt-paper bg-white p-6 text-black shadow-lg">
        <div className={`receipt-status mb-4 border px-3 py-2 text-center text-sm font-bold uppercase ${
          order.status === "cancelled"
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-green-300 bg-green-50 text-green-700"
        }`}>
          {order.status === "cancelled" ? "Hóa đơn đã hủy" : "Đã thanh toán"}
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold uppercase">
            2Q Store
          </h2>
          <p className="text-sm font-semibold text-gray-700">Musky Bar // Innoir in Da Nang</p>
        </div>

        <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="font-semibold">Mã ĐH:</span>
            <span className="text-right">{order.order_number}</span>
          </div>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="font-semibold">Ngày:</span>
            <span className="text-right">{dayjs(order.created_at).format("DD/MM/YYYY HH:mm")}</span>
          </div>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="font-semibold">Khách hàng:</span>
            <span className="text-right">
              {order.customer_name || "Khách lẻ"}
              {order.customer_phone ? ` - ${order.customer_phone}` : ""}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-semibold">P.Thức:</span>
            <span className="text-right uppercase">{order.payment_method}</span>
          </div>
        </div>

        <div className="mb-4 min-h-[150px] border-b border-dashed border-gray-300 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left">Tên món</th>
                <th className="py-2 text-center">SL</th>
                <th className="py-2 text-right">Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-2">
                    {item.product?.name || "Sản phẩm"}
                    {item.product?.type && (
                      <div className="text-xs text-gray-500">{item.product.type}</div>
                    )}
                  </td>
                  <td className="py-2 text-center align-top">{item.quantity}</td>
                  <td className="py-2 text-right align-top">{formatCurrency(item.sale_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex justify-between gap-3 text-sm">
            <span>Tạm tính:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm text-red-500">
            <span>Giảm giá:</span>
            <span>-{formatCurrency(order.discount)}</span>
          </div>
          <div className="mt-2 flex justify-between gap-3 border-t border-gray-200 pt-2 text-lg font-bold">
            <span>Tổng cộng:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Cảm ơn quý khách và hẹn gặp lại!</p>
          <p className="mt-2 text-xs">Made for the little moments.</p>
          <p className="text-xs">Keep what feels true.</p>
          <p className="text-xs">See you somewhere nice.</p>
        </div>
      </div>
    </div>
  );
}
