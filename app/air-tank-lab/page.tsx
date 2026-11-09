import { notFound } from "next/navigation";
import AirTankLab from "@/components/air-tank-lab/AirTankLab";

export default function AirTankLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AirTankLab />;
}
