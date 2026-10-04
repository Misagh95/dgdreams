import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DGDreams — Web3 Activity Terminal",
    short_name: "DGDreams",
    description: "Daily on-chain task terminal and multi-chain activity tracker.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0E1319",
    theme_color: "#D0FF94",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/logos/base.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
    ],
  };
}
