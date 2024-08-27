import { createClient } from '@supabase/supabase-js'

export default defineLazyEventHandler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return defineEventHandler(async (event) => {
    try {
      const timeoutMinutes = 30
      const cutoffTime = new Date(
        Date.now() - timeoutMinutes * 60 * 1000
      ).toISOString()

      const { data, error } = await supabase
        .from('waiting_users')
        .delete()
        .lt('created_at', cutoffTime)

      if (error) {
        console.error('Error cleaning up waiting users:', error)
      } else {
        console.log(`Cleaned up ${data.length} inactive waiting users`)
      }
    } catch (e) {
      console.log('--- error (api/cleanup): ', e)

      return {
        error: e.message
      }
    }
  })
})
