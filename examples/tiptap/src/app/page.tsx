import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function Page() {
  redirect("/r/" + nanoid(6));
}

export default Page;
