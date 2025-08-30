"use server";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function getAIResponse(question: string) {
  const { text } = await generateText({
    model: openai("gpt-3.5-turbo"),
    system: "You are a helpful assistant.",
    prompt: question,
  });

  return { answer: text };
}
