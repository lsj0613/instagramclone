import { UuidSchema } from "@/lib/validation";
import z from "zod";

// [validation.ts]
export const ToggleLikeSchema = z.object({
  targetId: UuidSchema,
  targetType: z.enum(["POST", "COMMENT"]),
  finalIsLiked: z.boolean(),
});
export type ToggleLikeDTO = z.infer<typeof ToggleLikeSchema> & {
  userId: string;
};
