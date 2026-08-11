import { z } from "zod";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || undefined);

export const waitlistSubmissionSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().max(254).pipe(z.email("Informe um e-mail válido")).transform((value) => value.toLowerCase()),
  company: optionalText(120),
  role: optionalText(80),
  source: z.string().trim().min(2).max(80).default("lista-de-espera"),
  website: optionalText(200),
}).strict();

export type WaitlistSubmission = z.infer<typeof waitlistSubmissionSchema>;

export interface WaitlistLead {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export function parseWaitlistSubmission(input: unknown) {
  return waitlistSubmissionSchema.parse(input);
}
