import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, FolderKanban, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { CreateOrgDialog } from '@/components/org/CreateOrgDialog';
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    projects: 0,
    activeIssues: 0,
    completedIssues: 0,
  });
  const [hasOrg, setHasOrg] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  useEffect(() => {
    loadStats();
    checkUserOrg();
  }, [user]);

  const checkUserOrg = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    setHasOrg(!!data?.org_id);
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'done');

      const { count: doneCount } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done');

      setStats({
        projects: projectCount || 0,
        activeIssues: activeCount || 0,
        completedIssues: doneCount || 0,
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's what's happening with your projects.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all workspaces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!hasOrg ? (
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowOrgDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            ) : (
              <>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setShowIssueDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Issue
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setShowProjectDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Project
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Set up your workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-1 ${hasOrg ? 'bg-primary/10' : 'bg-muted'}`}>
                {hasOrg ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Create your first organization</p>
                <p className="text-xs text-muted-foreground">Set up your workspace and invite team members</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-1 ${stats.projects > 0 ? 'bg-primary/10' : 'bg-muted'}`}>
                {stats.projects > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Create your first project</p>
                <p className="text-xs text-muted-foreground">Start tracking work with a new project</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-1 ${stats.activeIssues > 0 ? 'bg-primary/10' : 'bg-muted'}`}>
                {stats.activeIssues > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Add your first task</p>
                <p className="text-xs text-muted-foreground">Create and assign tasks to your team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateOrgDialog 
        open={showOrgDialog} 
        onOpenChange={setShowOrgDialog}
        onSuccess={() => {
          loadStats();
          checkUserOrg();
        }}
      />
      <CreateProjectDialog 
        open={showProjectDialog} 
        onOpenChange={setShowProjectDialog}
        onSuccess={loadStats}
      />
      <CreateIssueDialog 
        open={showIssueDialog} 
        onOpenChange={setShowIssueDialog}
        onSuccess={loadStats}
      />
    </div>
  );
}
