import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/tailor_/studio-profile")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/tailor/profile-edit", replace: true });
  },
});
