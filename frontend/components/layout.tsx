// components/layout.tsx
import Navbar from "./navbar";
import { ReactNode } from "react";
import { useRouter } from "next/router";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();


  const HIDDEN_PREFIX = "/portal-carlos-2501";
  const hideNavbar = router.pathname.startsWith(HIDDEN_PREFIX);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main>{children}</main>
    </>
  );
}
