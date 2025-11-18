<script>
    import { onMount } from "svelte";

    const { icon, color } = $props();

    let imageDataURLPortrait = $state(undefined);
    let imageDataURLLandscape = $state(undefined);

    onMount(() => {
        if (typeof icon !== "string" || icon.length === 0) {
            throw new Error("Invalid icon URL provided");
        }

        const iOSDevice = !!navigator.platform.match(/iPhone|iPod|iPad/);

        if (!iOSDevice) {
            return;
        }

        // Calculate the device's width and height
        const deviceWidth = screen.width;
        const deviceHeight = screen.height;
        // Calculate the pixel ratio
        const pixelRatio = window.devicePixelRatio || 1;
        // Create two canvases and get their contexts to draw landscape and portrait splash screens.
        const canvas = document.createElement("canvas");
        const canvas2 = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const ctx2 = canvas2.getContext("2d");

        // Create an image element for the icon
        const iconImage = new Image();

        iconImage.onerror = function () {
            throw new Error("Failed to load icon image");
        };

        iconImage.src = icon;
        // Load the icon image, make sure it is served from the same domain (ideal size 512pxX512px). If not then set the proper CORS headers on the image and uncomment the next line.
        //iconImage.crossOrigin="anonymous"
        iconImage.onload = function () {
            // Calculate the icon size based on the device's pixel ratio
            const defaultSize = (deviceWidth / 4) * pixelRatio;
            const iconSizew = iconImage.width / (3 / pixelRatio) || defaultSize;
            const iconSizeh =
                iconImage.height / (3 / pixelRatio) || defaultSize;

            canvas.width = deviceWidth * pixelRatio;
            canvas2.height = canvas.width;
            canvas.height = deviceHeight * pixelRatio;
            canvas2.width = canvas.height;
            ctx.fillStyle = color;
            ctx2.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx2.fillRect(0, 0, canvas2.width, canvas2.height);

            // Calculate the position to center the icon
            const x = (canvas.width - iconSizew) / 2;
            const y = (canvas.height - iconSizeh) / 2;
            const x2 = (canvas2.width - iconSizew) / 2;
            const y2 = (canvas2.height - iconSizeh) / 2;
            // Draw the icon with the calculated size
            ctx.drawImage(iconImage, x, y, iconSizew, iconSizeh);
            ctx2.drawImage(iconImage, x2, y2, iconSizew, iconSizeh);
            imageDataURLPortrait = canvas.toDataURL("image/png");
            imageDataURLLandscape = canvas2.toDataURL("image/png");
        };
    });
</script>

<svelte:head>
    {#if imageDataURLPortrait}
        <link
            rel="apple-touch-startup-image"
            media="screen and (orientation: portrait)"
            href={imageDataURLPortrait}
        />
    {/if}
    {#if imageDataURLLandscape}
        <link
            rel="apple-touch-startup-image"
            media="screen and (orientation: landscape)"
            href={imageDataURLLandscape}
        />
    {/if}
</svelte:head>
