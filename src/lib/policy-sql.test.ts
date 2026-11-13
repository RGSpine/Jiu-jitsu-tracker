import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../supabase/migrations/20261114000000_teams_competition.sql", import.meta.url), "utf8");

describe("políticas de equipe", () => {
  it("liga RLS e esconde a equipe de quem está fora", () => {
    for (const table of ["teams", "team_members", "competitions", "competition_matches", "prep_plans"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("create policy teams_member_select");
    expect(sql).toMatch(/teams_member_select[\s\S]*status in \('active', 'invited', 'requested'\)/);
    const week = sql.slice(sql.indexOf("function public.team_week_total"));
    const guard = week.indexOf("Equipe não encontrada");
    const count = week.indexOf("from public.training_sessions");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(count);
    const board = sql.slice(sql.indexOf("function public.team_board"));
    expect(board.indexOf("Equipe não encontrada")).toBeLessThan(board.indexOf("share_progress"));
    expect(board).toContain("share_progress");
  });

  it("a busca não devolve e-mail nem rola", () => {
    const search = sql.slice(sql.indexOf("function public.search_profiles"), sql.indexOf("function public.team_week_total"));
    expect(search).toContain("p.discoverable");
    expect(search).toContain("limit 8");
    expect(search).not.toContain("p.email");
    expect(search).not.toContain("rolas");
    expect(search).not.toContain("training_sessions");
  });
});