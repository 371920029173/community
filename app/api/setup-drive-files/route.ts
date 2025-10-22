import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'


export async function POST(request: NextRequest) {
  try {
    // 检查表是否存在
    const { data: tableCheck, error: tableCheckError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'drive_files')
      .single()

    if (tableCheckError || !tableCheck) {
      console.log('drive_files table does not exist')
      return NextResponse.json({ 
        success: false, 
        error: 'drive_files 表不存在，请手动执行 create-drive-files-table.sql 脚本',
        needsManualSetup: true
      }, { status: 200 })
    } else {
      console.log('drive_files table already exists.')
      return NextResponse.json({ success: true, message: 'Drive files table already exists.' })
    }
  } catch (error: any) {
    console.error('Error in setup-drive-files API:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
