import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import {
  beginTotp,
  changePassword,
  confirmTotp,
  disableTotp,
  setSecurityQuestion,
} from "@/lib/security-settings";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("password"),
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(10, "Use at least 10 characters."),
  }),
  z.object({ action: z.literal("totp-begin") }),
  z.object({
    action: z.literal("totp-confirm"),
    code: z.string().trim().min(6).max(8),
  }),
  z.object({
    action: z.literal("totp-disable"),
    code: z.string().trim().min(6).max(8),
  }),
  z.object({
    action: z.literal("question"),
    question: z.string().trim().min(5).max(200),
    answer: z.string().trim().min(3, "That answer is too short to be useful."),
  }),
]);

export const POST = (request: Request) =>
  settingsWrite(request, Body, async (viewer, input) => {
    switch (input.action) {
      case "password":
        return changePassword(viewer, input);
      case "totp-begin":
        return beginTotp(viewer);
      case "totp-confirm":
        return confirmTotp(viewer, input.code);
      case "totp-disable":
        return disableTotp(viewer, input.code);
      case "question":
        return setSecurityQuestion(viewer, input);
    }
  });
