import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

function Page() {
  redirect("/r/" + nanoid(6));
}

export default Page;
