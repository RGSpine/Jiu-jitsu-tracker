"use client";

import { SessionForm } from "@/components/session-form";
import { useParams } from "next/navigation";

export function EditSession() {
  const params = useParams<{ id: string }>();
  return <SessionForm sessionId={params.id} />;
}
