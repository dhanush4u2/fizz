import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { CreateOrgDialog } from '@/components/org/CreateOrgDialog';
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';
import { CreateInviteDialog } from '@/components/invite/CreateInviteDialog';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  action?: () => void;
  actionLabel?: string;
}

export function SmartDashboard() {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadDashboard = async () => {
    if (!user) return;

    // Check if user has an org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    const hasOrg = !!profile?.org_id;
    setOrgId(profile?.org_id || null);

    let hasProject = false;
    let hasIssue = false;
    let hasInvited = false;

    if (hasOrg) {
      // Check if org has projects
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id);
      hasProject = (projectCount || 0) > 0;

      // Check if any project has issues
      if (hasProject) {
        const { count: issueCount } = await supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', (await supabase.from('projects').select('id').eq('org_id', profile.org_id).limit(1).single()).data?.id);
        hasIssue = (issueCount || 0) > 0;
      }

      // Check if user has sent invites
      const { count: inviteCount } = await supabase
        .from('invites')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id);
      hasInvited = (inviteCount || 0) > 0;
    }

    const items: ChecklistItem[] = [
      {
        id: 'create_org',
        label: 'Create Organization',
        description: 'Set up your workspace',
        done: hasOrg,
        action: () => setOrgDialogOpen(true),
        actionLabel: 'Create Org',
      },
      {
        id: 'create_project',
        label: 'Create Project',
        description: 'Start your first project',
        done: hasProject,
        action: hasOrg ? () => setProjectDialogOpen(true) : undefined,
        actionLabel: 'Create Project',
      },
      {
        id: 'create_issue',
        label: 'Create First Issue',
        description: 'Add your first task',
        done: hasIssue,
        action: hasProject ? () => setIssueDialogOpen(true) : undefined,
        actionLabel: 'Create Issue',
      },
      {
        id: 'invite_team',
        label: 'Invite Teammates',
        description: 'Collaborate with your team',
        done: hasInvited,
        action: hasOrg ? () => setInviteDialogOpen(true) : undefined,
        actionLabel: 'Invite Team',
      },
    ];

    setChecklist(items);
    const completedCount = items.filter((i) => i.done).length;
    setProgress((completedCount / items.length) * 100);
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const nextAction = checklist.find((item) => !item.done && item.action);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Complete these steps to set up your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${item.done ? 'text-muted-foreground line-through' : ''}`}>
                    {item.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {!item.done && item.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={item.action}
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {nextAction && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Suggested next step:
              </p>
              <Button onClick={nextAction.action} className="w-full">
                {nextAction.actionLabel}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOrgDialog
        open={orgDialogOpen}
        onOpenChange={setOrgDialogOpen}
        onSuccess={loadDashboard}
      />
      {orgId && (
        <>
          <CreateProjectDialog
            open={projectDialogOpen}
            onOpenChange={setProjectDialogOpen}
            onSuccess={loadDashboard}
          />
          <CreateIssueDialog
            open={issueDialogOpen}
            onOpenChange={setIssueDialogOpen}
            onSuccess={loadDashboard}
          />
          <CreateInviteDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            orgId={orgId}
            onSuccess={loadDashboard}
          />
        </>
      )}
    </>
  );
}
