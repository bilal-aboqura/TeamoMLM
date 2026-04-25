"use client";

import { useEffect } from "react";
import { markInvestmentNotificationsRead } from "../actions";

export function MarkNotificationsRead() {
  useEffect(() => {
    void markInvestmentNotificationsRead();
  }, []);

  return null;
}
