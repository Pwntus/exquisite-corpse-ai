import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'

export default defineLazyEventHandler(async () => {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return defineEventHandler(async (event) => {
    try {
      const { game, prompt, image, mask } = await readBody(event)

      if (!game || !prompt) {
        throw new Error('missing data')
      }

      let output = null

      // Inpainting
      if (image) {
        const result = await replicate.run(
          'zsxkib/flux-dev-inpainting:ca8350ff748d56b3ebbd5a12bd3436c2214262a4ff8619de9890ecc41751a008',
          {
            input: {
              mask,
              image,
              prompt,
              width: 1344,
              height: 768
            }
          }
        )
        output = result[0]

        // First image
      } else {
        const result = await replicate.run('black-forest-labs/flux-schnell', {
          input: { prompt, aspect_ratio: '16:9' }
        })
        output = result[0]
      }

      // Notify matched users
      const channel = supabase.channel(`game:${game.id}`)
      await channel.send({
        type: 'broadcast',
        event: 'image-created',
        payload: {
          output,
          user: game.user
        }
      })
    } catch (e) {
      console.log('--- error (api/prediction): ', e)

      return {
        error: e.message
      }
    }
  })
})
