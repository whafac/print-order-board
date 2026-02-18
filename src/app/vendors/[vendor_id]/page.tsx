import { VendorFormClient } from "@/components/VendorFormClient";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ vendor_id: string }>;
}) {
  const { vendor_id } = await params;
  return (
    <div className="min-h-screen bg-slate-50">
      <VendorFormClient vendorId={vendor_id} />
    </div>
  );
}
