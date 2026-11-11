import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tatame",
    short_name: "Tatame",
    description: "Anote os rolas e veja a evolução no tatame.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#111111",
    lang: "pt-BR",
    categories: ["sports", "health"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Novo rola",
        short_name: "Anotar",
        description: "Registrar o treino",
        url: "/treinos/novo",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Painel",
        short_name: "Painel",
        url: "/painel",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/painel.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Painel do treino",
      },
      {
        src: "/screenshots/registro.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Anotar um rola",
      },
    ],
  };
}
