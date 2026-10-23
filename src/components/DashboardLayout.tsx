"use client";

import { type ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";

interface DashboardLayoutProps {
  children: ReactNode;
  /**
   * The title and subtitle used to live in a top bar that no longer exists —
   * each page names itself inside its own content. The props are kept so the
   * older pages keep compiling while they are migrated.
   */
  title?: string;
  subtitle?: string;
  /** drop the right-hand score rail on pages that bring their own */
  wide?: boolean;
}

/**
 * The old layout wrapper.
 *
 * Everything now goes through AppShell: a 64px icon rail on the left, the
 * page in the middle, and the score rail on the right. This component stays
 * so the pages that still call it do not all have to change at once.
 */
export default function DashboardLayout({
  children,
  wide = false,
}: DashboardLayoutProps) {
  return <AppShell wide={wide}>{children}</AppShell>;
}
