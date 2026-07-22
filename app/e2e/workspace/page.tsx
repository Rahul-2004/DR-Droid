import { notFound } from "next/navigation";
import { Workspace } from "@/features/workspace/workspace";

export default async function E2ETestWorkspace({ searchParams }: { searchParams: Promise<{ credits?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <Workspace user={{ name: "E2E User", email: "e2e@example.com" }} initialCredits={Number(params.credits ?? "0")}/>;
}
