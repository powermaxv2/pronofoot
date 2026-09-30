import { redirect } from "next/navigation";
import { requireUser } from "@/server/session";

/** Raccourci vers son propre profil. */
export default async function MyProfile() {
  const user = await requireUser();
  redirect(`/profil/${user.username}`);
}
