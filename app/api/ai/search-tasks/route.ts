import { NextResponse } from "next/server";
import { z } from "zod";
import { searchTasksWithGroq } from "@/app/modules/ai/task-search.service";
import { TaskService } from "@/app/modules/tasks/task.service";
import { getCurrentUser } from "@/lib/auth-session";

const taskService = new TaskService();

const searchTasksRequestSchema = z
  .object({
    query: z.string().trim().min(1, "Enter a question or search query.").max(300),
    timeZone: z.string().trim().max(100).optional(),
  })
  .strict();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = searchTasksRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a search question up to 300 characters." },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const tasks = await taskService.listTasks(user.id);
    if (!tasks.length) {
      return NextResponse.json({
        answer: "You don't have any tasks in your list yet.",
        matchingTaskIds: [],
      });
    }

    const result = await searchTasksWithGroq({
      query: parsed.data.query,
      tasks,
      timeZone: parsed.data.timeZone,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("GROQ_API_KEY")
        ? "AI search is not configured on the server."
        : "Could not complete AI task search right now.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
