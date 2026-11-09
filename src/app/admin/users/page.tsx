import { listAccounts } from "@/lib/server/accounts";
import { requireAdmin } from "@/lib/server/session";
import { UsersView } from "./users-view";

export default async function UsersPage() {
  const me = await requireAdmin();
  const accounts = await listAccounts();
  return <UsersView accounts={accounts} meId={me.id} />;
}
