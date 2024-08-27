<template lang="pug">
.audio-controller
  audio(ref="audioPlayer" loop)
    source(src="/pixel-dreams.mp3" type="audio/mpeg")
  u-button.p-8(
    :ui="{ rounded: 'rounded-none' }"
    to="https://github.com/Pwntus/exquisite-corpse-ai"
    target="_new"
    icon="i-heroicons-code-bracket"
    variant="ghost"
    size="xl"
    square
  )
  u-button.p-8(
    @click="toggleAudio"
    :icon="isPlaying ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'"
    :ui="{ rounded: 'rounded-none' }"
    variant="ghost"
    size="xl"
    square
  )
</template>

<script>
export default {
  name: 'AudioController',
  data: () => ({
    isPlaying: false
  }),
  methods: {
    toggleAudio() {
      if (this.isPlaying) {
        this.$refs.audioPlayer.pause()
      } else {
        this.$refs.audioPlayer.play()
      }
      this.isPlaying = !this.isPlaying
    }
  }
}
</script>

<style lang="stylus" scoped>
.audio-controller
  position fixed
  bottom 20px
  right 20px
</style>
