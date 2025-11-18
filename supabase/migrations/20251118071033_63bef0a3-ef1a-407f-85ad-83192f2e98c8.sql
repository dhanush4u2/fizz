-- Step 1: Create user_roles table for proper security
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role = _role
  );
$$;

-- Step 3: Create function to get user's role in an org
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND org_id = _org_id
  LIMIT 1;
$$;

-- Step 4: RLS policies for user_roles
CREATE POLICY "Users can view roles in their orgs"
  ON public.user_roles
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), org_id, 'owner') OR
    public.has_role(auth.uid(), org_id, 'admin')
  );

-- Step 5: Create invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites in their orgs"
  ON public.invites
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can create invites"
  ON public.invites
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), org_id, 'owner') OR
    public.has_role(auth.uid(), org_id, 'admin') OR
    public.has_role(auth.uid(), org_id, 'manager')
  );

-- Step 6: Create deployments table
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  branch_name TEXT NOT NULL,
  pr_number INTEGER,
  vercel_preview_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('created', 'building', 'ready', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deployments in their org projects"
  ON public.deployments
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN user_roles ur ON ur.org_id = p.org_id
      WHERE ur.user_id = auth.uid()
    )
  );

-- Step 7: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, org_id, role, created_at)
SELECT 
  p.id,
  p.org_id,
  p.role,
  p.created_at
FROM public.profiles p
WHERE p.org_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- Step 8: Update projects RLS to use security definer function
DROP POLICY IF EXISTS "Managers and above can create projects" ON public.projects;
CREATE POLICY "Managers and above can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), org_id, 'owner') OR
    public.has_role(auth.uid(), org_id, 'admin') OR
    public.has_role(auth.uid(), org_id, 'manager')
  );

DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
CREATE POLICY "Users can view projects in their organization"
  ON public.projects
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Step 9: Update issues RLS
DROP POLICY IF EXISTS "Contributors can create issues" ON public.issues;
CREATE POLICY "Contributors can create issues"
  ON public.issues
  FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid() AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN user_roles ur ON ur.org_id = p.org_id
      WHERE ur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view issues in their organization" ON public.issues;
CREATE POLICY "Users can view issues in their organization"
  ON public.issues
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN user_roles ur ON ur.org_id = p.org_id
      WHERE ur.user_id = auth.uid()
    )
  );

-- Step 10: Add issue_key sequence function for atomic generation
CREATE OR REPLACE FUNCTION public.generate_issue_key(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_key TEXT;
  v_next_number INTEGER;
  v_issue_key TEXT;
BEGIN
  -- Get project key
  SELECT key INTO v_project_key
  FROM projects
  WHERE id = p_project_id;
  
  IF v_project_key IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  -- Get next sequence number for this project
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(issue_key FROM LENGTH(v_project_key) + 2) AS INTEGER)
  ), 0) + 1
  INTO v_next_number
  FROM issues
  WHERE project_id = p_project_id;
  
  -- Generate issue key
  v_issue_key := v_project_key || '-' || v_next_number;
  
  RETURN v_issue_key;
END;
$$;