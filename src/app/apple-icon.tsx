import { appIcon } from "@/lib/app-icon";

// iOS rounds the corners itself and never crops further, so the mark can
// be a little larger.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(180, 100);
}
