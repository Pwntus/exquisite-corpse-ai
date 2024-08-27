<template lang="pug">
.flex.flex-col.min-h-screen.justify-center.items-center
  .max-w-4xl.text-center
    h1.text-5xl.font-bold.tracking-tight.text-white.animate-title(
      class="lg:text-8xl"
    ) Game with {{ game.opponent.username }} 

    .max-w-lg.my-32.mx-auto

      template(v-if="images.length < 4")
        .mb-12(
          v-if="image"
          :style="imageStyles"
        )
          img(
            :src="image"
            :style="innerImageStyles"
          )

        template(v-if="my_turn")
          .text-4xl.font-bold.tracking-tight.text-white.mb-12(v-if="!image")
            | Your turn! Start by creating the first image:
          .text-4xl.font-bold.tracking-tight.text-white.mb-12(v-else)
            | Your turn! Describe the next part of the image:
          textarea.block.w-full.block.bg-white.text-black.text-3xl.p-8.mb-12(
            v-model="prompt"
            placeholder="Describe the image..."
            rows="3"
          )
          u-button.p-8.text-3xl(
            @click="createImage"
            :disabled="!prompt || loading"
            :loading="loading"
            :ui="{ rounded: 'rounded-none' }"
            color="primary"
            variant="solid"
            size="lg"
          ) Create Image

        template(v-else)
          .text-4xl.font-bold.tracking-tight.text-white
            | Waiting for {{ game.opponent.username }} to create their part...

      template(v-else)
        .text-4xl.font-bold.tracking-tight.text-white.m-12 Here's the final image!
        img(:src="final_image")
</template>

<script>
const processImage = async (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1344
      canvas.height = 768
      const ctx = canvas.getContext('2d')

      // Get the bottom 150px of the previous image
      const stripHeight = 150
      const numRepeats = Math.ceil(canvas.height / stripHeight)

      // Repeat the strip vertically to fill the entire canvas
      for (let i = 0; i < numRepeats; i++) {
        ctx.drawImage(
          img,
          0,
          img.height - stripHeight,
          1344,
          stripHeight,
          0,
          i * stripHeight,
          1344,
          stripHeight
        )
      }

      // Convert to base64 data URI
      const dataUri = canvas.toDataURL('image/webp')
      resolve(dataUri)
    }
    img.onerror = reject
    img.src = imageUrl
  })
}

const createMask = async () => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1344
    canvas.height = 768
    const ctx = canvas.getContext('2d')

    // Fill the entire canvas with white
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 1344, 768)

    // Fill the top 140px with black
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, 1344, 140)

    // Convert to base64 data URI
    const dataUri = canvas.toDataURL('image/webp')
    resolve(dataUri)
  })
}

const processFinalImage = async (imageUrls) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1344
    // Calculate the height of the final image
    // 768 (full height) + (768 - 150) * n (for the other n images with overlap)
    canvas.height = 768 + (768 - 150) * (imageUrls.length - 1)
    const ctx = canvas.getContext('2d')

    const loadImage = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = url
      })
    }

    Promise.all(imageUrls.map(loadImage))
      .then((images) => {
        images.forEach((img, index) => {
          const yPosition = index * (768 - 150)
          ctx.drawImage(img, 0, yPosition, 1344, 768)
        })

        const dataUri = canvas.toDataURL('image/webp')
        resolve(dataUri)
      })
      .catch(reject)
  })
}

export default {
  name: 'Game',
  props: ['game'],
  data: () => ({
    loading: false,
    channel: null,
    my_turn: false,

    prompt: '',
    images: [],
    final_image: null,

    image: null,
    mask: null
  }),
  computed: {
    imageStyles() {
      return this.my_turn
        ? {
            position: 'relative',
            width: '100%',
            paddingTop: '19.53%', // 150px / 768px ≈ 19.53%
            overflow: 'hidden'
          }
        : {}
    },
    innerImageStyles() {
      return this.my_turn
        ? {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '511.11%', // 100% / 19.53% ≈ 511.11%
            objectFit: 'cover',
            objectPosition: 'top'
          }
        : {}
    }
  },
  methods: {
    async createImage() {
      this.loading = true
      try {
        await $fetch('/api/prediction', {
          method: 'POST',
          body: {
            game: this.game,
            prompt: this.prompt,
            image: this.image,
            mask: this.mask
          }
        })
      } catch (e) {
        console.log('--- (createImage) error:', e.message)
      } finally {
        this.loading = false
      }
    }
  },
  async mounted() {
    this.channel = this.$supabase.channel(`game:${this.game.id}`)

    this.channel
      .on('broadcast', { event: 'image-created' }, async ({ payload }) => {
        this.images.push(payload.output)
        this.my_turn = payload.user.id !== this.game.user.id

        if (this.images.length < 4) {
          // Process for next turn
          this.image = null
          this.image = this.my_turn
            ? await processImage(payload.output)
            : payload.output

          // Produce final image
        } else {
          this.final_image = await processFinalImage(this.images)
        }
      })
      .subscribe()

    // Determine who goes first (e.g., based on ID comparison)
    this.my_turn = this.game.id === this.game.user.id

    // Maks is static and needs to be created only once
    this.mask = await createMask()
  },
  beforeUnmount() {
    if (this.channel) {
      this.$supabase.removeAllChannels()
      this.channel = null
    }
  }
}
</script>

<style lang="stylus" scoped>
@keyframes wiggle
  0%, 100%
    transform scale(1) rotate(4deg)
  50%
    transform scale(1.05) rotate(2deg)

.animate-title
  animation wiggle 2s ease-in-out infinite
  background-image linear-gradient(45deg, #ff00ff, #00ffff, #ffff00)
  -webkit-background-clip text
  background-clip text
  color transparent
  display inline-block
</style>
