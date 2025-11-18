import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';
import { IssueDetailSheet } from '@/components/issue/IssueDetailSheet';

const priorityColors = {
  low: 'bg-priority-low text-priority-low-foreground',
  medium: 'bg-priority-medium text-priority-medium-foreground',
  high: 'bg-priority-high text-priority-high-foreground',
  critical: 'bg-priority-critical text-priority-critical-foreground',
};

export default function Backlog() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [issues, setIssues] = useState<any[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
    loadProfiles();
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      loadIssues();
    }
  }, [selectedProject]);

  useEffect(() => {
    const project = searchParams.get('project');
    if (project) {
      setSelectedProject(project);
    }
  }, [searchParams]);

  useEffect(() => {
    // Filter issues based on search term
    if (searchTerm) {
      setFilteredIssues(
        issues.filter(
          (issue) =>
            issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            issue.issue_key.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredIssues(issues);
    }
  }, [searchTerm, issues]);

  const loadProjects = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('name');

    if (!error && data) {
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    }
  };

  const loadProfiles = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('org_id', profile.org_id);

    if (data) setProfiles(data);
  };

  const loadIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('project_id', selectedProject)
      .eq('status', 'backlog')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setIssues(data);
    }
  };

  const getAssigneeProfiles = (assigneeIds: string[]) => {
    return profiles.filter((p) => assigneeIds?.includes(p.id));
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Backlog</h1>
              <p className="text-muted-foreground">
                Prioritize and plan your upcoming work
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Issue
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'No issues match your search'
                  : 'No backlog items. Create your first issue!'}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Issue
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIssues.map((issue) => {
                const assignees = getAssigneeProfiles(issue.assignee_ids || []);
                return (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    className="group flex items-center gap-3 p-4 bg-card border rounded-lg hover:bg-accent/5 cursor-pointer transition-colors"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">
                          {issue.issue_key}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {issue.type}
                        </Badge>
                        <Badge className={`text-xs ${priorityColors[issue.priority as keyof typeof priorityColors]}`}>
                          {issue.priority}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">{issue.title}</p>
                      {issue.estimate_points && (
                        <span className="text-sm text-muted-foreground">
                          {issue.estimate_points} points
                        </span>
                      )}
                    </div>

                    {assignees.length > 0 && (
                      <div className="flex -space-x-2">
                        {assignees.slice(0, 3).map((assignee) => (
                          <Avatar key={assignee.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={assignee.avatar_url} />
                            <AvatarFallback>
                              {assignee.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {assignees.length > 3 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                            +{assignees.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateIssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultProjectId={selectedProject}
        onSuccess={loadIssues}
      />

      {selectedIssue && (
        <IssueDetailSheet
          issueId={selectedIssue.id}
          open={!!selectedIssue}
          onOpenChange={(open) => !open && setSelectedIssue(null)}
          onUpdate={loadIssues}
        />
      )}
    </MainLayout>
  );
}
