import dynamic from "next/dynamic";

const SkinForgeApp = dynamic(() => import("@/components/SkinForgeApp"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-forge-bg text-forge-text-muted text-sm">
      Loading SkinForge…
    </div>
  ),
});

export default function EditorPage() {
  return <SkinForgeApp />;
}
