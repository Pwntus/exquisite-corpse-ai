import { createClient } from '@supabase/supabase-js'

export default defineLazyEventHandler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return defineEventHandler(async (event) => {
    try {
      const { user } = await readBody(event)

      // Get waiting users
      const { data: waiting_users } = await supabase
        .from('ec_waiting_users')
        .select('id, username')

      // Add user to waiting list
      if (waiting_users.length <= 0) {
        const foo = await supabase.from('ec_waiting_users').insert(user)
        return { opponent: false }
      }

      // Match with the first waiting user
      const opponent = waiting_users[0]

      // Remove opponent user from waiting list
      await supabase.from('ec_waiting_users').delete().eq('id', opponent.id)

      // Notify players
      const channel = supabase.channel('matchmaking')
      await channel.send({
        type: 'broadcast',
        event: 'match-found',
        payload: {
          users: [user, opponent]
        }
      })

      return { opponent }
    } catch (e) {
      console.log('--- error (api/matchmaking): ', e)

      return {
        error: e.message
      }
    }
  })
})
