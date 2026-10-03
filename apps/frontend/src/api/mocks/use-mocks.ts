/**
 * True only under `npm run dev:ui`: every client in `src/api/` answers from in-browser mocks and
 * the app makes no backend request (external map tiles and geocoding still load). Set by
 * next.config.ts from the npm script name; there is nothing to configure.
 */
export const USE_MOCKS = process.env.MRADAR_MOCKS === "true";

/** A short pause so loading states show the way they do against a real server. */
export function mockDelay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Answer a client call from the mocks after a short pause; thrown API errors become rejections. */
export async function fromMock<T>(produce: () => T): Promise<T> {
  await mockDelay();
  return produce();
}
