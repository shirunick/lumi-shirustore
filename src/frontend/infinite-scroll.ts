export function observeLoadMore(opts: {
  root: Element
  sentinel: Element
  onLoadMore: () => void
}): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) opts.onLoadMore()
      }
    },
    {
      root: opts.root,
      rootMargin: '240px 0px',
      threshold: 0,
    },
  )
  observer.observe(opts.sentinel)
  return () => observer.disconnect()
}
