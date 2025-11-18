import { Button } from '~/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/Card';

interface AuthRequiredProps {
  reason: 'not-authenticated' | 'no-credits';
}

export function AuthRequired({ reason }: AuthRequiredProps) {
  if (reason === 'not-authenticated') {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rax-elements-background-depth-2 flex items-center justify-center mb-4">
              <div className="i-ph:lock text-2xl" />
            </div>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You need to be signed in to start a conversation with the AI</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => (window.location.href = '/login')} className="w-full">
              Sign In
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/signup')} className="w-full">
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-rax-elements-background-depth-2 flex items-center justify-center mb-4">
            <div className="i-ph:lightning-slash text-2xl text-yellow-500" />
          </div>
          <CardTitle>Out of credits</CardTitle>
          <CardDescription>
            You've used all your AI message credits. Get more to continue chatting!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-rax-elements-background-depth-2 border border-rax-elements-borderColor">
              <h4 className="font-medium mb-2">Your options:</h4>
              <ul className="space-y-2 text-sm text-rax-elements-textSecondary">
                <li className="flex items-start gap-2">
                  <div className="i-ph:clock mt-0.5" />
                  <span>
                    <strong>Wait:</strong> Free users get 5 credits daily (resets at midnight UTC)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="i-ph:lightning-fill text-yellow-500 mt-0.5" />
                  <span>
                    <strong>Upgrade:</strong> Get 100 credits/month for $19.99
                  </span>
                </li>
              </ul>
            </div>
            <Button onClick={() => (window.location.href = '/pricing')} className="w-full">
              <div className="i-ph:lightning-fill mr-2" />
              Get More Credits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


