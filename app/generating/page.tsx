import { Guard } from "@/components/shell";
import { Generation } from "@/components/generation";
export default function Generating() {
  return (
    <Guard level="character">
      <Generation />
    </Guard>
  );
}
