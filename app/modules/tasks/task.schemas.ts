import { z } from "zod";

export const taskSeveritySchema = z.enum(["low", "medium", "high"]);
export const taskStatusSchema = z.enum(["todo", "done"]);

const titleSchema = z.string().trim().min(1, "Add a title for your task.").max(200, "Keep the title under 200 characters.");
const descriptionSchema = z.string().trim().max(2000, "Description must be at most 2000 characters.");
const formDueAtSchema = z
  .string()
  .trim()
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Choose a valid date and time.");
const apiDueAtSchema = z.iso.datetime({ offset: true });

export const taskFormSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  severity: taskSeveritySchema,
  dueAt: formDueAtSchema,
}).strict();

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  severity: taskSeveritySchema.optional(),
  dueAt: apiDueAtSchema.nullable().optional(),
}).strict();

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  severity: taskSeveritySchema.optional(),
  status: taskStatusSchema.optional(),
  dueAt: apiDueAtSchema.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
