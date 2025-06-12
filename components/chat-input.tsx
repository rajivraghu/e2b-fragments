'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormEvent } from 'react'

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  children,
}: {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  children: React.ReactNode
}) {
  return (
    <form onSubmit={handleSubmit} className="mt-auto flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {children}
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>Send</Button>
      </div>
    </form>
  )
}
