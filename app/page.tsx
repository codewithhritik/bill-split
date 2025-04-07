import { BillSplitter } from "@/components/bill-splitter"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Restaurant Bill Splitter</h1>
      <BillSplitter />
    </main>
  )
}

