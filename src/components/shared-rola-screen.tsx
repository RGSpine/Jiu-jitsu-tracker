"use client";

import { SharedRola } from "@/components/shared-rola";
import { useParams } from "next/navigation";

export function SharedRolaScreen() {
  const params = useParams<{ id: string }>();
  return <SharedRola rolaId={params.id} />;
}
