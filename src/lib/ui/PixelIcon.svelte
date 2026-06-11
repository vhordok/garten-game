<script lang="ts">
  import { spriteSize, spriteUrl } from './pixel/render'

  let { name, scale = 2, alt = '' }: { name: string; scale?: number; alt?: string } = $props()

  const size = $derived(spriteSize(name))
</script>

<img
  class="px"
  src={spriteUrl(name)}
  width={size.w * scale}
  height={size.h * scale}
  {alt}
  aria-hidden={alt === ''}
  draggable="false"
/>
