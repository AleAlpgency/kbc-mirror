import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import Mirror from "./mirror";

export const dynamic = "force-dynamic";

export default async function MirrorPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  return <Mirror />;
}
