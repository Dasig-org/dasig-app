/** A design screen from the app's mockups (apps/bayanihan/design), in a phone frame. */
export function Phone({ src, alt, tilt = 0, width = 260 }: { src: string; alt: string; tilt?: number; width?: number }) {
  return <figure className="phone" style={{ width, transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
    <img src={`/screens/${src}.webp`} alt={alt} loading="lazy" width={width} height={Math.round(width * 2.166)} />
  </figure>;
}

/** Two or three screens side by side, with an honest caption: these are design previews. */
export function Phones({ items, caption = "Design previews. Names and places are made up." }: { items: { src: string; alt: string }[]; caption?: string }) {
  return <div className="phones-wrap">
    <div className="phones">{items.map((x, i) => <Phone key={x.src} {...x} tilt={items.length === 3 ? [-2, 0, 2][i] : 0} />)}</div>
    <p className="caption">{caption}</p>
  </div>;
}
