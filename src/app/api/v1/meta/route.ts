import { apiSuccess } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiSuccess(request, {
    apiVersion: "v1",
    app: {
      minVersion: process.env.MOBILE_MIN_VERSION || "1.0.0",
      maintenance: process.env.MOBILE_MAINTENANCE === "1",
    },
    providers: [
      {
        id: "shabforoosh",
        code: "a",
        playback: { direct: true, hls: true, mp4: true, requiresReferer: false },
      },
      {
        id: "gapfilm",
        code: "b",
        playback: { direct: true, hls: true, mp4: true, requiresReferer: false },
      },
      {
        id: "filimo",
        code: "c",
        playback: {
          direct: true,
          hls: true,
          mp4: true,
          requiresReferer: true,
          proxyFallback: true,
        },
      },
    ],
    features: {
      home: true,
      catalog: true,
      search: true,
      details: true,
      playback: true,
      favorites: true,
      progress: true,
      kids: true,
    },
  });
}
