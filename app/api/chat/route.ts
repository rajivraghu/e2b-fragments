import { getModelClient, LLMModel, LLMModelConfig } from '@/lib/models'
import { streamText, LanguageModel, CoreMessage } from 'ai'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, model, config }: { messages: CoreMessage[]; model: LLMModel; config: LLMModelConfig } = await req.json()

  const modelClient = getModelClient(model, config) as any

  try {
    const stream = await streamText({
      model: modelClient as any,
      system: 'You are a helpful assistant.',
      messages,
      ...config,
    })

    return stream.toTextStreamResponse()
  } catch (error: any) {
    console.error('Error:', error)
    return new Response('An unexpected error has occurred. Please try again later.', { status: 500 })
  }
}
