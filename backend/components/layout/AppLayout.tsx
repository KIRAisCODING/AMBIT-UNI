"use client";

import { Suspense } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import PageContainer from "./PageContainer";
import TopBar from "./TopBar";
import Workspace from "./Workspace";

type AppLayoutProps = {
  children: React.ReactNode;
};

/**
 * Renders the composed app layout around page content.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Workspace
      sidebar={
        <Suspense fallback={<div className="w-[320px] shrink-0" />}>
          <Sidebar />
        </Suspense>
      }
    >
      <TopBar />
      <PageContainer>{children}</PageContainer>
    </Workspace>
  );
}
