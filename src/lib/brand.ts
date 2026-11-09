/** The app's name on the phone's home screen and in the browser tab. */
export const APP_NAME = "BDI Дэлгүүр";

/**
 * The BDI wordmark as one SVG path (copied from the BDI site): "BDI" in
 * Montserrat ExtraBold, converted to outlines, so the logo needs no font
 * file. Font units: caps run from y=0 (top) to y=700 (baseline).
 */
export const BDI_PATH =
  "M70 700V0H428Q566 0 634 50.5Q702 101 702 183Q702 237 673.5 277.5Q645 318 593.5 341.5Q542 365 471 365L491 317Q565 317 620 339.5Q675 362 705.5 404.5Q736 447 736 508Q736 599 662.5 649.5Q589 700 448 700ZM266 557H432Q483 557 509.5 539.5Q536 522 536 486Q536 450 509.5 432.5Q483 415 432 415H252V278H402Q452 278 477 261Q502 244 502 210Q502 176 477 159.5Q452 143 402 143H266Z M829 700V0H1160Q1276 0 1364 43Q1452 86 1501.5 164Q1551 242 1551 350Q1551 457 1501.5 535.5Q1452 614 1364 657Q1276 700 1160 700ZM1027 542H1152Q1212 542 1256.5 519.5Q1301 497 1326 453.5Q1351 410 1351 350Q1351 289 1326 246Q1301 203 1256.5 180.5Q1212 158 1152 158H1027Z M1645 700V0H1843V700Z";

export const BDI_VIEWBOX = "70 0 1773 700";
/** Width ÷ height of the wordmark. */
export const BDI_ASPECT = 1773 / 700;

/** Theme colours as hex — keep in sync with @theme in globals.css. */
export const COLORS = {
  canvas: "#f4f4f1",
  surface: "#ffffff",
  ink: "#141416",
  line: "#e6e4de",
  primary: "#09845b",
  primaryBright: "#19c088",
  primaryDeep: "#066343",
} as const;

/** The brand gradient (logo tile, app icon). */
export const BRAND_GRADIENT = `linear-gradient(150deg, ${COLORS.primaryBright} 0%, ${COLORS.primary} 55%, ${COLORS.primaryDeep} 100%)`;
