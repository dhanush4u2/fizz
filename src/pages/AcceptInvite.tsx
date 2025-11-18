import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (user) {
      acceptInvite();
    }
  }, [user]);

  const acceptInvite = async () => {
    const token = searchParams.get('token');
    if (!token || !user) {
      setStatus('error');
      setMessage('Invalid invitation link');
      return;
    }

    try {
      // Get invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*, organizations(name)')
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      if (inviteError || !invite) {
        setStatus('error');
        setMessage('Invitation not found or already accepted');
        return;
      }

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        setStatus('expired');
        setMessage('This invitation has expired');
        return;
      }

      // Check if email matches
      if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
        setStatus('error');
        setMessage('This invitation was sent to a different email address');
        return;
      }

      // Update user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ org_id: invite.org_id })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Create user_role entry
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          org_id: invite.org_id,
          role: invite.role,
        });

      if (roleError) throw roleError;

      // Mark invite as accepted
      const { error: updateError } = await supabase
        .from('invites')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      setOrgName((invite.organizations as any).name);
      setStatus('success');
      setMessage(`You've successfully joined ${(invite.organizations as any).name}!`);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to accept invitation');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Please sign in to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === 'loading' && 'Accepting invitation...'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Error'}
            {status === 'expired' && 'Invitation Expired'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="text-center">{message}</p>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </>
          )}
          {(status === 'error' || status === 'expired') && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center">{message}</p>
              <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
