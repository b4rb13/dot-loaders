'use client';
import { LoadingRegion, TypingDots } from '@dotquilt/react';
import { useEffect, useState } from 'react';

async function fetchReply(
  question: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    body: JSON.stringify({ question }),
    signal,
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const { reply } = await response.json();
  return reply;
}

export function AssistantReply({ question }: { question: string }) {
  const [reply, setReply] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const request = new AbortController();
    setReply(null);
    setFailed(false);
    fetchReply(question, request.signal)
      .then(setReply)
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    return () => request.abort();
  }, [question]);

  return (
    <LoadingRegion
      aria-label="Assistant reply"
      state={reply === null && !failed ? 'pending' : 'ready'}
      cycle={question}
      timing={failed ? { duration: 0 } : undefined}
      placeholder={
        <div className="bubble">
          <TypingDots />
        </div>
      }
    >
      <div className="bubble">
        {failed ? "Sorry, I couldn't answer that. Try again." : reply}
      </div>
    </LoadingRegion>
  );
}

export function Chat() {
  return <AssistantReply question="When is the Globex invoice due?" />;
}
