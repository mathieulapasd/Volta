import { cookies } from "next/headers";
import EmailBuilder from "@/components/EmailBuilder";
import Footer from "@/components/Footer";

export default async function Home() {
  const layout = (await cookies()).get("react-resizable-panels:layout");

  let defaultLayout = [50, 50];

  if (layout) {
    defaultLayout = JSON.parse(decodeURIComponent(layout.value));
  }

  return (
    <>
      <main className="flex h-[calc(100vh-39px)] bg-background">
        <EmailBuilder defaultLayout={defaultLayout} />
      </main>

      <Footer />
    </>
  );
}
