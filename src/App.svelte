<script lang="ts">
  import axios from "axios";
  import { onMount } from "svelte";

  interface CollectionData {
    name: string;
    icons: string[];
    aliases: {
      [key: string]: string;
    };
  }
  interface CollectionsApi {
    [key: string]: CollectionData;
  }
  interface IconGroups {
    [key: string]: string[];
  }
  interface CollectionItem {
    name: string;
    prefix: string;
  }
  const createAxiosInstance = (baseURL: string, params: any) => {
    const instance = axios.create({
      baseURL,
    });
    instance.interceptors.request.use(function (config) {
      config.params = { ...config.params, ...params };
      return config;
    });
    return instance;
  };

  const useAxios = createAxiosInstance("https://api.iconify.design", {});

  let theme = $state("");
  let iconSize = $state(0);
  let searchQuery = $state("");
  let iconList: string[] = $state([]);
  let iconCollections: CollectionItem[] = $state([]);
  let selectedCollections: string[] = $state([]);
  let iconPaths: any = $state({});
  let iconCount = $derived(iconList?.length || 0);
  let iconsPerPage = $state(30);
  let totalPages = $derived(Math.ceil(iconList?.length / iconsPerPage) || 0);
  let loadedPages = $state(1);
  let loading = $state(false);
  let sizeValues = $state([16, 24, 32, 48]);

  const changeIconSize = (size: number) => {
    iconSize = size;
  };
  onMount(async () => {
    // Initial theme from the URL
    const windowUrl = new URL(window.location.href);
    const initialTheme = windowUrl.searchParams.get("theme");
    if (initialTheme) theme = initialTheme;
    // Get icon collections
    const url = `collections`;
    const res: CollectionsApi = await useAxios(url, {});
    if (Object.keys(res.data)?.length) {
      const validKeys = Object.keys(res.data).filter(
        (key) => !res.data[key].hidden
      );
      iconCollections = validKeys.map((prefix) => ({
        name: res.data[prefix].name,
        prefix,
      }));
    }
  });
  // Watch for theme changes
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === "theme") {
      theme = event.data.content;
    }
  };
  // Search for icons based on a query
  const searchIcons = async (query: string, selected: string[]) => {
    if (!query) return;
    const searchLimit = 999;
    let prefix = "";
    if (selected?.length === 1) prefix = `&prefix=${selected.join(",")}`;
    else if (selected?.length > 1) prefix = `&prefixes=${selected.join(",")}`;
    const searchUrl = `search?query=${query}&limit=${searchLimit}${prefix}`;
    const searchResult = await useAxios(searchUrl, {});
    return searchResult.data.icons;
  };
  const groupIcons = (list: string[], selected: string[]) => {
    const groups: IconGroups = {};
    const iconList: string[] = [];
    list.forEach((icon: string) => {
      const [collection, name] = icon.split(":");
      iconList.push(icon);
      if (!groups[collection]) groups[collection] = [];
      groups[collection].push(name);
    });
    return { groups, list: iconList };
  };
  const getIconPaths = async (groups: IconGroups) => {
    const promises = Object.keys(groups).map(async (collection: string) => {
      const url = `/${collection}.json`;
      const icons = groups[collection];
      const params = {
        icons: icons.join(","),
      };
      return useAxios(url, { params });
    });
    const pathList: any = {};
    await Promise.all(promises).then((results) => {
      results.forEach((res: any, index: number) => {
        const collection = Object.keys(groups)[index];
        pathList[collection] = res.data;
      });
    });
    return pathList;
  };

  const handleChangeInput = () => {
    handleSearchIcons();
  };
  const handleSearchIcons = async () => {
    loading = true;
    iconList = [];
    iconPaths = {};
    const allIcons = await searchIcons(searchQuery, selectedCollections);
    if (!allIcons?.length) {
      loading = false;
    } else {
      const { groups: iconGroups, list } = groupIcons(
        allIcons,
        selectedCollections
      );
      iconList = list;
      iconPaths = await getIconPaths(iconGroups);
      loading = false;
      // AÑADE TODOS LOS ICONOS de una collection en un BOARD
      // para saber que colecciones funcionan bien y cuales NO
      // PERO EL PROBLEMA ESTA CLARO:
      // UN SVG CON TAMAÑO PERSONALIZADO, correctamente formado, siempre se inserta en penpot al tamaño de su viewBox
      // se IGNORA el tamaño especificado con los atributos width y height, aunque es reconocido porque se indica en los atributos del SVG importado
      // desde un plugin, se puede aplicar el metodo resize al SVG, pero los strokes no escalan bien
      // desde la interfaz, se pueden modificar los valores de width y height, pero los strokes no escalan bien
      // LA UNICA forma de escalar correctamente un SVG, es con proporcion de escala ENABLED (K) y redimensionando la CAJA contenedora de la SHAPE
      // con el metodo shape.resize y cambiando los valores de width y height en la interfaz, el efecto siempre es el mismo
      // y es el mismo efecto que si se redimensiona la caja de la shape con proporcion de escala DISABLED
      // testeado con varias colecciones de iconos.
      // El comportamiento es el mismo, pegando un SVG en la interfaz, o insertandolo a traves de un plugin (esto descarta que el problema sea la generación del SVG)
      // En FIGMA, el comportamiento es similar, si se desactiva la proporcion de escala, los strokes de un SVG escalan mal
      // pero lo que FIGMA si hace bien, es insertar un SVG con el tamaño indicado en los atributos width y height (pegar un SVG como string en la interfaz)
      //
      // createAllIconsFromList(iconList);
    }
  };
  const createAllIconsFromList = async (list: string[]) => {
    list.forEach((icon) => {
      setTimeout(() => {
        handleClickIcon(icon);
      }, 100);
    });
  };
  const getSVGfromAPI = async (icon: string, size: number | string) => {
    const [collection, name] = icon.split(":");
    const url = `/${collection}/${name}.svg`;
    const params = {
      box: 1,
      height: size,
    };

    const svgRes = await useAxios(url, { params });
    // console.log("svgRes for", icon, size, svgRes.data);
    return svgRes.data;
  };
  const getIconDataCustom = (icon: string): any => {
    const [col, name] = icon.split(":");
    let alias = name;
    // ALIASSES
    const collection = iconPaths[col];
    if (collection?.aliases?.[name]) {
      alias = collection.aliases[name].parent;
    }
    const currentIcon = collection?.icons?.[alias];
    if (!collection || !currentIcon) {
      return "";
    }
    return {
      data: {
        prefix: collection.prefix,
        width: currentIcon?.width || collection.width || 16,
        height: currentIcon?.height || collection.height || 16,
        top: currentIcon?.top || 0,
        left: currentIcon?.left || 0,
      },
      path: currentIcon.body as string,
    };
  };
  const getSvgCustom = (icon: string, size: string = "80%") => {
    const iconData = getIconDataCustom(icon);
    if (!iconData) return null;
    const { data, path } = iconData;
    const svgDimensions = size ? `width="${size}" height="${size}"` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${svgDimensions} viewBox="${data.top} ${data.left} ${data.width} ${data.height}">${path}</svg>`;
    return svg;
  };
  const handleClickIcon = (icon: string) => {
    // const svg = await getSVGfromAPI(icon, "unset");
    const svg = getSvgCustom(icon, iconSize);
    const { data } = getIconDataCustom(icon);
    if (!svg) return;
    const message = {
      type: "create-svg",
      content: svg,
      data: {
        icon,
        size: iconSize,
      },
    };
    parent.postMessage(message, "*");
  };
  const handleSelectCollection = (collection: string) => {
    let newSelected = [...selectedCollections];
    if (newSelected.includes(collection)) {
      newSelected = newSelected.filter((c) => c !== collection);
    } else {
      newSelected.push(collection);
    }
    selectedCollections = newSelected;
    handleSearchIcons();
  };
  const isSelectedCollection = (collection: string) => {
    return selectedCollections.includes(collection);
  };
  let hasMorePages = $derived(loadedPages < totalPages);
  const handleLoadNextPage = () => {
    if (!hasMorePages) return;
    loadedPages++;
  };
  const handleLoadAllPages = () => {
    loadedPages = totalPages;
  };
  let loadedIcons = $derived(
    loadedPages * iconsPerPage > iconList.length
      ? iconList.length
      : loadedPages * iconsPerPage
  );
</script>

<svelte:window onmessage={handleMessage} />
<main data-theme={theme}>
  <label for="search">Search icon</label>
  <input
    bind:value={searchQuery}
    onchange={handleChangeInput}
    id="search"
    type="text"
    placeholder="search"
  />

  {#if iconCollections?.length}
    <small>Collections. Selected {selectedCollections.length}</small>
    <ul class="collection-list">
      {#each iconCollections as col}
        <li
          class:active={isSelectedCollection(col.prefix)}
          onclick={() => handleSelectCollection(col.prefix)}
        >
          {col.name}::{col.prefix}
        </li>
      {/each}
    </ul>
  {/if}

  {#if loading}
    <div>loading ...</div>
  {:else if !searchQuery}
    <div>Write some text to search for icons</div>
  {:else if searchQuery && iconCount}
    <div>{iconCount} results, loaded {loadedIcons}</div>
  {:else}
    <div>No results | Hit return to search</div>
  {/if}

  <!-- <input bind:value={iconSize} type="number" placeholder="size" /> -->
  <div class="button-group">
    {#each sizeValues as size}
      <button
        onclick={() => changeIconSize(size)}
        class:active={iconSize === size}
      >
        {size}
      </button>
    {/each}
    <button onclick={() => changeIconSize(0)} class:active={iconSize === 0}>
      original
    </button>
  </div>
  <small>Some icons are not well resized ?</small>
  <small
    >{totalPages} pages, {iconsPerPage} per page, loaded {loadedPages}</small
  >

  {#if !loading && iconCount}
    <ul class="icon-list">
      {#each iconList.slice(0, loadedIcons) as icon}
        <span class="icon-item" onclick={() => handleClickIcon(icon)}>
          {@html getSvgCustom(icon) ?? "nf"}
        </span>
      {/each}
    </ul>
    {#if hasMorePages}
      <button onclick={handleLoadNextPage}>Load more</button>
      <button onclick={handleLoadAllPages}>Load all</button>
    {/if}
  {/if}
</main>

<style>
  :global {
    .collection-list {
      max-height: 100px;
      overflow-y: auto;
    }
    .icon-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.2rem;
      max-height: 330px;
      overflow-y: auto;
      padding: 0.4rem 0;
    }
    .icon-item {
      opacity: 0.7;
      --icon-size: 32px;
      min-width: var(--icon-size);
      max-width: var(--icon-size);
      min-height: var(--icon-size);
      max-height: var(--icon-size);
      display: flex;
      place-content: center;
      transition: transform 0.2s ease;
    }
    .icon-item:hover {
      opacity: 1;
      cursor: pointer;
      transform: scale(1.3);
    }

    li.active {
      font-weight: 900;
      color: orange;
    }
    .button-group {
      display: flex;
      gap: 0.2rem;
    }
    button.active {
      color: orange;
      font-weight: 900;
    }
  }
</style>
