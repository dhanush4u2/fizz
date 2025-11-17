import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowUp, ArrowDown, Minus, X } from 'lucide-react';

interface IssueDetailSheetProps {
  issueId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const priorityConfig = {
  critical: { icon: AlertCircle, color: 'text-priority-critical', label: 'Critical' },
  high: { icon: ArrowUp, color: 'text-priority-high', label: 'High' },
  medium: { icon: Minus, color: 'text-priority-medium', label: 'Medium' },
  low: { icon: ArrowDown, color: 'text-priority-low', label: 'Low' },
};

const statusConfig = {
  backlog: { label: 'Backlog', color: 'bg-status-backlog' },
  todo: { label: 'To Do', color: 'bg-status-todo' },
  in_progress: { label: 'In Progress', color: 'bg-status-in-progress' },
  in_review: { label: 'In Review', color: 'bg-status-in-review' },
  blocked: { label: 'Blocked', color: 'bg-status-blocked' },
  done: { label: 'Done', color: 'bg-status-done' },
};

export function IssueDetailSheet({ issueId, open, onOpenChange, onUpdate }: IssueDetailSheetProps) {
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (issueId && open) {
      loadIssue();
    }
  }, [issueId, open]);

  const loadIssue = async () => {
    if (!issueId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single();

      if (error) throw error;
      setIssue(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load issue details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateIssueField = async (field: string, value: any) => {
    if (!issueId) return;

    try {
      const { error } = await supabase
        .from('issues')
        .update({ [field]: value })
        .eq('id', issueId);

      if (error) throw error;

      setIssue((prev: any) => ({ ...prev, [field]: value }));
      onUpdate?.();
      
      toast({
        title: 'Updated',
        description: `Issue ${field} updated successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update issue',
        variant: 'destructive',
      });
    }
  };

  if (!issue && !loading) {
    return null;
  }

  const PriorityIcon = issue?.priority ? priorityConfig[issue.priority as keyof typeof priorityConfig]?.icon : Minus;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : issue ? (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {issue.issue_key}
                    </span>
                    <Badge variant="outline">{issue.type}</Badge>
                  </div>
                  <SheetTitle className="text-2xl">{issue.title}</SheetTitle>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={issue.status}
                    onValueChange={(value) => updateIssueField('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${config.color}`} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={issue.priority}
                    onValueChange={(value) => updateIssueField('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-3 w-3 ${config.color}`} />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                {issue.description ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {issue.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided</p>
                )}
              </div>

              <Separator />

              {/* Labels */}
              {issue.labels && issue.labels.length > 0 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Labels</label>
                    <div className="flex flex-wrap gap-2">
                      {issue.labels.map((label: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Metadata */}
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  Created {new Date(issue.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div>
                  Updated {new Date(issue.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
