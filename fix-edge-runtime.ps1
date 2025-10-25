# 批量修复 Edge Runtime 问题
$files = @(
    "app/api/profile/me/route.ts",
    "app/api/profile/create/route.ts",
    "app/api/notifications/route.ts",
    "app/api/profile/update/route.ts",
    "app/api/admin/files/approve/route.ts",
    "app/api/files/batch-delete/route.ts",
    "app/api/admin/change-role/route.ts",
    "app/api/profile/avatar/route.ts",
    "app/api/storage-requests/review/route.ts",
    "app/api/storage-requests/route.ts",
    "app/api/super-admin/storage/route.ts",
    "app/api/admin/storage/route.ts",
    "app/api/admin/users/route.ts",
    "app/api/admin/announcements/route.ts",
    "app/api/drive/batch-delete/route.ts",
    "app/api/drive/[id]/route.ts",
    "app/api/drive/user-files/route.ts",
    "app/api/drive/upload/route.ts",
    "app/api/files/[id]/route.ts",
    "app/api/messages/history/route.ts",
    "app/api/admin/delete-user/route.ts",
    "app/api/profile/delete-auth/route.ts",
    "app/api/files/search/route.ts",
    "app/api/messages/conversations/route.ts",
    "app/api/files/user-files/route.ts",
    "app/api/files/public/route.ts",
    "app/api/messages/search-users/route.ts",
    "app/api/upload/route.ts",
    "app/api/messages/send/route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "export const runtime = 'edge'") {
            $newContent = $content -replace "export const runtime = 'edge'", "// export const runtime = 'edge' // 临时禁用 Edge Runtime 解决 Supabase 兼容性问题"
            Set-Content $file $newContent -NoNewline
            Write-Host "Fixed: $file"
        }
    }
}

Write-Host "All files processed!"
