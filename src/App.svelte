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
  let iconSize = $state(24);
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
  onMount(async () => {
    // Initial theme from the URL
    const windowUrl = new URL(window.location.href);
    const initialTheme = windowUrl.searchParams.get("theme");
    if (initialTheme) theme = initialTheme;
    // Get icon collections
    const url = `collections`;
    const res: CollectionsApi = await useAxios(url, {});
    if (Object.entries(res.data)?.length)
      iconCollections = Object.entries(res.data).map(([prefix, col]) => ({
        name: col.name,
        prefix,
      }));
  });
  // Watch for theme changes
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === "theme") {
      theme = event.data.content;
    }
  };
  // Search for icons based on a query
  const searchIcons = async (query: string) => {
    if (!query) return;
    const searchLimit = 999;
    const searchUrl = `search?query=${query}&limit=${searchLimit}`;
    const searchResult = await useAxios(searchUrl, {});
    return searchResult.data.icons;
  };
  const groupIcons = (list: string[], selected: string[]) => {
    const groups: IconGroups = {};
    list.forEach((icon: string) => {
      const [collection, name] = icon.split(":");
      if (!selected?.length || selected.includes(collection)) {
        iconList.push(icon);
        if (!groups[collection]) groups[collection] = [];
        groups[collection].push(name);
      }
    });
    return groups;
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
    const allIcons = await searchIcons(searchQuery);
    if (!allIcons?.length) {
      loading = false;
    } else {
      const iconGroups = groupIcons(allIcons, selectedCollections);
      iconPaths = await getIconPaths(iconGroups);
      loading = false;
    }
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
  const getSvgCustom = (icon: string) => {
    const iconData = getIconDataCustom(icon);
    if (!iconData) return null;
    const { data, path } = iconData;
    const iconSize = "80%";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="${data.top} ${data.left} ${data.width} ${data.height}">${path}</svg>`;
    return svg;
  };
  const handleClickIcon = (icon: string) => {
    const svg = getSvgCustom(icon);
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
    if (selectedCollections.includes(collection)) {
      selectedCollections = selectedCollections.filter((c) => c !== collection);
    } else {
      selectedCollections.push(collection);
    }
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
  <small
    >{totalPages} pages, {iconsPerPage} per page, loaded {loadedPages}</small
  >
  <input bind:value={iconSize} type="number" placeholder="size" />
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
          {col.name}
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
  }
</style>
