<script lang="ts">
  import { onMount } from "svelte";

  import {
    drawImageScaled,
    drawImageNotScaled,
    cleanupCanvas,
  } from "./lib/canvas";

  import { Styles, useColorMode, Input } from "@sveltestrap/sveltestrap";

  import "@shoelace-style/shoelace/dist/themes/light.css";
  import "@shoelace-style/shoelace/dist/themes/dark.css";

  import { setBasePath } from "@shoelace-style/shoelace/dist/utilities/base-path.js";

  // create a build task that copies node_modules/@shoelace-style/shoelace/dist/assets into a public folder in your app
  setBasePath(
    "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.19.1/cdn/"
  );
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import "@shoelace-style/shoelace/dist/components/drawer/drawer.js";
  import "@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.js";

  import type SlDrawer from "@shoelace-style/shoelace/dist/components/drawer/drawer.js";
  import Range from "./components/Range.svelte";
  import Select from "./components/Select.svelte";
  import DrawerMessage from "./components/DrawerMessage.svelte";

  import { type ConverterRunner, createConverter } from "./lib/tracer";
  import { settings as settingsFull } from "./lib/settings";

  type SettingsFull = {
    title?: string;
    description?: string;
    key: string;
    type: string;
    options?: {
      name: string;
      value: string;
      description?: string;
    };
    min?: number;
    max?: number;
    default: number;
  };
  type Settings = {
    [key: string]: number | string;
  };

  let defaultSettings = $derived(
    settingsFull.reduce((ac: Settings, s: SettingsFull) => {
      ac[s.key] = s.default;
      return ac;
    }, {})
  );
  let settings = $state({ ...defaultSettings });
  //
  let optionsDrawer: SlDrawer | null = $state(null);
  //
  let theme = $state("");
  let appIsInPenpot = $state(true);
  let progress = $state(0);
  let canvasElm: HTMLCanvasElement | null = $state(null);
  let canvasScreenElm: HTMLCanvasElement | null = $state(null);
  let canvasLoaded = $state(false);
  let svgLoaded = $derived(progress === 100);
  let isConverting = $derived(progress > 0 && progress < 100);
  let svgIsInPenpot = $state(false);
  let svgIsTravelling = $state(false);
  let svgElm: SVGSVGElement | null = $state(null);
  let image: File | null = $state(null);
  let imageName: string = $state("");
  let converter: ConverterRunner | null = $state(null);
  //
  let canvasW = $state(300);
  let canvasH = $state(430);

  const openOptions = () => {
    if (optionsDrawer) optionsDrawer.show();
  };
  const closeOptions = () => {
    if (optionsDrawer) optionsDrawer.hide();
  };

  $effect(() => {
    if (!canvasElm || !image) return;
    const img = new Image();
    img.src = image instanceof File ? URL.createObjectURL(image) : image;
    img.onload = function () {
      const imageHeight = img.naturalHeight;
      const imageWidth = img.naturalWidth;
      const landscape = imageWidth > imageHeight;
      if (landscape) {
        canvasW = 420;
        canvasH = canvasW * (imageHeight / imageWidth);
      } else {
        canvasH = 430;
        canvasW = canvasH * (imageWidth / imageHeight);
      }
      setTimeout(() => {
        drawImageScaled(img, canvasScreenElm);
        drawImageNotScaled(img, canvasElm, svgElm);
        canvasLoaded = true;
      }, 2);
    };
  });

  onMount(async () => {
    getInitialTheme();
    if (window.location === window.parent.location) {
      appIsInPenpot = false;
    } else {
      appIsInPenpot = true;
    }
  });
  // Initial theme from the URL
  const getInitialTheme = () => {
    const windowUrl = new URL(window.location.href);
    const initialTheme = windowUrl.searchParams.get("theme");
    theme = initialTheme ?? "ligth";
  };
  // Watch for theme changes
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === "theme") {
      theme = event.data.content;
    } else if (event.data.type === "svg-created") {
      svgIsTravelling = false;
      svgIsInPenpot = true;
    }
  };

  $effect(() => {
    if (theme === "dark") {
      useColorMode("dark");
      document.documentElement.classList.add("sl-theme-dark");
    } else {
      useColorMode("light");
      document.documentElement.classList.remove("sl-theme-dark");
    }
  });

  function resetSettings() {
    settings = { ...defaultSettings };
  }

  const handleConvertImage = () => {
    converter = createConverter("canvas", "svg", { ...settings });

    if (!converter) return;
    converter.init();
    converter.run();
    const timer = setInterval(() => {
      progress = converter?.progress ?? 0;
      if (progress === 100) {
        clearInterval(timer);
      }
    }, 50);
  };

  const handleStopConverter = () => {
    if (!converter) return;
    converter.cancel();
    resetSVG();
  };

  const handleSendSVGToPlugin = () => {
    const svgData = svgElm?.outerHTML;
    const message = {
      type: "create-svg",
      content: svgData,
      data: {
        name: `${imageName}:Ktraced`,
      },
    };
    parent.postMessage(message, "*");
    svgIsTravelling = true;
  };
  const handleUploadFile = (event: any) => {
    resetCanvas();
    resetSVG();
    image = event.target.files[0];
    imageName = image?.name ?? "";
  };

  function resetImageInput() {
    const imageImput = document.getElementById(
      "imageInput"
    ) as HTMLInputElement;
    if (imageImput?.value) imageImput.value = "";
    imageName = "";
  }
  function resetSVG() {
    progress = 0;
    svgIsTravelling = false;
    svgIsInPenpot = false;
    if (svgElm) svgElm.innerHTML = "";
  }
  function resetCanvas() {
    progress = 0;
    cleanupCanvas(canvasElm);
    cleanupCanvas(canvasScreenElm);
    canvasLoaded = false;
  }
  function downloadSVG() {
    const filename = imageName.split(".")[0];
    const blob = new Blob([
      new XMLSerializer().serializeToString(svgElm as Node),
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.svg`;
    a.click();
  }
</script>

<Styles />
<svelte:window onmessage={handleMessage} />

<main data-theme={theme}>
  <div class="hstack">
    <Input
      type="file"
      id="imageInput"
      accept="image/jpeg, image/png, image/webp"
      onchange={handleUploadFile}
    />
    <sl-button size="medium" disabled={svgLoaded} onclick={openOptions}>
      <sl-icon slot="prefix" name="sliders"></sl-icon>
      Settings
    </sl-button>
  </div>

  <sl-drawer bind:this={optionsDrawer} label="Settings" contained>
    <div class="vstack options-drawer">
      {#each settingsFull as s}
        {#if s.type === "range"}
          <Range
            label={s.title}
            help={s.description}
            bind:value={settings[s.key]}
            min={s.min}
            max={s.max}
            step={s.step ?? 1}
          />
        {:else if s.type === "select"}
          <Select
            label={s.title}
            help={s.description}
            bind:value={settings[s.key]}
            options={s.options}
          />
        {/if}
      {/each}
      <DrawerMessage />
    </div>
    <div slot="footer">
      <sl-button-group label="Alignment">
        <sl-button size="small" onclick={resetSettings}>
          Reset to defaults
        </sl-button>
        <sl-button size="small" onclick={closeOptions}> Close </sl-button>
      </sl-button-group>
    </div>
  </sl-drawer>

  <div class="hstack end">
    {#if isConverting}
      <sl-button size="medium" variant="danger" onclick={handleStopConverter}>
        <sl-icon slot="prefix" name="caret-right"></sl-icon>
        Cancel
      </sl-button>
    {/if}

    <sl-button-group label="Alignment">
      {#if progress >= 0 && progress < 100}
        <sl-button
          size="medium"
          disabled={!canvasLoaded || isConverting}
          loading={isConverting}
          onclick={handleConvertImage}
        >
          <sl-icon slot="prefix" name="caret-right"></sl-icon>
          Convert
        </sl-button>
      {:else}
        <sl-button size="medium" onclick={resetSVG}>
          <sl-icon slot="prefix" name="trash"></sl-icon>
          Reset
        </sl-button>
      {/if}
      {#if !appIsInPenpot}
        <sl-button size="medium" disabled={!svgLoaded} onclick={downloadSVG}>
          <sl-icon slot="prefix" name="box-arrow-down"></sl-icon>
          Download
        </sl-button>
      {:else}
        <sl-button
          size="medium"
          loading={svgIsTravelling}
          disabled={!svgLoaded || svgIsInPenpot}
          onclick={handleSendSVGToPlugin}
        >
          <sl-icon slot="prefix" name="send"></sl-icon>
          Send to Penpot
        </sl-button>
      {/if}
    </sl-button-group>
  </div>

  <sl-progress-bar value={progress}>{progress}%</sl-progress-bar>

  {#if !canvasLoaded}
    <div class="message-container">
      Create SVGs in seconds! <br /> Upload your image (jpg, png, or webp) and click
      convert.
    </div>
  {/if}

  <div class="converter-container">
    <canvas id="canvas" bind:this={canvasElm}></canvas>
    <canvas
      id="canvas-screen"
      width={canvasW}
      height={canvasH}
      bind:this={canvasScreenElm}
      style={`--canvas-opacity: ${1 - progress / 100};`}
    ></canvas>
    <div class="svg-container">
      <svg
        id="svg"
        bind:this={svgElm}
        width={canvasW}
        height={canvasH}
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      ></svg>
    </div>
  </div>
</main>

<style lang="postcss">
  main {
    position: relative;
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .options-drawer {
    padding: 0 1.2rem;
    gap: 1.2rem;
  }
  .converter-container {
    pointer-events: none;
    position: relative;
    width: 100%;
    min-height: 220px;
    max-height: 440px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow: hidden;
    #canvas {
      position: absolute;
      z-index: -1;
      top: 9999px;
      left: 9999px;
      opacity: 0;
    }
    #canvas-screen {
      position: relative;
      top: 0;
      left: 0;
      z-index: initial;
      transition: opacity 300ms ease-in-out;
      opacity: var(--canvas-opacity, 1);
    }
    .svg-container {
      position: absolute;
      top: 0;
      left: 0;
      z-index: initial;
      display: flex;
      width: 100%;
      justify-content: center;
      align-items: flex-start;
      overflow: hidden;
    }
  }

  :global {
    .hstack {
      width: 100%;
      display: flex;
      gap: 0.8rem;
      align-items: center;
      justify-content: center;
      button {
        flex: 1;
      }
      &.end {
        justify-content: flex-end;
      }
    }
    .vstack {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      align-items: center;
      justify-content: center;
      > * {
        width: 100%;
      }
    }
  }
</style>
