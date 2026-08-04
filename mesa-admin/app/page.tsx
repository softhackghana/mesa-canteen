import { redirect } from "next/navigation";

/** Root page — the authenticated area starts at /dashboard. */
export default function Home() {
  redirect("/dashboard");
}
