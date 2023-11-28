import "../styles/globals.css";
import "../styles/text-editor.css";

export const metadata = {
  title: "Reflect + Yjs + Tiptap",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
