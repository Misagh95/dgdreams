import { redirect } from "next/navigation";

// Tournaments lived inside the LiteVM Hub. That page is gone, so send people
// to the 2048 game, which is where the tournaments were played.
export default function TournamentsRedirect() {
  redirect("/2048");
}
