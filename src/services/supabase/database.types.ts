export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: Database['public']['Enums']['area_kind']
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database['public']['Enums']['area_kind']
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database['public']['Enums']['area_kind']
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'areas_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      case_events: {
        Row: {
          action: Database['public']['Enums']['case_action']
          actor_id: string | null
          actor_role: Database['public']['Enums']['app_role'] | null
          assignee_id: string | null
          case_id: string
          comment: string | null
          created_at: string
          from_status: Database['public']['Enums']['case_status'] | null
          id: number
          organization_id: string
          to_status: Database['public']['Enums']['case_status']
        }
        Insert: {
          action: Database['public']['Enums']['case_action']
          actor_id?: string | null
          actor_role?: Database['public']['Enums']['app_role'] | null
          assignee_id?: string | null
          case_id: string
          comment?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['case_status'] | null
          id?: never
          organization_id: string
          to_status: Database['public']['Enums']['case_status']
        }
        Update: {
          action?: Database['public']['Enums']['case_action']
          actor_id?: string | null
          actor_role?: Database['public']['Enums']['app_role'] | null
          assignee_id?: string | null
          case_id?: string
          comment?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['case_status'] | null
          id?: never
          organization_id?: string
          to_status?: Database['public']['Enums']['case_status']
        }
        Relationships: [
          {
            foreignKeyName: 'case_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_events_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_events_case_id_fkey'
            columns: ['case_id']
            isOneToOne: false
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_events_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      case_photos: {
        Row: {
          case_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          image_path: string
          kind: Database['public']['Enums']['photo_kind']
          organization_id: string
          size_bytes: number | null
          thumb_path: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          image_path: string
          kind: Database['public']['Enums']['photo_kind']
          organization_id: string
          size_bytes?: number | null
          thumb_path: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          image_path?: string
          kind?: Database['public']['Enums']['photo_kind']
          organization_id?: string
          size_bytes?: number | null
          thumb_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'case_photos_case_id_fkey'
            columns: ['case_id']
            isOneToOne: false
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_photos_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_photos_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      case_report_versions: {
        Row: {
          case_id: string
          content: Json
          content_hash: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          pdf_generated_at: string | null
          pdf_path: string | null
          pdf_sha256: string | null
          pdf_size_bytes: number | null
          return_reason: string | null
          returned_at: string | null
          returned_by: string | null
          status: Database['public']['Enums']['report_version_status']
          version_number: number
        }
        Insert: {
          case_id: string
          content: Json
          content_hash: string
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          pdf_generated_at?: string | null
          pdf_path?: string | null
          pdf_sha256?: string | null
          pdf_size_bytes?: number | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: Database['public']['Enums']['report_version_status']
          version_number: number
        }
        Update: {
          case_id?: string
          content?: Json
          content_hash?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          pdf_generated_at?: string | null
          pdf_path?: string | null
          pdf_sha256?: string | null
          pdf_size_bytes?: number | null
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: Database['public']['Enums']['report_version_status']
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: 'case_report_versions_case_id_fkey'
            columns: ['case_id']
            isOneToOne: false
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_report_versions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_report_versions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_report_versions_returned_by_fkey'
            columns: ['returned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      case_reports: {
        Row: {
          case_id: string
          cause: string | null
          created_at: string
          diagnosis: string | null
          observations: string | null
          organization_id: string
          updated_at: string
          updated_by: string
          work_done: string | null
        }
        Insert: {
          case_id: string
          cause?: string | null
          created_at?: string
          diagnosis?: string | null
          observations?: string | null
          organization_id: string
          updated_at?: string
          updated_by: string
          work_done?: string | null
        }
        Update: {
          case_id?: string
          cause?: string | null
          created_at?: string
          diagnosis?: string | null
          observations?: string | null
          organization_id?: string
          updated_at?: string
          updated_by?: string
          work_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'case_reports_case_id_fkey'
            columns: ['case_id']
            isOneToOne: true
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_reports_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_reports_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      case_resource_usages: {
        Row: {
          case_id: string
          created_at: string
          hours: number | null
          id: string
          kind: Database['public']['Enums']['usage_kind']
          notes: string | null
          organization_id: string
          quantity: number | null
          registered_by: string
          resource_id: string | null
          resource_kind: Database['public']['Enums']['resource_kind'] | null
          resource_name: string | null
          technician_id: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          hours?: number | null
          id?: string
          kind: Database['public']['Enums']['usage_kind']
          notes?: string | null
          organization_id: string
          quantity?: number | null
          registered_by: string
          resource_id?: string | null
          resource_kind?: Database['public']['Enums']['resource_kind'] | null
          resource_name?: string | null
          technician_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          hours?: number | null
          id?: string
          kind?: Database['public']['Enums']['usage_kind']
          notes?: string | null
          organization_id?: string
          quantity?: number | null
          registered_by?: string
          resource_id?: string | null
          resource_kind?: Database['public']['Enums']['resource_kind'] | null
          resource_name?: string | null
          technician_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'case_resource_usages_case_id_fkey'
            columns: ['case_id']
            isOneToOne: false
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_resource_usages_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_resource_usages_registered_by_fkey'
            columns: ['registered_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_resource_usages_resource_id_fkey'
            columns: ['resource_id']
            isOneToOne: false
            referencedRelation: 'resources'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_resource_usages_technician_id_fkey'
            columns: ['technician_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      case_signatures: {
        Row: {
          case_id: string
          consent_text: string
          content_hash: string
          id: string
          ip_address: string | null
          organization_id: string
          signature_hash: string
          signature_type: Database['public']['Enums']['signature_type']
          signed_at: string
          signer_id: string
          signer_role: Database['public']['Enums']['app_role']
          stroke_path: string
          user_agent: string | null
          version_id: string
        }
        Insert: {
          case_id: string
          consent_text: string
          content_hash: string
          id?: string
          ip_address?: string | null
          organization_id: string
          signature_hash: string
          signature_type: Database['public']['Enums']['signature_type']
          signed_at?: string
          signer_id: string
          signer_role: Database['public']['Enums']['app_role']
          stroke_path: string
          user_agent?: string | null
          version_id: string
        }
        Update: {
          case_id?: string
          consent_text?: string
          content_hash?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          signature_hash?: string
          signature_type?: Database['public']['Enums']['signature_type']
          signed_at?: string
          signer_id?: string
          signer_role?: Database['public']['Enums']['app_role']
          stroke_path?: string
          user_agent?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'case_signatures_case_id_fkey'
            columns: ['case_id']
            isOneToOne: false
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_signatures_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_signatures_signer_id_fkey'
            columns: ['signer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'case_signatures_version_id_fkey'
            columns: ['version_id']
            isOneToOne: false
            referencedRelation: 'case_report_versions'
            referencedColumns: ['id']
          },
        ]
      }
      cases: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          assigned_to: string | null
          case_number: string
          category_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location: string
          organization_id: string
          priority: Database['public']['Enums']['case_priority']
          requesting_area_id: string
          started_at: string | null
          status: Database['public']['Enums']['case_status']
          status_changed_at: string
          target_area_id: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          case_number: string
          category_id: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          location: string
          organization_id: string
          priority?: Database['public']['Enums']['case_priority']
          requesting_area_id: string
          started_at?: string | null
          status?: Database['public']['Enums']['case_status']
          status_changed_at?: string
          target_area_id: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          case_number?: string
          category_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          location?: string
          organization_id?: string
          priority?: Database['public']['Enums']['case_priority']
          requesting_area_id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['case_status']
          status_changed_at?: string
          target_area_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cases_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cases_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cases_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cases_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cases_requesting_area_id_fkey'
            columns: ['requesting_area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cases_target_area_id_fkey'
            columns: ['target_area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          area_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          min_after_photos: number
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          area_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_after_photos?: number
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          min_after_photos?: number
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'categories_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          action: Database['public']['Enums']['case_action']
          body: string
          case_id: string
          created_at: string
          event_id: number
          id: number
          organization_id: string
          push_attempts: number
          push_claimed_at: string | null
          push_error: string | null
          push_sent_at: string | null
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          action: Database['public']['Enums']['case_action']
          body: string
          case_id: string
          created_at?: string
          event_id: number
          id?: never
          organization_id: string
          push_attempts?: number
          push_claimed_at?: string | null
          push_error?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          action?: Database['public']['Enums']['case_action']
          body?: string
          case_id?: string
          created_at?: string
          event_id?: number
          id?: never
          organization_id?: string
          push_attempts?: number
          push_claimed_at?: string | null
          push_error?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_case_id_fkey'
            columns: ['case_id']
            isOneToOne: false
            referencedRelation: 'cases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'case_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organization_access_requests: {
        Row: {
          assigned_area_id: string | null
          assigned_role: Database['public']['Enums']['app_role'] | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          email: string
          full_name: string
          id: string
          organization_id: string
          status: Database['public']['Enums']['access_request_status']
          user_id: string
        }
        Insert: {
          assigned_area_id?: string | null
          assigned_role?: Database['public']['Enums']['app_role'] | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          email: string
          full_name?: string
          id?: string
          organization_id: string
          status?: Database['public']['Enums']['access_request_status']
          user_id: string
        }
        Update: {
          assigned_area_id?: string | null
          assigned_role?: Database['public']['Enums']['app_role'] | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          email?: string
          full_name?: string
          id?: string
          organization_id?: string
          status?: Database['public']['Enums']['access_request_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_access_requests_assigned_area_id_fkey'
            columns: ['assigned_area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_access_requests_decided_by_fkey'
            columns: ['decided_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_access_requests_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_access_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          area_id: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          organization_id: string
          revoked_at: string | null
          role: Database['public']['Enums']['app_role']
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          area_id?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          organization_id: string
          revoked_at?: string | null
          role?: Database['public']['Enums']['app_role']
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          area_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          revoked_at?: string | null
          role?: Database['public']['Enums']['app_role']
        }
        Relationships: [
          {
            foreignKeyName: 'organization_invitations_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_invitations_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_invitations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          join_code: string
          name: string
          storage_quota_bytes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          join_code?: string
          name: string
          storage_quota_bytes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          join_code?: string
          name?: string
          storage_quota_bytes?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area_id: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          organization_id: string | null
          role: Database['public']['Enums']['app_role']
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          organization_id?: string | null
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          organization_id?: string | null
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: Database['public']['Enums']['resource_kind']
          name: string
          organization_id: string
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind: Database['public']['Enums']['resource_kind']
          name: string
          organization_id: string
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database['public']['Enums']['resource_kind']
          name?: string
          organization_id?: string
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'resources_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_pending_invitation: { Args: never; Returns: boolean }
      approve_access_request: {
        Args: {
          new_area_id: string
          new_role: Database['public']['Enums']['app_role']
          target_request_id: string
        }
        Returns: undefined
      }
      approve_case_report: {
        Args: {
          accepts_terms: boolean
          signature_stroke: string
          target_case_id: string
        }
        Returns: {
          case_id: string
          consent_text: string
          content_hash: string
          id: string
          ip_address: string | null
          organization_id: string
          signature_hash: string
          signature_type: Database['public']['Enums']['signature_type']
          signed_at: string
          signer_id: string
          signer_role: Database['public']['Enums']['app_role']
          stroke_path: string
          user_agent: string | null
          version_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'case_signatures'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_my_access_request: { Args: never; Returns: undefined }
      claim_pending_push: {
        Args: { batch_size?: number }
        Returns: {
          body: string
          case_id: string
          id: number
          push_attempts: number
          recipient_id: string
          title: string
        }[]
      }
      claim_stale_photo_reservations: {
        Args: { batch_size?: number }
        Returns: {
          id: string
          image_path: string
          thumb_path: string
        }[]
      }
      complete_push: {
        Args: { error_message?: string; notification_ids: number[] }
        Returns: number
      }
      confirm_case_photo: {
        Args: { target_photo_id: string }
        Returns: {
          case_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          image_path: string
          kind: Database['public']['Enums']['photo_kind']
          organization_id: string
          size_bytes: number | null
          thumb_path: string
          uploaded_by: string
        }
        SetofOptions: {
          from: '*'
          to: 'case_photos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_case_photo: {
        Args: { target_photo_id: string }
        Returns: undefined
      }
      get_home_summary: { Args: never; Returns: Json }
      get_my_access_request: {
        Args: never
        Returns: {
          created_at: string
          decided_at: string
          decision_note: string
          id: string
          organization_name: string
          status: Database['public']['Enums']['access_request_status']
        }[]
      }
      get_organization_join_code: { Args: never; Returns: string }
      mark_notifications_read: {
        Args: { notification_ids?: number[] }
        Returns: number
      }
      regenerate_organization_join_code: { Args: never; Returns: string }
      register_push_token: {
        Args: { device_platform: string; push_token: string }
        Returns: undefined
      }
      reject_access_request: {
        Args: { note?: string; target_request_id: string }
        Returns: undefined
      }
      release_push: {
        Args: { error_message: string; notification_ids: number[] }
        Returns: number
      }
      request_organization_access: {
        Args: { access_code: string }
        Returns: Json
      }
      reserve_case_photo: {
        Args: {
          photo_kind: Database['public']['Enums']['photo_kind']
          target_case_id: string
        }
        Returns: Json
      }
      return_case_report: {
        Args: { return_reason: string; target_case_id: string }
        Returns: {
          accepted_at: string | null
          assigned_at: string | null
          assigned_to: string | null
          case_number: string
          category_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location: string
          organization_id: string
          priority: Database['public']['Enums']['case_priority']
          requesting_area_id: string
          started_at: string | null
          status: Database['public']['Enums']['case_status']
          status_changed_at: string
          target_area_id: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'cases'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_member_access: {
        Args: {
          new_area_id: string
          new_role: Database['public']['Enums']['app_role']
          target_user_id: string
        }
        Returns: undefined
      }
      submit_case_report: {
        Args: {
          accepts_terms: boolean
          signature_stroke: string
          target_case_id: string
        }
        Returns: {
          case_id: string
          content: Json
          content_hash: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          pdf_generated_at: string | null
          pdf_path: string | null
          pdf_sha256: string | null
          pdf_size_bytes: number | null
          return_reason: string | null
          returned_at: string | null
          returned_by: string | null
          status: Database['public']['Enums']['report_version_status']
          version_number: number
        }
        SetofOptions: {
          from: '*'
          to: 'case_report_versions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_case: {
        Args: {
          action_comment?: string
          new_assignee_id?: string
          requested_action: Database['public']['Enums']['case_action']
          target_case_id: string
        }
        Returns: {
          accepted_at: string | null
          assigned_at: string | null
          assigned_to: string | null
          case_number: string
          category_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location: string
          organization_id: string
          priority: Database['public']['Enums']['case_priority']
          requesting_area_id: string
          started_at: string | null
          status: Database['public']['Enums']['case_status']
          status_changed_at: string
          target_area_id: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'cases'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unregister_push_token: {
        Args: { push_token: string }
        Returns: undefined
      }
      validate_case_report: {
        Args: {
          accepts_terms: boolean
          signature_stroke: string
          target_case_id: string
        }
        Returns: {
          case_id: string
          consent_text: string
          content_hash: string
          id: string
          ip_address: string | null
          organization_id: string
          signature_hash: string
          signature_type: Database['public']['Enums']['signature_type']
          signed_at: string
          signer_id: string
          signer_role: Database['public']['Enums']['app_role']
          stroke_path: string
          user_agent: string | null
          version_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'case_signatures'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_report_code: {
        Args: { verification_code: string }
        Returns: {
          case_number: string
          content_hash: string
          signatures: number
          version_number: number
          version_status: Database['public']['Enums']['report_version_status']
        }[]
      }
    }
    Enums: {
      access_request_status: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
      app_role: 'administrador' | 'jefe_area' | 'tecnico' | 'auditor' | 'solicitante'
      area_kind: 'solicitante' | 'tecnica'
      case_action:
        | 'crear'
        | 'aceptar'
        | 'rechazar'
        | 'cancelar'
        | 'asignar'
        | 'reasignar'
        | 'iniciar'
        | 'pausar'
        | 'reanudar'
        | 'enviar_reporte'
        | 'validar_reporte'
        | 'devolver_reporte'
        | 'aprobar_reporte'
      case_priority: 'alta' | 'media' | 'baja'
      case_status:
        | 'solicitado'
        | 'aceptado'
        | 'rechazado'
        | 'cancelado'
        | 'asignado'
        | 'en_ejecucion'
        | 'en_espera'
        | 'reporte_enviado'
        | 'validado'
        | 'aprobado'
      photo_kind: 'antes' | 'despues'
      report_version_status: 'vigente' | 'devuelta'
      resource_kind: 'material' | 'herramienta' | 'equipo'
      signature_type: 'ejecucion' | 'validacion_tecnica' | 'conformidad'
      usage_kind: 'recurso' | 'mano_de_obra'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_request_status: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
      app_role: ['administrador', 'jefe_area', 'tecnico', 'auditor', 'solicitante'],
      area_kind: ['solicitante', 'tecnica'],
      case_action: [
        'crear',
        'aceptar',
        'rechazar',
        'cancelar',
        'asignar',
        'reasignar',
        'iniciar',
        'pausar',
        'reanudar',
        'enviar_reporte',
        'validar_reporte',
        'devolver_reporte',
        'aprobar_reporte',
      ],
      case_priority: ['alta', 'media', 'baja'],
      case_status: [
        'solicitado',
        'aceptado',
        'rechazado',
        'cancelado',
        'asignado',
        'en_ejecucion',
        'en_espera',
        'reporte_enviado',
        'validado',
        'aprobado',
      ],
      photo_kind: ['antes', 'despues'],
      report_version_status: ['vigente', 'devuelta'],
      resource_kind: ['material', 'herramienta', 'equipo'],
      signature_type: ['ejecucion', 'validacion_tecnica', 'conformidad'],
      usage_kind: ['recurso', 'mano_de_obra'],
    },
  },
} as const
