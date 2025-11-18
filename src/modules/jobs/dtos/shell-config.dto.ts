import z from 'zod'

export const ShellConfigSchema = z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
    cwd: z.string().optional(),
    env: z.record(z.string(), z.unknown()).default({}),
})
export type ShellConfigDto = z.infer<typeof ShellConfigSchema>
