// FILE: app/page.tsx
'use client'

import { ViewType } from '@/components/auth'
import { AuthDialog } from '@/components/auth-dialog'
import { Chat } from '@/components/chat'
import { ChatInput } from '@/components/chat-input'
import { ChatSettings } from '@/components/chat-settings'
import { NavBar } from '@/components/navbar'
import { useAuth } from '@/lib/auth'
import { Message, toAISDKMessages, toMessageImage } from '@/lib/messages'
import { LLMModelConfig } from '@/lib/models'
import modelsList from '@/lib/models.json'
import { supabase } from '@/lib/supabase'
import { useCompletion } from 'ai/react'
import { usePostHog } from 'posthog-js/react'
import { SetStateAction, useEffect, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Image from 'next/image'
import 'core-js/features/object/group-by.js' // For Object.groupBy

export default function Home() {
  const [chatInput, setChatInput] = useLocalStorage('chat', '')
  const [files, setFiles] = useState<File[]>([])
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    'languageModel',
    { model: 'claude-3-5-sonnet-latest' },
  )

  const posthog = usePostHog()

  const [messages, setMessages] = useState<Message[]>([])
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState<ViewType>('sign_in')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { session, userTeam } = useAuth(setAuthDialog, setAuthView)

  const filteredModels = modelsList.models.filter((model) => {
    if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
      return model.providerId !== 'ollama'
    }
    return true
  })

  const currentModel = filteredModels.find(
    (model) => model.id === languageModel.model,
  )

  // -------------------  useCompletion -------------------
  const { completion, isLoading, stop, error, complete } = useCompletion({
    api: '/api/chat',
    // No streamProtocol override ⇒ default "data" - matches server below
    onError: (err) => {
      console.error('Error submitting request:', err)
      if (err.message.includes('limit')) setIsRateLimited(true)
      setErrorMessage(err.message)
    },
  })
  // ------------------------------------------------------

  useEffect(() => {
    if (!completion) return
    setMessages((curr) => {
      const last = curr[curr.length - 1]
      if (last?.role === 'assistant') {
        const updated = [...curr]
        updated[curr.length - 1].content = [{ type: 'text', text: completion }]
        return updated
      }
      return [
        ...curr,
        { role: 'assistant', content: [{ type: 'text', text: completion }] },
      ]
    })
  }, [completion])

  useEffect(() => {
    if (error) stop()
  }, [error])

  async function handleSubmitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return setAuthDialog(true)
    if (isLoading) {
      stop()
      return
    }

    const content: Message['content'] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)
    images.forEach((img) => content.push({ type: 'image', image: img }))

    const userMessage: Message = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    complete(chatInput, {
      body: {
        messages: toAISDKMessages(newMessages),
        model: currentModel,
        config: languageModel,
        userID: session?.user?.id,
        teamID: userTeam?.id,
      },
    })

    setChatInput('')
    setFiles([])
    posthog.capture('chat_submit', { model: languageModel.model })
  }

  function retry() {
    const lastUserMsg = messages.findLast((m) => m.role === 'user')
    if (!lastUserMsg) return
    complete(lastUserMsg.content[0].text, {
      body: {
        messages: toAISDKMessages(messages),
        model: currentModel,
        config: languageModel,
        userID: session?.user?.id,
        teamID: userTeam?.id,
      },
    })
  }

  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInput(e.target.value)
  }

  function handleFileChange(change: SetStateAction<File[]>) {
    setFiles(change)
  }

  function logout() {
    supabase
      ? supabase.auth.signOut()
      : console.warn('Supabase is not initialized')
  }

  function handleLanguageModelChange(e: LLMModelConfig) {
    setLanguageModel({ ...languageModel, ...e })
  }

  function handleSocialClick(target: 'github' | 'x' | 'discord') {
    const urls = {
      github: 'https://github.com/e2b-dev/fragments',
      x: 'https://x.com/e2b_dev',
      discord: 'https://discord.gg/U7KEcGErtQ',
    } as const
    window.open(urls[target], '_blank')
    posthog.capture(`${target}_click`)
  }

  function handleClearChat() {
    stop()
    setChatInput('')
    setFiles([])
    setMessages([])
  }

  function handleUndo() {
    setMessages((prev) => [...prev.slice(0, -2)])
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      {supabase && (
        <AuthDialog
          open={isAuthDialogOpen}
          setOpen={setAuthDialog}
          view={authView}
          supabase={supabase}
        />
      )}
      <div className="grid w-full md:grid-cols-1">
        <div className="flex flex-col w-full max-h-full max-w-[800px] mx-auto px-4 overflow-auto">
          <NavBar
            session={session}
            showLogin={() => setAuthDialog(true)}
            signOut={logout}
            onSocialClick={handleSocialClick}
            onClear={handleClearChat}
            canClear={messages.length > 0}
            canUndo={messages.length > 1 && !isLoading}
            onUndo={handleUndo}
          />
          <Chat messages={messages} isLoading={isLoading} />
          <ChatInput
            retry={retry}
            isErrored={error !== undefined}
            errorMessage={errorMessage}
            isLoading={isLoading}
            isRateLimited={isRateLimited}
            stop={stop}
            input={chatInput}
            handleInputChange={handleSaveInputChange}
            handleSubmit={handleSubmitAuth}
            isMultiModal={currentModel?.multiModal || false}
            files={files}
            handleFileChange={handleFileChange}
          >
            <div className="flex flex-col">
              <Select
                name="languageModel"
                value={languageModel.model}
                onValueChange={(v) => handleLanguageModelChange({ model: v })}
              >
                <SelectTrigger className="whitespace-nowrap border-none shadow-none focus:ring-0 px-0 py-0 h-6 text-xs">
                  <SelectValue placeholder="Language model" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(
                    Object.groupBy(filteredModels, ({ provider }) => provider),
                  ).map(([provider, models]) => (
                    <SelectGroup key={provider}>
                      <SelectLabel>{provider}</SelectLabel>
                      {models?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center space-x-2">
                            <Image
                              src={`/thirdparty/logos/${m.providerId}.svg`}
                              alt={m.provider}
                              width={14}
                              height={14}
                            />
                            <span>{m.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ChatSettings
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
              apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
              baseURLConfigurable={!process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT}
            />
          </ChatInput>
        </div>
      </div>
    </main>
  )
}
