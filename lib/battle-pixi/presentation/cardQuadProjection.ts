export type CardQuad = readonly [number, number, number, number, number, number, number, number];
export function cardQuadCenter(q: CardQuad) { return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 }; }
export function interpolateCardQuad(a: CardQuad, b: CardQuad, progress: number): CardQuad {
  return a.map((n, i) => n + (b[i] - n) * progress) as unknown as CardQuad;
}
/** Project a natural image rectangle onto a table/holder quad, preserving the
 * same four corners that Pixi's PerspectiveMesh receives at the handoff. */
export function cardQuadCssMatrix(q: CardQuad, width = 132, height = 198) {
  const [x0,y0,x1,y1,x2,y2,x3,y3] = q;
  const dx1=x1-x2, dx2=x3-x2, dx3=x0-x1+x2-x3;
  const dy1=y1-y2, dy2=y3-y2, dy3=y0-y1+y2-y3;
  const determinant=dx1*dy2-dx2*dy1;
  const g=Math.abs(determinant)>1e-9 ? (dx3*dy2-dx2*dy3)/determinant : 0;
  const h=Math.abs(determinant)>1e-9 ? (dx1*dy3-dx3*dy1)/determinant : 0;
  return `matrix3d(${[(x1-x0+g*x1)/width,(y1-y0+g*y1)/width,0,g/width,
    (x3-x0+h*x3)/height,(y3-y0+h*y3)/height,0,h/height,0,0,1,0,x0,y0,0,1].join(",")})`;
}
