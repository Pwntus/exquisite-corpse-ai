import { createClient } from '@supabase/supabase-js'

export default defineLazyEventHandler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return defineEventHandler(async (event) => {
    try {
      const { user } = await readBody(event)

      // Remove user from waiting list
      const { error } = await supabase
        .from('ec_waiting_users')
        .delete()
        .eq('id', user.id)

      return { success: true }
    } catch (e) {
      console.log('--- error (api/cleanup): ', e)

      return {
        error: e.message
      }
    }
  })
})
