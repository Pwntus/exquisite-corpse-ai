<template lang="pug">
.flex.flex-col.min-h-screen.justify-center.items-center
  .max-w-4xl.text-center
    h1.text-5xl.font-bold.tracking-tight.text-white.animate-title(
      class="lg:text-8xl"
    ) Exquisite Corpse AI 

    .max-w-lg.my-32.mx-auto

      //- Register
      template(v-if="!waiting")
        input.block.w-full.block.bg-white.text-black.text-3xl.p-8.mb-12(
          v-model="user.username"
          placeholder="What's your name?"
          type="text"
        )
        u-button.p-8.text-3xl(
          @click="joinGame"
          :disabled="!user.username"
          :ui="{ rounded: 'rounded-none' }"
          color="primary"
          variant="solid"
          size="lg"
        ) Join Game

      .text-4xl.font-bold.tracking-tight.text-white(v-else)
        p.mb-12 Welcome, {{ user.username }}
        template(v-if="waiting")
          p Waiting for a match...
        template(v-else-if="opponent")
          p Matched with: {{ opponent.username }}
</template>

<script>
import { v4 as uuidv4 } from 'uuid'

export default {
  name: 'Matchmaking',
  data: () => ({
    user: {
      id: null,
      username: ''
    },
    opponent: null,
    game_id: null,

    channel: null,
    waiting: false,
    loading: false
  }),
  methods: {
    async joinGame() {
      if (!this.user.username) {
        return
      }

      this.user.id = uuidv4()
      this.waiting = true

      await this.joinMatchmakingQueue()
    },
    async joinMatchmakingQueue() {
      const { opponent } = await $fetch('/api/matchmaking', {
        method: 'POST',
        body: { user: this.user }
      })

      // There was already a waiting opponent
      if (opponent) {
        this.opponent = opponent
        this.game_id = opponent.id
        this.waiting = false

        this.$emit('match', {
          user: this.user,
          opponent: this.opponent,
          id: this.game_id
        })
      } else {
        this.channel = this.$supabase.channel('matchmaking')
        this.channel
          .on('broadcast', { event: 'match-found' }, ({ payload }) => {
            if (payload.users.find((user) => user.id === this.user.id)) {
              this.opponent = payload.users.find(
                (user) => user.id !== this.user.id
              )
              this.game_id = this.user.id
              this.waiting = false

              this.$emit('match', {
                user: this.user,
                opponent: this.opponent,
                id: this.game_id
              })
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await this.channel.send({
                type: 'broadcast',
                event: 'user-joined',
                payload: { user: this.user }
              })
            }
          })
      }
    },
    async cleanup() {
      if (this.waiting) {
        await useFetch('/api/cleanup', {
          method: 'POST',
          body: { user: this.user }
        })
      }
    }
  },
  mounted() {
    window.addEventListener('beforeunload', this.cleanup)
  }
}
</script>

<style lang="stylus" scoped>
@keyframes wiggle
  0%, 100%
    transform scale(1) rotate(-4deg)
  50%
    transform scale(1.05) rotate(-2deg)

.animate-title
  animation wiggle 2s ease-in-out infinite
  background-image linear-gradient(45deg, #ff00ff, #00ffff, #ffff00)
  -webkit-background-clip text
  background-clip text
  color transparent
  display inline-block
</style>
