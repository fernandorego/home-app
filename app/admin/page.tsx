import { CategoriesAdmin } from "./categories-admin";
import { ReimbursersAdmin } from "./reimbursers-admin";
import { IncomeTypesAdmin } from "./income-types-admin";

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="opacity-70">Manage categories and their monthly budgets.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Categories &amp; budgets</h2>
        <CategoriesAdmin />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Reimbursers</h2>
        <ReimbursersAdmin />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Income types</h2>
        <IncomeTypesAdmin />
      </section>
    </div>
  );
}
