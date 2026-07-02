export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      apple_health_logs: {
        Row: {
          active_calories: number | null
          created_at: string | null
          date: string
          id: string
          resting_hr: number | null
          sleep_hours: number | null
          steps: number | null
          total_calories: number | null
          user_id: string
          weight_kg: number | null
          workout_duration_min: number | null
        }
        Insert: {
          active_calories?: number | null
          created_at?: string | null
          date: string
          id?: string
          resting_hr?: number | null
          sleep_hours?: number | null
          steps?: number | null
          total_calories?: number | null
          user_id: string
          weight_kg?: number | null
          workout_duration_min?: number | null
        }
        Update: {
          active_calories?: number | null
          created_at?: string | null
          date?: string
          id?: string
          resting_hr?: number | null
          sleep_hours?: number | null
          steps?: number | null
          total_calories?: number | null
          user_id?: string
          weight_kg?: number | null
          workout_duration_min?: number | null
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          ankle: number | null
          bicep: number | null
          calves: number | null
          chest: number | null
          created_at: string | null
          date: string
          forearm: number | null
          glutes: number | null
          hips: number | null
          id: string
          lower_abs: number | null
          neck: number | null
          notes: string | null
          phase: number | null
          shoulders: number | null
          thighs: number | null
          upper_abs: number | null
          user_id: string
          waist: number | null
          wrist: number | null
        }
        Insert: {
          ankle?: number | null
          bicep?: number | null
          calves?: number | null
          chest?: number | null
          created_at?: string | null
          date: string
          forearm?: number | null
          glutes?: number | null
          hips?: number | null
          id?: string
          lower_abs?: number | null
          neck?: number | null
          notes?: string | null
          phase?: number | null
          shoulders?: number | null
          thighs?: number | null
          upper_abs?: number | null
          user_id: string
          waist?: number | null
          wrist?: number | null
        }
        Update: {
          ankle?: number | null
          bicep?: number | null
          calves?: number | null
          chest?: number | null
          created_at?: string | null
          date?: string
          forearm?: number | null
          glutes?: number | null
          hips?: number | null
          id?: string
          lower_abs?: number | null
          neck?: number | null
          notes?: string | null
          phase?: number | null
          shoulders?: number | null
          thighs?: number | null
          upper_abs?: number | null
          user_id?: string
          waist?: number | null
          wrist?: number | null
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          phase: number | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          phase?: number | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          phase?: number | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      checklist_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          item_key: string
          item_type: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          item_key: string
          item_type: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          item_key?: string
          item_type?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cooldown_items: {
        Row: {
          day_id: string
          detail: string | null
          display_order: number
          id: string
          item_key: string
          label: string
        }
        Insert: {
          day_id: string
          detail?: string | null
          display_order: number
          id?: string
          item_key: string
          label: string
        }
        Update: {
          day_id?: string
          detail?: string | null
          display_order?: number
          id?: string
          item_key?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cooldown_items_day_id_fkey'
            columns: ['day_id']
            isOneToOne: false
            referencedRelation: 'programme_days'
            referencedColumns: ['id']
          },
        ]
      }
      exercise_library: {
        Row: {
          created_at: string
          exercise_data: Json
          id: string
          schema_version: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_data: Json
          id: string
          schema_version?: number
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_data?: Json
          id?: string
          schema_version?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          duration_s: number | null
          exercise_id: string
          exercise_index: number
          exercise_name: string
          id: string
          is_mm_set: boolean | null
          is_travel: boolean | null
          notes: string | null
          phase: number
          reps: number | null
          rpe: number | null
          session_id: string | null
          set_number: number
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          duration_s?: number | null
          exercise_id: string
          exercise_index: number
          exercise_name: string
          id?: string
          is_mm_set?: boolean | null
          is_travel?: boolean | null
          notes?: string | null
          phase: number
          reps?: number | null
          rpe?: number | null
          session_id?: string | null
          set_number: number
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          duration_s?: number | null
          exercise_id?: string
          exercise_index?: number
          exercise_name?: string
          id?: string
          is_mm_set?: boolean | null
          is_travel?: boolean | null
          notes?: string | null
          phase?: number
          reps?: number | null
          rpe?: number | null
          session_id?: string | null
          set_number?: number
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'exercise_logs_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_logs_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'workout_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      exercises: {
        Row: {
          body_part: string | null
          created_at: string | null
          created_by: string | null
          equipment: string[] | null
          gif_url: string | null
          id: string
          is_global: boolean | null
          name: string
          target_muscle: string | null
        }
        Insert: {
          body_part?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment?: string[] | null
          gif_url?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          target_muscle?: string | null
        }
        Update: {
          body_part?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment?: string[] | null
          gif_url?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          target_muscle?: string | null
        }
        Relationships: []
      }
      fitness_assessments: {
        Row: {
          age_at_assessment: number | null
          assessed_at: string
          can_run_1km: boolean | null
          created_at: string | null
          derived_fitness_level: Database['public']['Enums']['fitness_level'] | null
          derived_fitness_score: number | null
          id: string
          is_current: boolean | null
          jumping_jacks_30s: number | null
          notes: string | null
          plank_seconds: number | null
          pushups_count: number | null
          squats_count: number | null
          user_id: string
          weight_kg_at_assessment: number | null
        }
        Insert: {
          age_at_assessment?: number | null
          assessed_at?: string
          can_run_1km?: boolean | null
          created_at?: string | null
          derived_fitness_level?: Database['public']['Enums']['fitness_level'] | null
          derived_fitness_score?: number | null
          id?: string
          is_current?: boolean | null
          jumping_jacks_30s?: number | null
          notes?: string | null
          plank_seconds?: number | null
          pushups_count?: number | null
          squats_count?: number | null
          user_id: string
          weight_kg_at_assessment?: number | null
        }
        Update: {
          age_at_assessment?: number | null
          assessed_at?: string
          can_run_1km?: boolean | null
          created_at?: string | null
          derived_fitness_level?: Database['public']['Enums']['fitness_level'] | null
          derived_fitness_score?: number | null
          id?: string
          is_current?: boolean | null
          jumping_jacks_30s?: number | null
          notes?: string | null
          plank_seconds?: number | null
          pushups_count?: number | null
          squats_count?: number | null
          user_id?: string
          weight_kg_at_assessment?: number | null
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          created_at: string | null
          date: string
          glasses: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          glasses?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          glasses?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inbody_logs: {
        Row: {
          bmi: number | null
          bmr: number | null
          body_fat_mass: number | null
          body_fat_pct: number | null
          created_at: string | null
          date: string
          ecw_ratio: number | null
          extracellular_water: number | null
          id: string
          inbody_score: number | null
          intracellular_water: number | null
          lean_left_arm: number | null
          lean_left_leg: number | null
          lean_right_arm: number | null
          lean_right_leg: number | null
          lean_trunk: number | null
          notes: string | null
          skeletal_muscle_mass: number | null
          total_body_water: number | null
          user_id: string
          visceral_fat_area: number | null
          visceral_fat_level: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bmr?: number | null
          body_fat_mass?: number | null
          body_fat_pct?: number | null
          created_at?: string | null
          date: string
          ecw_ratio?: number | null
          extracellular_water?: number | null
          id?: string
          inbody_score?: number | null
          intracellular_water?: number | null
          lean_left_arm?: number | null
          lean_left_leg?: number | null
          lean_right_arm?: number | null
          lean_right_leg?: number | null
          lean_trunk?: number | null
          notes?: string | null
          skeletal_muscle_mass?: number | null
          total_body_water?: number | null
          user_id: string
          visceral_fat_area?: number | null
          visceral_fat_level?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bmr?: number | null
          body_fat_mass?: number | null
          body_fat_pct?: number | null
          created_at?: string | null
          date?: string
          ecw_ratio?: number | null
          extracellular_water?: number | null
          id?: string
          inbody_score?: number | null
          intracellular_water?: number | null
          lean_left_arm?: number | null
          lean_left_leg?: number | null
          lean_right_arm?: number | null
          lean_right_leg?: number | null
          lean_trunk?: number | null
          notes?: string | null
          skeletal_muscle_mass?: number | null
          total_body_water?: number | null
          user_id?: string
          visceral_fat_area?: number | null
          visceral_fat_level?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      odin_generation_log: {
        Row: {
          athlete_goal: string | null
          created_at: string
          id: string
          repair_attempted: boolean
          step: string
          tokens_input: number
          tokens_output: number
          user_id: string
        }
        Insert: {
          athlete_goal?: string | null
          created_at?: string
          id?: string
          repair_attempted?: boolean
          step: string
          tokens_input?: number
          tokens_output?: number
          user_id: string
        }
        Update: {
          athlete_goal?: string | null
          created_at?: string
          id?: string
          repair_attempted?: boolean
          step?: string
          tokens_input?: number
          tokens_output?: number
          user_id?: string
        }
        Relationships: []
      }
      programme_config: {
        Row: {
          assessment_id: string | null
          id: string
          min_active_days: number
          phase_weeks: number[]
          programme_id: string | null
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          id?: string
          min_active_days?: number
          phase_weeks?: number[]
          programme_id?: string | null
          start_date?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          id?: string
          min_active_days?: number
          phase_weeks?: number[]
          programme_id?: string | null
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'programme_config_assessment_id_fkey'
            columns: ['assessment_id']
            isOneToOne: false
            referencedRelation: 'fitness_assessments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'programme_config_programme_id_fkey'
            columns: ['programme_id']
            isOneToOne: false
            referencedRelation: 'programmes'
            referencedColumns: ['id']
          },
        ]
      }
      programme_days: {
        Row: {
          created_at: string | null
          day_of_week: Database['public']['Enums']['day_of_week']
          duration_min: number | null
          has_warmup: boolean | null
          id: string
          kcal_range: string | null
          phase_id: string
          subtitle: string | null
          tags: string[] | null
          title: string
          workout_type: Database['public']['Enums']['workout_type']
        }
        Insert: {
          created_at?: string | null
          day_of_week: Database['public']['Enums']['day_of_week']
          duration_min?: number | null
          has_warmup?: boolean | null
          id?: string
          kcal_range?: string | null
          phase_id: string
          subtitle?: string | null
          tags?: string[] | null
          title: string
          workout_type: Database['public']['Enums']['workout_type']
        }
        Update: {
          created_at?: string | null
          day_of_week?: Database['public']['Enums']['day_of_week']
          duration_min?: number | null
          has_warmup?: boolean | null
          id?: string
          kcal_range?: string | null
          phase_id?: string
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          workout_type?: Database['public']['Enums']['workout_type']
        }
        Relationships: [
          {
            foreignKeyName: 'programme_days_phase_id_fkey'
            columns: ['phase_id']
            isOneToOne: false
            referencedRelation: 'programme_phases'
            referencedColumns: ['id']
          },
        ]
      }
      programme_exercises: {
        Row: {
          created_at: string | null
          day_id: string
          display_order: number
          exercise_id: string
          icon: string | null
          id: string
          notes: string | null
          rest: string | null
          sets_reps: string
          warn: string | null
        }
        Insert: {
          created_at?: string | null
          day_id: string
          display_order: number
          exercise_id: string
          icon?: string | null
          id?: string
          notes?: string | null
          rest?: string | null
          sets_reps: string
          warn?: string | null
        }
        Update: {
          created_at?: string | null
          day_id?: string
          display_order?: number
          exercise_id?: string
          icon?: string | null
          id?: string
          notes?: string | null
          rest?: string | null
          sets_reps?: string
          warn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'programme_exercises_day_id_fkey'
            columns: ['day_id']
            isOneToOne: false
            referencedRelation: 'programme_days'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'programme_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      programme_phases: {
        Row: {
          created_at: string | null
          goal: string
          id: string
          intensity_level: number | null
          name: string
          phase_number: number
          programme_id: string
          volume_level: number | null
          weeks_count: number
        }
        Insert: {
          created_at?: string | null
          goal: string
          id?: string
          intensity_level?: number | null
          name: string
          phase_number: number
          programme_id: string
          volume_level?: number | null
          weeks_count: number
        }
        Update: {
          created_at?: string | null
          goal?: string
          id?: string
          intensity_level?: number | null
          name?: string
          phase_number?: number
          programme_id?: string
          volume_level?: number | null
          weeks_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'programme_phases_programme_id_fkey'
            columns: ['programme_id']
            isOneToOne: false
            referencedRelation: 'programmes'
            referencedColumns: ['id']
          },
        ]
      }
      programmes: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          assessment_id: string | null
          available_days: number | null
          baseline_session: Json | null
          completed_at: string | null
          created_at: string | null
          created_by_ai: boolean | null
          equipment: Database['public']['Enums']['equipment_type']
          goal_description: string | null
          goal_type: Database['public']['Enums']['goal_type']
          id: string
          is_active: boolean | null
          name: string
          programme_data: Json | null
          start_weight_kg: number | null
          started_at: string | null
          target_weeks: number | null
          target_weight_kg: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          assessment_id?: string | null
          available_days?: number | null
          baseline_session?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by_ai?: boolean | null
          equipment?: Database['public']['Enums']['equipment_type']
          goal_description?: string | null
          goal_type: Database['public']['Enums']['goal_type']
          id?: string
          is_active?: boolean | null
          name: string
          programme_data?: Json | null
          start_weight_kg?: number | null
          started_at?: string | null
          target_weeks?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          assessment_id?: string | null
          available_days?: number | null
          baseline_session?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by_ai?: boolean | null
          equipment?: Database['public']['Enums']['equipment_type']
          goal_description?: string | null
          goal_type?: Database['public']['Enums']['goal_type']
          id?: string
          is_active?: boolean | null
          name?: string
          programme_data?: Json | null
          start_weight_kg?: number | null
          started_at?: string | null
          target_weeks?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'programmes_assessment_id_fkey'
            columns: ['assessment_id']
            isOneToOne: false
            referencedRelation: 'fitness_assessments'
            referencedColumns: ['id']
          },
        ]
      }
      strength_baselines: {
        Row: {
          created_at: string | null
          estimated_1rm_kg: number
          exercise_id: string
          exercise_name: string
          goal_type: string
          id: string
          programme_id: string | null
          set3_reps: number
          set3_weight_kg: number
          tested_at: string | null
          user_id: string | null
          working_weight_kg: number
        }
        Insert: {
          created_at?: string | null
          estimated_1rm_kg: number
          exercise_id: string
          exercise_name: string
          goal_type: string
          id?: string
          programme_id?: string | null
          set3_reps: number
          set3_weight_kg: number
          tested_at?: string | null
          user_id?: string | null
          working_weight_kg: number
        }
        Update: {
          created_at?: string | null
          estimated_1rm_kg?: number
          exercise_id?: string
          exercise_name?: string
          goal_type?: string
          id?: string
          programme_id?: string | null
          set3_reps?: number
          set3_weight_kg?: number
          tested_at?: string | null
          user_id?: string | null
          working_weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: 'strength_baselines_programme_id_fkey'
            columns: ['programme_id']
            isOneToOne: false
            referencedRelation: 'programmes'
            referencedColumns: ['id']
          },
        ]
      }
      user_chronic_conditions: {
        Row: {
          condition_type: Database['public']['Enums']['chronic_condition_type']
          created_at: string | null
          custom_condition_name: string | null
          id: string
          notes: string | null
          severity: Database['public']['Enums']['condition_severity']
          updated_at: string | null
          user_id: string
        }
        Insert: {
          condition_type: Database['public']['Enums']['chronic_condition_type']
          created_at?: string | null
          custom_condition_name?: string | null
          id?: string
          notes?: string | null
          severity?: Database['public']['Enums']['condition_severity']
          updated_at?: string | null
          user_id: string
        }
        Update: {
          condition_type?: Database['public']['Enums']['chronic_condition_type']
          created_at?: string | null
          custom_condition_name?: string | null
          id?: string
          notes?: string | null
          severity?: Database['public']['Enums']['condition_severity']
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_health: {
        Row: {
          available_days_per_week: number | null
          baseline_path: string | null
          body_fat_pct: number | null
          created_at: string | null
          current_weight_kg: number | null
          equipment: string | null
          fitness_level: string | null
          goal: string | null
          goal_sub_fields: Json | null
          height_cm: number | null
          id: string
          injuries: string[] | null
          injuries_v2: Json | null
          known_lifts: Json | null
          lifestyle: string[] | null
          medical_conditions: string[] | null
          occupation: string | null
          preferred_workout_time: string | null
          session_duration_min: number | null
          target_body_fat_pct: number | null
          target_timeframe_weeks: number | null
          target_weight_kg: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_days_per_week?: number | null
          baseline_path?: string | null
          body_fat_pct?: number | null
          created_at?: string | null
          current_weight_kg?: number | null
          equipment?: string | null
          fitness_level?: string | null
          goal?: string | null
          goal_sub_fields?: Json | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          injuries_v2?: Json | null
          known_lifts?: Json | null
          lifestyle?: string[] | null
          medical_conditions?: string[] | null
          occupation?: string | null
          preferred_workout_time?: string | null
          session_duration_min?: number | null
          target_body_fat_pct?: number | null
          target_timeframe_weeks?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_days_per_week?: number | null
          baseline_path?: string | null
          body_fat_pct?: number | null
          created_at?: string | null
          current_weight_kg?: number | null
          equipment?: string | null
          fitness_level?: string | null
          goal?: string | null
          goal_sub_fields?: Json | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          injuries_v2?: Json | null
          known_lifts?: Json | null
          lifestyle?: string[] | null
          medical_conditions?: string[] | null
          occupation?: string | null
          preferred_workout_time?: string | null
          session_duration_min?: number | null
          target_body_fat_pct?: number | null
          target_timeframe_weeks?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_injuries: {
        Row: {
          body_part: Database['public']['Enums']['injury_body_part']
          created_at: string | null
          id: string
          notes: string | null
          status: Database['public']['Enums']['injury_status']
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body_part: Database['public']['Enums']['injury_body_part']
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: Database['public']['Enums']['injury_status']
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body_part?: Database['public']['Enums']['injury_body_part']
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: Database['public']['Enums']['injury_status']
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string | null
          current_weight_kg: number | null
          date_of_birth: string | null
          dietary_notes: string | null
          dietary_preference: Database['public']['Enums']['dietary_preference'] | null
          first_name: string | null
          fitness_level: string | null
          full_name: string | null
          gender: Database['public']['Enums']['gender_type'] | null
          height_cm: number | null
          id: string
          last_name: string | null
          medical_conditions: string | null
          nationality: string | null
          occupation_type: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone_number: string | null
          primary_activity: string | null
          target_weight_kg: number | null
          training_experience: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string | null
          current_weight_kg?: number | null
          date_of_birth?: string | null
          dietary_notes?: string | null
          dietary_preference?: Database['public']['Enums']['dietary_preference'] | null
          first_name?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: Database['public']['Enums']['gender_type'] | null
          height_cm?: number | null
          id?: string
          last_name?: string | null
          medical_conditions?: string | null
          nationality?: string | null
          occupation_type?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          primary_activity?: string | null
          target_weight_kg?: number | null
          training_experience?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string | null
          current_weight_kg?: number | null
          date_of_birth?: string | null
          dietary_notes?: string | null
          dietary_preference?: Database['public']['Enums']['dietary_preference'] | null
          first_name?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: Database['public']['Enums']['gender_type'] | null
          height_cm?: number | null
          id?: string
          last_name?: string | null
          medical_conditions?: string | null
          nationality?: string | null
          occupation_type?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          primary_activity?: string | null
          target_weight_kg?: number | null
          training_experience?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warmup_items: {
        Row: {
          detail: string | null
          display_order: number
          icon: string | null
          id: string
          item_key: string
          label: string
          programme_id: string
        }
        Insert: {
          detail?: string | null
          display_order: number
          icon?: string | null
          id?: string
          item_key: string
          label: string
          programme_id: string
        }
        Update: {
          detail?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          item_key?: string
          label?: string
          programme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'warmup_items_programme_id_fkey'
            columns: ['programme_id']
            isOneToOne: false
            referencedRelation: 'programmes'
            referencedColumns: ['id']
          },
        ]
      }
      warmup_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          item_key: string
          item_label: string | null
          phase: number
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          item_key: string
          item_label?: string | null
          phase: number
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          item_key?: string
          item_label?: string | null
          phase?: number
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          date: string
          day_of_week: string
          id: string
          is_travel: boolean | null
          phase: number
          session_type: string | null
          user_id: string
          workout_title: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          date: string
          day_of_week: string
          id?: string
          is_travel?: boolean | null
          phase: number
          session_type?: string | null
          user_id: string
          workout_title?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          date?: string
          day_of_week?: string
          id?: string
          is_travel?: boolean | null
          phase?: number
          session_type?: string | null
          user_id?: string
          workout_title?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_idempotency_key: {
        Args: {
          p_endpoint: string
          p_idempotency_key: string
          p_request_hash: string
          p_ttl_seconds: number
          p_user_id: string
        }
        Returns: {
          outcome: string
          response_reference: Json
        }[]
      }
      create_programme_with_version: {
        Args: {
          p_goal_type: string
          p_idempotency_endpoint?: string
          p_idempotency_key?: string
          p_name: string
          p_programme_data: Json
          p_refinement_data: Json
          p_replace_existing_draft: boolean
          p_request_hash?: string
          p_schema_version: number
          p_source: string
          p_status: string
          p_user_id: string
          p_validation_data: Json
        }
        Returns: {
          goal_type: string
          id: string
          name: string
          programme_data: Json
          refinement_data: Json
          source: string
          status: string
          user_id: string
          validation_data: Json
          version_number: number
        }[]
      }
      get_current_draft_with_latest_version: {
        Args: { p_user_id: string }
        Returns: {
          goal_type: string
          id: string
          name: string
          programme_data: Json
          refinement_data: Json
          source: string
          status: string
          user_id: string
          validation_data: Json
          version_number: number
        }[]
      }
      get_programme_with_latest_version: {
        Args: { p_programme_id: string; p_user_id: string }
        Returns: {
          goal_type: string
          id: string
          name: string
          programme_data: Json
          refinement_data: Json
          source: string
          status: string
          user_id: string
          validation_data: Json
          version_number: number
        }[]
      }
      mark_idempotency_failed: {
        Args: {
          p_endpoint: string
          p_idempotency_key: string
          p_request_hash: string
          p_user_id: string
        }
        Returns: boolean
      }
      start_generation_run: {
        Args: {
          p_input_summary: Json
          p_request_id: string
          p_stale_after_seconds: number
          p_user_id: string
        }
        Returns: {
          id: string
          request_id: string
          user_id: string
        }[]
      }
      upsert_exercise_log: {
        Args: {
          p_completed: boolean
          p_date: string
          p_exercise_id: string
          p_exercise_index: number
          p_exercise_name: string
          p_is_mm_set: boolean
          p_notes?: string
          p_phase: number
          p_reps: number
          p_session_id: string
          p_set_number: number
          p_user_id: string
          p_weight_kg: number
        }
        Returns: string
      }
    }
    Enums: {
      chronic_condition_type:
        | 'hypertension'
        | 'type2_diabetes'
        | 'hypothyroidism'
        | 'pcos'
        | 'asthma'
        | 'osteoarthritis'
        | 'osteoporosis'
        | 'heart_condition'
        | 'chronic_lower_back_pain'
        | 'obesity'
        | 'other'
      condition_severity: 'mild' | 'moderate' | 'severe'
      day_of_week: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
      dietary_preference:
        | 'vegetarian'
        | 'eggetarian'
        | 'non_vegetarian'
        | 'vegan'
        | 'pescatarian'
        | 'other'
      equipment_type: 'full_gym' | 'home_gym' | 'minimal' | 'bodyweight_only' | 'dumbbells_only'
      fitness_level: 'beginner' | 'intermediate' | 'advanced'
      gender_type: 'male' | 'female' | 'other' | 'prefer_not_to_say'
      goal_type:
        | 'fat_loss'
        | 'muscle_gain'
        | 'body_recomposition'
        | 'strength'
        | 'endurance'
        | 'maintenance'
        | 'general_fitness'
      injury_body_part:
        | 'knees'
        | 'wrists'
        | 'lower_back'
        | 'upper_back'
        | 'shoulders'
        | 'hips'
        | 'ankles'
        | 'neck'
        | 'elbows'
        | 'hamstrings'
        | 'quads'
        | 'calves'
      injury_status: 'current' | 'recovering' | 'history'
      workout_type: 'workout' | 'liss' | 'hiit' | 'rest' | 'mobility'
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
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
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
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
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
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
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- generated boilerplate; this schema has no composite types, so `keyof DefaultSchema['CompositeTypes']` is always `never`
      keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
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
      chronic_condition_type: [
        'hypertension',
        'type2_diabetes',
        'hypothyroidism',
        'pcos',
        'asthma',
        'osteoarthritis',
        'osteoporosis',
        'heart_condition',
        'chronic_lower_back_pain',
        'obesity',
        'other',
      ],
      condition_severity: ['mild', 'moderate', 'severe'],
      day_of_week: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      dietary_preference: [
        'vegetarian',
        'eggetarian',
        'non_vegetarian',
        'vegan',
        'pescatarian',
        'other',
      ],
      equipment_type: ['full_gym', 'home_gym', 'minimal', 'bodyweight_only', 'dumbbells_only'],
      fitness_level: ['beginner', 'intermediate', 'advanced'],
      gender_type: ['male', 'female', 'other', 'prefer_not_to_say'],
      goal_type: [
        'fat_loss',
        'muscle_gain',
        'body_recomposition',
        'strength',
        'endurance',
        'maintenance',
        'general_fitness',
      ],
      injury_body_part: [
        'knees',
        'wrists',
        'lower_back',
        'upper_back',
        'shoulders',
        'hips',
        'ankles',
        'neck',
        'elbows',
        'hamstrings',
        'quads',
        'calves',
      ],
      injury_status: ['current', 'recovering', 'history'],
      workout_type: ['workout', 'liss', 'hiit', 'rest', 'mobility'],
    },
  },
} as const
