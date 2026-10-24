
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "bridges": {
                  Row: {
                    "created_at": string,"group_a_id": string,"group_b_id": string,"id": string,"person_a_id": string,"person_b_id": string,"room_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_a_id": string,"group_b_id": string,"id"?: string,"person_a_id": string,"person_b_id": string,"room_id": string
                  }
                  Update: {
                    "created_at"?: string,"group_a_id"?: string,"group_b_id"?: string,"id"?: string,"person_a_id"?: string,"person_b_id"?: string,"room_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bridges_group_a_id_room_id_fkey"
      columns: ["group_a_id","room_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "bridges_group_b_id_room_id_fkey"
      columns: ["group_b_id","room_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "bridges_person_a_id_room_id_fkey"
      columns: ["person_a_id","room_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "bridges_person_b_id_room_id_fkey"
      columns: ["person_b_id","room_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "bridges_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "color": string,"created_at": string,"id": string,"name": string,"parent_id": string | null,"room_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color": string,"created_at"?: string,"id"?: string,"name": string,"parent_id"?: string | null,"room_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"id"?: string,"name"?: string,"parent_id"?: string | null,"room_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_parent_fk"
      columns: ["parent_id","room_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "groups_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"participants": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"person_id": string | null,"room_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id"?: string,"person_id"?: string | null,"room_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"person_id"?: string | null,"room_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "participants_person_id_room_id_fkey"
      columns: ["person_id","room_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "participants_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"people": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"photo_path": string | null,"room_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"photo_path"?: string | null,"room_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"photo_path"?: string | null,"room_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "people_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"person_groups": {
                  Row: {
                    "group_id": string,"person_id": string,"room_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"person_id": string,"room_id": string
                  }
                  Update: {
                    "group_id"?: string,"person_id"?: string,"room_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "person_groups_group_id_room_id_fkey"
      columns: ["group_id","room_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "person_groups_person_id_room_id_fkey"
      columns: ["person_id","room_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "person_groups_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"placements": {
                  Row: {
                    "participant_id": string,"person_id": string,"room_id": string,"updated_at": string,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "participant_id": string,"person_id": string,"room_id": string,"updated_at"?: string,"x": number,"y": number
                  }
                  Update: {
                    "participant_id"?: string,"person_id"?: string,"room_id"?: string,"updated_at"?: string,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "placements_participant_id_room_id_fkey"
      columns: ["participant_id","room_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "placements_person_id_room_id_fkey"
      columns: ["person_id","room_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "placements_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"mode": string,"name": string,"revealed": boolean,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"mode"?: string,"name": string,"revealed"?: boolean,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"mode"?: string,"name"?: string,"revealed"?: boolean,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shared_placements": {
                  Row: {
                    "person_id": string,"room_id": string,"updated_at": string,"updated_by": string | null,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "person_id": string,"room_id": string,"updated_at"?: string,"updated_by"?: string | null,"x": number,"y": number
                  }
                  Update: {
                    "person_id"?: string,"room_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "shared_placements_person_id_room_id_fkey"
      columns: ["person_id","room_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "shared_placements_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shared_placements_updated_by_room_id_fkey"
      columns: ["updated_by","room_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id","room_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_room":
{ Args: { "display_name": string,"mode"?: string,"name": string }; Returns: string
                           },
"generate_slug":
{ Args: { "len"?: number }; Returns: string
                           },
"is_general_room":
{ Args: { "room": string }; Returns: boolean
                           },
"is_member_of_photo_room":
{ Args: { "object_name": string }; Returns: boolean
                           },
"is_room_member":
{ Args: { "room": string }; Returns: boolean
                           },
"is_room_revealed":
{ Args: { "room": string }; Returns: boolean
                           },
"join_room":
{ Args: { "display_name": string,"slug": string }; Returns: {
              "created_at": string,
"created_by": string,
"id": string,
"mode": string,
"name": string,
"revealed": boolean,
"slug": string
            }
                          SetofOptions: {
        from: "*"
        to: "rooms"
        isOneToOne: true
        isSetofReturn: false
      } },
"owns_participant":
{ Args: { "participant": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
