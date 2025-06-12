'use client'

import { Chat } from '@/components/chat'
import { ChatInput } from '@/components/chat-input'
import { ChatPicker } from '@/components/chat-picker'
import { LLMModelConfig } from '@/lib/models'
import modelsList from '@/lib/models.json'
import { useChat } from 'ai/react'
import { useLocalStorage } from 'usehooks-ts'

export default function Home() {
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>('languageModel', {
    model: modelsList.models[0].id,
  })

  const currentModel = modelsList.models.find((m) => m.id === languageModel.model)!

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: '/api/chat',
    body: { model: currentModel, config: languageModel },
  })

  return (
    <main className="flex min-h-screen max-h-screen">
      <div className="flex flex-col w-full max-h-full max-w-[800px] mx-auto px-4">
        <Chat messages={messages as any} isLoading={isLoading} />
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        >
          <ChatPicker
            models={modelsList.models}
            languageModel={languageModel}
            onLanguageModelChange={setLanguageModel}
          />
        </ChatInput>
      </div>
    </main>
  )
}
