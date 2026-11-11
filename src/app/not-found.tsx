import { Frame } from "@/components/app-shell";
import Link from "next/link";

export default function NotFound() {
  return (
    <Frame>
      <div className="hero">
        <h1>Essa página não está no tatame.</h1>
        <Link className="btn btn-primary" href="/painel" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
          Voltar ao painel
        </Link>
      </div>
    </Frame>
  );
}
