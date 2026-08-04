import React from "react";

export const dynamic = "force-dynamic";

const DEPLOYMENT_ORIGIN =
  process.env.NEXT_PUBLIC_DEPLOYMENT_ORIGIN || "";

function appUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return DEPLOYMENT_ORIGIN ? `${DEPLOYMENT_ORIGIN}${cleanPath}` : cleanPath;
}

function ButtonLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        width: "100%",
        textAlign: "center",
        textDecoration: "none",
        borderRadius: 18,
        border: "1px solid rgba(34, 211, 238, 0.35)",
        background: "rgba(15, 23, 42, 0.9)",
        color: "#e5e7eb",
        padding: "24px 18px",
        fontSize: 24,
        fontWeight: 900,
        boxSizing: "border-box",
        marginTop: 18,
      }}
    >
      {children}
    </a>
  );
}

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#dffcff",
        padding: 24,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          border: "1px solid rgba(34, 211, 238, 0.25)",
          borderRadius: 24,
          padding: 24,
          background: "rgba(0,0,0,0.72)",
        }}
      >
        <h1
          style={{
            color: "#2dd4bf",
            letterSpacing: "0.16em",
            fontSize: 38,
            lineHeight: 1.15,
            margin: "0 0 18px",
          }}
        >
          AURA115 CONTROL BRIDGE
        </h1>

        <p style={{ color: "#a3a3a3", fontSize: 18, lineHeight: 1.45 }}>
          Joshua command surface. One root. One bridge. App routes only â no
          downloads.
        </p>

        <div
          style={{
            marginTop: 28,
            border: "1px solid rgba(34, 211, 238, 0.22)",
            borderRadius: 22,
            padding: 24,
            background: "rgba(15, 23, 42, 0.42)",
          }}
        >
          <h2 style={{ color: "#d4d4d4", fontSize: 26, margin: "0 0 16px" }}>
            Experiment Pages
          </h2>

          <ButtonLink href={appUrl("/")}>Main / Experiment</ButtonLink>
          <ButtonLink href={appUrl("/self-heal")}>Self-Heal</ButtonLink>
          <ButtonLink href={appUrl("/github-rewrite")}>GitHub Rewrite</ButtonLink>
          <ButtonLink href={appUrl("/stable-island")}>Stable Island</ButtonLink>
          <ButtonLink href={appUrl("/jupiter-input")}>Jupiter Input</ButtonLink>
          <ButtonLink href={appUrl("/")}>Open Current Frame URL</ButtonLink>
        </div>

        <div
          style={{
            marginTop: 28,
            border: "1px solid rgba(250, 204, 21, 0.45)",
            borderRadius: 18,
            padding: 16,
            color: "#fde68a",
            background: "rgba(113, 63, 18, 0.18)",
            fontSize: 15,
            lineHeight: 1.45,
          }}
        >
          Do not link to page.tsx. Browser links to source files download them.
          Link to app routes like /, /jupiter-input, /github-rewrite.
        </div>
      </section>
    </main>
  );
}
