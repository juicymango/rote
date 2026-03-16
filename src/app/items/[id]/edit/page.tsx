import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditItemForm from "@/components/items/EditItemForm";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
    return null;
  }

  const { data: item } = await supabase
    .from("items")
    .select("id, key, value, next_review_at, interval_days, consecutive_correct")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item) notFound();

  return <EditItemForm item={item} />;
}
