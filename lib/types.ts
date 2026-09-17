export type Profile = {
  id: string
  email: string
  display_name: string | null
}

export type Project = {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export type ProjectMember = {
  project_id: string
  user_id: string
  role: 'owner' | 'member'
  added_at: string
}

export type Note = {
  id: string
  project_id: string
  author_id: string
  content: string
  created_at: string
}
