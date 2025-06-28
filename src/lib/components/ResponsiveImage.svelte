<script lang="ts">
  interface Props {
    name: string;
    alt: string;
    sizes: string;
    class?: string;
  }

  let { name, alt, sizes, class: className = '' }: Props = $props();

  const breakpoints = [320, 640, 1024];
  const srcset = breakpoints.map((bp) => `/images/${name}-${bp}.webp ${bp}w`).join(', ');
</script>

<img src="/images/{name}-320.webp" {srcset} {sizes} {alt} class={className} />
