const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

export const config = {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  port: process.env.PORT || 3000,
}