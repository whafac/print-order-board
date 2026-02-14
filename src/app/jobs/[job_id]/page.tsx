import { notFound } from "next/navigation";
import { JobDetailClient } from "@/components/JobDetailClient";
import { getJobById } from "@/lib/sheets";

export default async function JobPage({ params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = await params;
  try {
    const job = await getJobById(job_id);
    if (!job) {
      console.error(`Job not found: ${job_id}`);
      notFound();
    }
    return (
      <div className="min-h-screen bg-slate-50">
        <JobDetailClient job={job} />
      </div>
    );
  } catch (e) {
    console.error("Error fetching job:", e);
    notFound();
  }
}
