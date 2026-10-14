// Splits text into words for the scroll-driven highlight. Words start grey and
// turn white as the reader scrolls; without JavaScript they are simply white.

export function WordReveal({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <span key={i} className="w" data-word>
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}
