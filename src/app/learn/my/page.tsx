import { getMyLearning } from "@/lib/learn-dashboard";
import { MyLearning } from "@/components/learn/app/MyLearning";
import { memberOrPublicTwin } from "@/lib/public-twin";

export const metadata = {
  title: "My Learning — Panameer",
  description: "Your learning paths, courses and progress on Panameer.",
};

// Learn › My Learning (moved from /learn when Home became the landing tab, 2026-10-08).
export default async function MyLearningPage() {
  const viewer = await memberOrPublicTwin("/learn");
  const data = await getMyLearning(viewer.userId);
  return <MyLearning data={data} />;
}
