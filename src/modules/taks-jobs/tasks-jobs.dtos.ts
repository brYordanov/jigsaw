import z from 'zod'

export const TaskJobRowSchema = z.object({
    id: z.number().int().positive(),
    task_id: z.number().int().positive(),
    job_id: z.string(),
    position: z.number().int().positive(),
    created_at: z.string(),
    updated_at: z.string(),
})
export type TaskJobRowDto = z.infer<typeof TaskJobRowSchema>

export const CreateTaskJobBodySchema = z.object({
    taskId: z.number(),
    jobId: z.string(),
    position: z.number(),
})
export type CreateTaskJobBodyDto = z.infer<typeof CreateTaskJobBodySchema>
