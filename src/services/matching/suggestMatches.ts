import { scoreActivityToSession } from "./scoreActivityToSession";
import {
  MATCH_SCORE_THRESHOLD,
  type ActivityForMatch,
  type MatchSuggestion,
  type SessionForMatch,
} from "./types";

export function suggestMatches(
  activities: ActivityForMatch[],
  sessions: SessionForMatch[],
  threshold: number = MATCH_SCORE_THRESHOLD,
): MatchSuggestion[] {
  const sortedActivities = [...activities].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
  const openSessions = [...sessions].sort((a, b) => a.order - b.order);

  type Pair = MatchSuggestion & { activityId: string };
  const pairs: Pair[] = [];

  sortedActivities.forEach((activity, rank) => {
    openSessions.forEach((session, sessionIndex) => {
      const { score, reasons } = scoreActivityToSession(
        activity,
        session,
        rank,
        sessionIndex,
      );
      if (score < threshold) return;
      pairs.push({
        activityId: activity.id,
        sessionOrder: session.order,
        score,
        reasons,
      });
    });
  });

  pairs.sort((a, b) => b.score - a.score);

  const usedActivities = new Set<string>();
  const usedSessions = new Set<number>();
  const suggestions: MatchSuggestion[] = [];

  for (const pair of pairs) {
    if (usedActivities.has(pair.activityId)) continue;
    if (usedSessions.has(pair.sessionOrder)) continue;
    usedActivities.add(pair.activityId);
    usedSessions.add(pair.sessionOrder);
    suggestions.push({
      activityId: pair.activityId,
      sessionOrder: pair.sessionOrder,
      score: pair.score,
      reasons: pair.reasons,
    });
  }

  return suggestions;
}
