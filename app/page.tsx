import { FileConverter } from "@/components/FileConverter/FileConverter";

export default function Home() {
  return (
    <div className="relative min-h-full overflow-hidden bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(45,212,191,0.18),transparent_55%),radial-gradient(900px_500px_at_100%_20%,rgba(99,102,241,0.12),transparent_50%),var(--background)]">
      <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-20 pt-6 sm:px-8">
        <FileConverter />
      </div>
    </div>
  );
}
