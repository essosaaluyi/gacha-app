import { notFound } from "next/navigation";
import Card3DLab from "./Card3DLab";

// Dev-only prototype: real three.js cards (outlet → deal → flip and land).
export default function Card3DLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Card3DLab />;
}
