import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const SkinForgeApp = dynamic(() => import("@/components/SkinForgeApp"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-forge-bg text-forge-text-muted text-sm">
      Loading SkinForge…
    </div>
  ),
});

export default function EditorPage() {
  return (
    <ErrorBoundary>
      <SkinForgeApp />
    </ErrorBoundary>
  );
}
