"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="stage">
      <div className="phone">
        <div className="hero">
          <h1>Algo saiu do trilho.</h1>
          <p className="lede">O Tatame não conseguiu abrir esta tela. {error.digest ? `Código ${error.digest}.` : "Tente de novo em instantes."}</p>
          <button className="btn btn-primary" type="button" onClick={reset}>Tentar de novo</button>
        </div>
      </div>
    </div>
  );
}
