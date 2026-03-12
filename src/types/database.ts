export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          github_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          github_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          github_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      monitored_repos: {
        Row: {
          id: string
          user_id: string
          github_repo_id: number
          owner: string
          name: string
          full_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          github_repo_id: number
          owner: string
          name: string
          full_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          github_repo_id?: number
          owner?: string
          name?: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_repos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          user_id: string
          default_provider: string
          default_prompt: string
          claude_api_key_encrypted: string | null
          openai_api_key_encrypted: string | null
          github_token_encrypted: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          default_provider?: string
          default_prompt?: string
          claude_api_key_encrypted?: string | null
          openai_api_key_encrypted?: string | null
          github_token_encrypted?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          default_provider?: string
          default_prompt?: string
          claude_api_key_encrypted?: string | null
          openai_api_key_encrypted?: string | null
          github_token_encrypted?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          repo_full_name: string
          pr_number: number
          pr_title: string
          provider: string
          prompt: string
          custom_instructions: string | null
          status: string
          summary: string | null
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          posted_at: string | null
          github_review_id: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo_full_name: string
          pr_number: number
          pr_title: string
          provider: string
          prompt: string
          custom_instructions?: string | null
          status?: string
          summary?: string | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          posted_at?: string | null
          github_review_id?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo_full_name?: string
          pr_number?: number
          pr_title?: string
          provider?: string
          prompt?: string
          custom_instructions?: string | null
          status?: string
          summary?: string | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          posted_at?: string | null
          github_review_id?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_rules: {
        Row: {
          id: string
          user_id: string
          name: string
          content: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          content: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          content?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          id: string
          review_id: string
          file_path: string
          start_line: number | null
          end_line: number | null
          side: string
          body: string
          severity: string
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          file_path: string
          start_line?: number | null
          end_line?: number | null
          side?: string
          body: string
          severity?: string
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          file_path?: string
          start_line?: number | null
          end_line?: number | null
          side?: string
          body?: string
          severity?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_notifications: {
        Row: {
          id: string
          user_id: string
          repo_full_name: string
          pr_number: number
          pr_title: string | null
          comment_body: string | null
          comment_url: string | null
          severity: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo_full_name: string
          pr_number: number
          pr_title?: string | null
          comment_body?: string | null
          comment_url?: string | null
          severity?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo_full_name?: string
          pr_number?: number
          pr_title?: string | null
          comment_body?: string | null
          comment_url?: string | null
          severity?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repo_webhooks: {
        Row: {
          id: string
          user_id: string
          repo_full_name: string
          webhook_id: number
          webhook_secret: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo_full_name: string
          webhook_id: number
          webhook_secret: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo_full_name?: string
          webhook_id?: number
          webhook_secret?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repo_webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
