import React, { useState } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { cn } from '../lib/utils';

const SpeechPractice = () => {
  const { isRecording, transcript, error, startRecording, stopRecording } = useSpeechRecognition();
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      getFeedback();
    } else {
      startRecording();
      setFeedback('');
    }
  };

  const getFeedback = async () => {
    if (!transcript.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a speech coach. The user will provide a text they spoke. Analyze it for pronunciation, fluency, and grammar mistakes. Provide constructive feedback and corrections. Keep your feedback concise and easy to understand.',
            },
            {
              role: 'user',
              content: transcript,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback from AI.');
      }

      const data = await response.json();
      setFeedback(data.result);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Speech Practice</h1>
        <p className="text-slate-500">Practice your speaking skills and get instant feedback.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              className={cn(
                'w-24 h-24 rounded-full transition-colors',
                isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'
              )}
              onClick={handleToggleRecording}
            >
              <Mic size={48} />
            </Button>
            <p className="text-lg font-medium">{isRecording ? 'Recording...' : 'Tap to speak'}</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Your Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{transcript}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p>Analyzing your speech...</p>
        </div>
      )}

      {feedback && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>AI Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{feedback}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpeechPractice;
