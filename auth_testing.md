# Auth Testing
- Login: POST /api/auth/login {"email":"admin@hakusa.id","password":"HakusaAdmin2026"} -> {token, user}
- Use header Authorization: Bearer <token> for all other /api calls
- GET /api/auth/me returns current user
- No public registration; admin creates users via POST /api/users
- 5 wrong passwords -> 15 min lockout (HTTP 429)
