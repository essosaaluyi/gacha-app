import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SoundWorkstation from "./SoundWorkstation";

export const metadata: Metadata = { title: "SEワークステーション" };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SoundWorkstation />;
}
