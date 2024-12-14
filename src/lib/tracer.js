import { BinaryImageConverter, ColorImageConverter } from "vtracer-webapp";

export function setSourceAndRestart(source, canvas, svg) {
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = source instanceof File ? URL.createObjectURL(source) : source;
  img.onload = function () {
    const width = img.naturalWidth,
      height = img.naturalHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.getImageData(0, 0, canvas.width, canvas.height);
  };
}

function deg2rad(deg) {
  return (deg / 180) * 3.141592654;
}

export function restart(canvas, svg) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ctx.drawImage(img, 0, 0);
}

export function createConverter(canvasId, svgId, settings) {
  const s = { ...settings };

  const PARAMS = {
    canvas_id: canvasId,
    svg_id: svgId,
    // clustering: binary, color
    clustering_mode: s.clusteringMode ?? "color",
    // clustering: cutout, stacked
    clustering_hierarchical: s.clusteringHierarchical ?? "stacked",
    hierarchical: s.clusteringHierarchical ?? "stacked",
    // 0-255, Gradient Step (Less layers)
    layer_difference: s.layerDifference ?? 16,
    // 0-16, Path Precision (More digits)
    path_precision: s.pathPrecision ?? 8,
    // Curve Fitting: pixel, polygon, spline, none
    mode: s.mode ?? "spline",
    // (splicevalue) Splice Threshold (Less accurate), 0 - 180
    splice_threshold: deg2rad(s.spliceThreshold ?? 45),
    // (lengthvalue) Mas es mas tosco
    length_threshold: s.lengthThreshold ?? 0.5,
    // Mas hace curvas mas amplias, suaviza las curvas
    corner_threshold: deg2rad(s.cornerThreshold ?? 60),
    // Fixed
    max_iterations: 10,
    // 1 muchisima defincion, 100, hace menos paths
    filter_speckle: (s.filterSpeckle ?? 8) * (s.filterSpeckle ?? 8),
    // 8 es maxima definicion de colores, por debajo de 5,6 no tiene sentido no separa formas
    color_precision: 8 - (s.colorPrecision ?? 6),
  };
  return new ConverterRunner(PARAMS);
}

export class ConverterRunner {
  constructor(params) {
    this.converter =
      params.clustering_mode === "color"
        ? ColorImageConverter.new_with_string(JSON.stringify(params))
        : BinaryImageConverter.new_with_string(JSON.stringify(params));
    this.stopped = false;
    this.progress = 0;
    this.tickTimer = null;
  }
  init() {
    this.converter.init();
  }
  run() {
    setTimeout(this.tick.bind(this), 1);
  }
  stop() {
    this.progress = 0;
    this.stopped = true;
    if (this.converter) this.converter.free();
  }
  cancel() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.stop();
  }

  tick() {
    this.tickTimer = setInterval(() => {
      const done = this.converter.tick();
      this.progress = this.converter.progress();
      if (done) clearInterval(this.tickTimer);
    }, 2);
  }

  tickORIGINAL() {
    if (!this.stopped) {
      let done = false;
      const startTick = performance.now();
      while (
        !(done = this.converter.tick()) &&
        performance.now() - startTick < 25
      ) {}
      this.progress = this.converter.progress();
      if (!done) {
        setTimeout(this.tick.bind(this), 1);
      } else {
        this.stop();
      }
    }
  }
}
