"use client";

import { NewOrderClient } from "./NewOrderClient";

interface Job {
  order_type?: string;
  requester_name: string;
  media_id?: string;
  media_name: string;
  vendor: string;
  due_date: string;
  qty: string;
  file_link: string;
  changes_note: string;
  spec_snapshot: string;
  type_spec_snapshot?: string;
}

export function EditOrderClient({ jobId, initialJob }: { jobId: string; initialJob: Job }) {
  return <NewOrderClient initialJob={initialJob} editJobId={jobId} />;
}
