import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/tailor")({
  component: TailorRedirect,
});

function TailorRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/dashboard/tailor", replace: true }); }, [navigate]);
  return null;
}
