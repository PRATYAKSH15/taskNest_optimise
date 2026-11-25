import "server-only";

import { z } from "zod";
import type { TaskRecord } from "@/app/modules/tasks/task.types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

const groqResponseSchema = z.object({
  answer: z.string().trim().min(1).max(500),
  matchingTaskIds: z.array(z.string()),
});

export interface TaskSearchResult {
  answer: string;
  matchingTaskIds: string[];
}

function formatDateInTimeZone(date: Date, timeZone: string | undefined): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}

/** Uses Groq to answer natural-language questions and filter the user's tasks. */
export async function searchTasksWithGroq({
  query,
  tasks,
  timeZone,
}: {
  query: string;
  tasks: TaskRecord[];
  timeZone?: string;
}): Promise<TaskSearchResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const now = new Date();
  const validIds = new Set(tasks.map((task) => task.id));

  const taskContext = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.severity,
    dueLocal: task.dueAt ? formatDateInTimeZone(task.dueAt, timeZone) : null,
    isOverdue: Boolean(task.dueAt && task.status === "todo" && task.dueAt.getTime() <= now.getTime()),
    createdLocal: formatDateInTimeZone(task.createdAt, timeZone),
  }));

  const systemPrompt = [
    "You are a concise task assistant for TaskNest.",
    "Given the user's current local date/time and their task list, answer the user's question or search query accurately.",
    "Interpret phrases like 'left', 'remaining', 'pending', 'open' as status='todo', and 'completed', 'finished', 'done' as status='done'.",
    "Interpret dates like 'today', 'tomorrow', '26 november', 'this week', or 'overdue' using the provided currentLocalDateTime and each task's dueLocal / isOverdue fields.",
    "Respond ONLY with valid JSON matching this shape:",
    '{"answer": "short helpful 1-2 sentence summary", "matchingTaskIds": ["exact-task-id"]}',
    "Refer to tasks by their title (never raw IDs) in answer, and include ONLY exact task IDs from the provided tasks array in matchingTaskIds.",
  ].join(" ");

  const userPayload = JSON.stringify({
    currentLocalDateTime: formatDateInTimeZone(now, timeZone),
    timeZone: timeZone || "UTC",
    query,
    tasks: taskContext,
  });

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Groq API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = payload.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Groq returned an empty response.");
  }

  const parsedJson: unknown = JSON.parse(rawContent);
  const parsed = groqResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Groq returned an unexpected response format.");
  }

  return {
    answer: parsed.data.answer,
    matchingTaskIds: Array.from(
      new Set(parsed.data.matchingTaskIds.filter((id) => validIds.has(id))),
    ),
  };
}
