import { notFound } from "next/navigation";
import NicheLab from "./NicheLab";

// Dev-only: compare variants of the cabinet's 3D control niche.
export default function NicheLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <NicheLab />;
}
