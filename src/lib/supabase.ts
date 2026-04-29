import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://ivhjhsxzavgghclibiae.supabase.co"
const supabaseKey = "sb_publishable_J_kCRK3itrQfyENf2vNn8g_I-1F1ORE"

export const supabase = createClient(supabaseUrl, supabaseKey)