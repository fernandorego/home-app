import { CategoriesAdmin } from "./categories-admin";

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
    </div>
  );
}
