"use client";

import { useEffect } from "react";
import { captureAttribution } from "./attribution";

/** Records first-touch attribution (landing page, referrer, UTM) once per browser session. */
export function ClientBoot() {
  useEffect(() => captureAttribution(), []);
  return null;
}
