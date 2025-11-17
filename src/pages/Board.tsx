import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Issue {
  id: string;
  issue_key: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  assignee_ids: string[];
}

const statusColumns = [
  { id: 'backlog', label: 'Backlog', color: 'bg-status-backlog' },
  { id: 'todo', label: 'To Do', color: 'bg-status-todo' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-status-in-progress' },
  { id: 'in_review', label: 'In Review', color: 'bg-status-in-review' },
  { id: 'done', label: 'Done', color: 'bg-status-done' },
];

const priorityIcons = {
  critical: <AlertCircle className="h-3 w-3 text-priority-critical" />,
  high: <ArrowUp className="h-3 w-3 text-priority-high" />,
  medium: <Minus className="h-3 w-3 text-priority-medium" />,
  low: <ArrowDown className="h-3 w-3 text-priority-low" />,
};

export default function Board() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIssues();
  }, [user]);

  const loadIssues = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIssuesByStatus = (status: string) => {
    return issues.filter((issue) => issue.status === status);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Board</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage your team's work
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((column) => {
          const columnIssues = getIssuesByStatus(column.id);
          return (
            <div key={column.id} className="flex-shrink-0 w-80">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {columnIssues.length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {columnIssues.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center p-6">
                      <p className="text-sm text-muted-foreground">No issues</p>
                    </CardContent>
                  </Card>
                ) : (
                  columnIssues.map((issue) => (
                    <Card
                      key={issue.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {issue.issue_key}
                            </span>
                            {priorityIcons[issue.priority as keyof typeof priorityIcons]}
                          </div>
                          <p className="text-sm font-medium leading-snug line-clamp-2">
                            {issue.title}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {issue.type}
                            </Badge>
                            {issue.assignee_ids.length > 0 && (
                              <div className="flex -space-x-2">
                                {issue.assignee_ids.slice(0, 3).map((_, idx) => (
                                  <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback className="text-xs">
                                      {String.fromCharCode(65 + idx)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
