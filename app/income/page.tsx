import { IncomeClient } from "./income-client";

export default function IncomePage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Income</h1>
      <IncomeClient />
    </div>
  );
}
