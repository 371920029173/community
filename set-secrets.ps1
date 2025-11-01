Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 修改这三处
$PROJECT = "comunity"
$ANON    = @'
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnVscWh1cnFvaHVrdW9idXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODA2MTYsImV4cCI6MjA3MDY1NjYxNn0.qvHmibPkIrKyF0kyax76NCdoPf_PIb4GLzW9eu7JJ1A
'@
$SERVICE = @'
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnVscWh1cnFvaHVrdW9idXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA4MDYxNiwiZXhwIjoyMDcwNjU2NjE2fQ.04G9dGPJh587IfIFQxdHX8vOBu1azhbuSj-RzeZr2jI
'@

# 固定不改
$URL = "https://mmnulqhurqohukuobusj.supabase.co"

Start-Transcript -Path .\cf-pages-secret-and-deploy.log -Force

npx wrangler login

$URL     | npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL      --project-name=$PROJECT  | Tee-Object -FilePath .\secret-url.log
$ANON    | npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name=$PROJECT  | Tee-Object -FilePath .\secret-anon.log
$SERVICE | npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY     --project-name=$PROJECT  | Tee-Object -FilePath .\secret-service.log

npm ci
npm run build:cf
npx wrangler pages deploy .vercel/output/static --project-name=$PROJECT 2>&1 | Tee-Object -FilePath .\deploy.log

node -e "$s='$ANON';console.log('anon length=',s.length)"
node -e "$s='$SERVICE';console.log('service length=',s.length)"

Stop-Transcript
Read-Host '完成。按回车退出'