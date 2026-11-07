export function DieButtonArt({
  sides,
  enabled,
  reducedMotion,
}: {
  sides: 6 | 20;
  enabled: boolean;
  reducedMotion: boolean;
}) {
  return (
    <img
      className="die-button-icon"
      alt=""
      src={
        enabled && !reducedMotion
          ? `/assets/dados/D${sides}.gif`
          : `/assets/dados/generated/d${sides}.png`
      }
    />
  );
}
