import { ImageResponse } from "next/og";
import { BDI_ASPECT, BDI_PATH, BDI_VIEWBOX, BRAND_GRADIENT } from "@/lib/brand";

/**
 * The home-screen icon: the white BDI wordmark on the emerald brand
 * gradient, with a thin line under it. Full-bleed, so the phone's own
 * mask (circle, squircle) shapes it.
 *
 * `mark` is the wordmark width in px. On Android's maskable icon
 * everything must stay inside the centre circle (80% of the canvas).
 */
export function appIcon(size: number, mark: number): ImageResponse {
  const h = Math.round(mark / BDI_ASPECT);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: BRAND_GRADIENT,
        }}
      >
        <svg width={mark} height={h} viewBox={BDI_VIEWBOX}>
          <path d={BDI_PATH} fill="#ffffff" />
        </svg>
        <div
          style={{
            marginTop: Math.round(h * 0.32),
            width: Math.round(mark * 0.34),
            height: Math.max(3, Math.round(h * 0.12)),
            borderRadius: 99,
            backgroundColor: "rgba(255,255,255,0.75)",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
