// 测试消息保存功能
// 在浏览器控制台中运行

async function testMessageSave() {
  try {
    console.log('开始测试消息保存功能...')
    
    // 1. 测试发送消息API
    const testMessage = {
      conversationId: null,
      otherUserId: 'test-user-id',
      content: '测试消息 - ' + new Date().toISOString(),
      messageType: 'text',
      receiverId: 'test-user-id'
    }
    
    const response = await fetch('/api/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session?.access_token
      },
      body: JSON.stringify(testMessage)
    })
    
    const result = await response.json()
    console.log('发送消息结果:', result)
    
    if (result.success) {
      console.log('✅ 消息发送成功')
      
      // 2. 测试获取消息历史
      const historyResponse = await fetch(`/api/messages/history?conversationId=${result.data.conversation_id}`)
      const historyResult = await historyResponse.json()
      console.log('获取消息历史结果:', historyResult)
      
      if (historyResult.success) {
        console.log('✅ 消息历史获取成功')
        console.log('消息数量:', historyResult.data.length)
      } else {
        console.log('❌ 消息历史获取失败:', historyResult.error)
      }
    } else {
      console.log('❌ 消息发送失败:', result.error)
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error)
  }
}

// 运行测试
testMessageSave()

