import { ShoppingClient } from "./shopping-client";

export default function ShoppingPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Shopping List</h1>
      <ShoppingClient />
    </div>
  );
}
