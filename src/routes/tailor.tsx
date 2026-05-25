import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/tailor")({
  component: () => <Navigate to="/dashboard/tailor" replace />,
});
