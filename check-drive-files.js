const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mmnulqhurqohukuobusj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnVscWh1cnFvaHVrdW9idXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA4MDYxNiwiZXhwIjoyMDcwNjU2NjE2fQ.04G9dGPJh587IfIFQxdHX8vOB1azHbuSj-RzeZr2jI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDriveFiles() {
  try {
    console.log('检查drive_files表...')
    const { data, error } = await supabase
      .from('drive_files')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('drive_files表不存在或出错:', error)
    } else {
      console.log('drive_files表存在，数据:', data)
    }
  } catch (err) {
    console.error('检查失败:', err)
  }
}

checkDriveFiles()
