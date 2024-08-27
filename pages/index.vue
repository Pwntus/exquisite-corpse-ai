<template lang="pug">
.bg-black.min-h-screen
  audio-controller

  //- Register
  matchmaking(
    v-if="!game"
    @match="onMatchedGame"
  )

  game(
    v-else
    :game="game"
  )
</template>

<script>
export default {
  name: 'index',
  data: () => ({
    game: null
  }),
  methods: {
    onMatchedGame(game) {
      this.game = game
    }
  }
}
</script>

<style lang="stylus" scoped></style>
