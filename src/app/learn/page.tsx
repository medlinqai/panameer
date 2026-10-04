import { getMyLearning } from "@/lib/learn-dashboard";
import { MyLearning } from "@/components/learn/app/MyLearning";
import { memberOrPublicTwin } from "@/lib/public-twin";

export const metadata = {
  title: "My Learning — Panameer",
  description: "Your learning paths, courses and progress on Panameer.",
};

export default async function LearnPage() {
  const viewer = await memberOrPublicTwin("/learn");

  const data = await getMyLearning(viewer.userId);
  return <MyLearning data={data} />;
}
