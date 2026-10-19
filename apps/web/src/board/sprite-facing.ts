// GIFs have uneven transparent margins. Keep the artwork's anchor on the
// logical tile when the texture is mirrored around its full canvas.
export function facingOriginX(sourceOriginX: number, facingLeft: boolean) {
  return facingLeft ? 1 - sourceOriginX : sourceOriginX;
}
