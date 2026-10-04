

export type PathStanding = "done" | "in-progress" | "test-ready" | "not-started";

export type StandingView = {
  standing: PathStanding;
  action: string;
};

export function standingFor(card: {
  enrolled: boolean;
  progress: number | null;
  testReady: boolean;
}): StandingView {
  const complete = card.progress === 100;

  if (complete && card.testReady) return { standing: "test-ready", action: "Take the Test" };
  if (complete) return { standing: "done", action: "Review" };
  if (card.enrolled) return { standing: "in-progress", action: "Continue" };
  return { standing: "not-started", action: "Enroll" };
}
