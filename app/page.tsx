import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TastyShell from "./tasty-shell";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <TastyShell />;
}
