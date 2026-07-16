import { CravingInput } from "@/components/craving-input";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen pt-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1F2937]">Craving to Plate</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Name it or paste a reel — see 3 ways to eat it
        </p>
      </header>

      <CravingInput />
    </div>
  );
}
