-- Create enum types for better type safety
CREATE TYPE app_role AS ENUM ('owner', 'admin', 'manager', 'contributor', 'viewer');
CREATE TYPE issue_type AS ENUM ('task', 'bug', 'story', 'epic', 'subtask', 'spike');
CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE issue_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done');
CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Profiles table for additional user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'contributor',
  github_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, key)
);

-- Sprints table
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sprint',
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status sprint_status NOT NULL DEFAULT 'planned',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Issues table (tasks, bugs, stories, etc.)
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  parent_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  issue_key TEXT NOT NULL,
  type issue_type NOT NULL DEFAULT 'task',
  title TEXT NOT NULL,
  description TEXT,
  priority issue_priority NOT NULL DEFAULT 'medium',
  status issue_status NOT NULL DEFAULT 'backlog',
  estimate_points INTEGER,
  estimate_hours FLOAT,
  reporter_id UUID REFERENCES auth.users(id) NOT NULL,
  assignee_ids UUID[] DEFAULT ARRAY[]::UUID[],
  watcher_ids UUID[] DEFAULT ARRAY[]::UUID[],
  labels TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(project_id, issue_key)
);

-- Boards table (kanban views)
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::JSONB,
  filter_query JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (auth.uid() = owner_user_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE org_id = organizations.id
  ));

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Authenticated users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Managers and above can create projects"
  ON projects FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'admin', 'manager')
  ));

-- RLS Policies for sprints
CREATE POLICY "Users can view sprints in their organization"
  ON sprints FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    INNER JOIN profiles pr ON pr.org_id = p.org_id
    WHERE pr.id = auth.uid()
  ));

CREATE POLICY "Contributors and above can create sprints"
  ON sprints FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for issues
CREATE POLICY "Users can view issues in their organization"
  ON issues FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    INNER JOIN profiles pr ON pr.org_id = p.org_id
    WHERE pr.id = auth.uid()
  ));

CREATE POLICY "Contributors can create issues"
  ON issues FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Contributors can update issues"
  ON issues FOR UPDATE
  USING (reporter_id = auth.uid() OR auth.uid() = ANY(assignee_ids));

-- RLS Policies for boards
CREATE POLICY "Users can view boards in their organization"
  ON boards FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    INNER JOIN profiles pr ON pr.org_id = p.org_id
    WHERE pr.id = auth.uid()
  ));

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();