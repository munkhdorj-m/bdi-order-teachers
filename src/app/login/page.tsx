import { redirect } from "next/navigation";
import { safeNext } from "@/lib/next-path";
import { getTeacher } from "@/lib/server/session";
import { LoginFlow } from "./login-flow";

/** `?next=/cart` brings people back where they were after signing in. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getTeacher()) redirect(next);
  return <LoginFlow next={next} />;
}
