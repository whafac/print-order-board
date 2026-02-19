import { notFound } from "next/navigation";
import { getJobById } from "@/lib/sheets";
import { EditOrderClient } from "@/components/EditOrderClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditJobPage({ params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = await params;
  try {
    const job = await getJobById(job_id);
    if (!job) {
      notFound();
    }
    if (job.status !== "접수") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <p className="text-slate-600">접수 상태가 아닌 의뢰는 수정할 수 없습니다.</p>
            <a href={`/jobs/${job_id}`} className="mt-4 inline-block text-blue-600 hover:underline">
              의뢰 상세로 돌아가기
            </a>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50">
        <EditOrderClient jobId={job_id} initialJob={job} />
      </div>
    );
  } catch (e) {
    console.error("Error fetching job:", e);
    notFound();
  }
}
