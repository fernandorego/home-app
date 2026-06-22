import { TasksClient } from "./tasks-client";

export default function TasksPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">To-Do List</h1>
      <TasksClient />
    </div>
  );
}
