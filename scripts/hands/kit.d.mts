import type { Page } from "@playwright/test";

export const KIT_ORIGIN: string;
export const KIT_URL: string;
export function bundleHandKit(): Promise<{ js: string; css: string }>;
export function routeHandKit(page: Page, opts?: { bodyCss?: string }): Promise<void>;
