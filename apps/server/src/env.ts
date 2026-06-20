import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(13001),
  BEVO_API_BASE: z.string().default("https://api.bevo.app"),
  BEVO_AGENT_API_KEY: z.string().default(""),
  BEVO_AGENT_ID: z.string().default(""),
  POT_PRIVATE_KEY: z.string().default(""),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
