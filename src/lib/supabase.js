import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sibajiipwduomikejftf.supabase.co";
const supabaseKey = "sb_publishable_2Hpl1N4rqWl6Wu-DjzajMg_Y5uKp4gJ";

export const supabase = createClient(supabaseUrl, supabaseKey);