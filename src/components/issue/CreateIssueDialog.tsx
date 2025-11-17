import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultProjectId?: string;
}

export function CreateIssueDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultProjectId 
}: CreateIssueDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'task' | 'bug' | 'story' | 'epic' | 'spike'>('task');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, user]);

  const loadProjects = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, key')
      .order('name');

    if (!error && data) {
      setProjects(data);
      if (data.length > 0 && !projectId) {
        setProjectId(data[0].id);
      }
    }
  };

  const generateIssueKey = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;

    // Get the count of existing issues in this project
    const { count } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    return `${project.key}-${(count || 0) + 1}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId) return;

    setLoading(true);
    try {
      const issueKey = await generateIssueKey(projectId);
      if (!issueKey) throw new Error('Failed to generate issue key');

      const { error } = await supabase
        .from('issues')
        .insert({
          project_id: projectId,
          issue_key: issueKey,
          title,
          description,
          type,
          priority,
          status: 'backlog',
          reporter_id: user.id,
          assignee_ids: [],
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Issue ${issueKey} created successfully!`,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setType('task');
      setPriority('medium');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create issue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Issue</DialogTitle>
            <DialogDescription>
              Create a new task, bug, story, or other work item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="spike">Spike</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Add login form validation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title || !projectId}>
              {loading ? 'Creating...' : 'Create Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
