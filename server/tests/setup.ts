// Set test env vars before any module import
process.env.JWT_SECRET = "test-secret-32-chars-minimum-ok";
process.env.AUTH_USERNAME = "leandrin";
process.env.AUTH_PASSWORD = "c0r31n1122";
// Leave SUPABASE_* unset — plugin stub handles it gracefully
