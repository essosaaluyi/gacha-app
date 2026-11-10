import { notFound } from "next/navigation";
import DrawButtonLab from "./DrawButtonLab";

// Dev-only prototype: three.js DRAW push button with gray → sky blue → off lamp.
export default function Button3DLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DrawButtonLab />;
}
