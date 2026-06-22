import { ExpensesClient } from "./expenses-client";

export default function ExpensesPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Expenses</h1>
      <ExpensesClient />
    </div>
  );
}
