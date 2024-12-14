export function drawImageNotScaled(img: any, canvas: any, svg: any) {
  const ctx = canvas.getContext("2d");
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

export function drawImageScaled(img: any, canvas: any) {
  const ctx = canvas.getContext("2d");
  var hRatio = canvas.width / img.width;
  var vRatio = canvas.height / img.height;
  var ratio = Math.min(hRatio, vRatio);
  var centerShift_x = (canvas.width - img.width * ratio) / 2;
  var centerShift_y = (canvas.height - img.height * ratio) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    centerShift_x,
    centerShift_y,
    img.width * ratio,
    img.height * ratio
  );
}

export function isCanvasBlank(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  return !ctx
    .getImageData(0, 0, canvas.width, canvas.height)
    .data.some((channel) => channel !== 0);
}

export function cleanupCanvas(canvas: HTMLCanvasElement | null) {
  if (canvas && !isCanvasBlank(canvas)) {
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
