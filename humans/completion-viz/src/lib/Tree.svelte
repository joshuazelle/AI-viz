<script lang="ts">
    import {
        hierarchy,
        tree,
        linkHorizontal,
        scaleLinear,
        scaleSqrt,
        select,
        zoom,
        zoomIdentity,
    } from "d3"
    import type { HierarchyPointLink, HierarchyPointNode } from "d3"
    import { SvelteSet } from "svelte/reactivity"
    import type { Split } from "./data"
    import type { TrieNode } from "./trie"

    let { trie }: { trie: TrieNode } = $props()

    // COLORS taken from matplotlib defaults as thez look reasonably good
    const BASELINE_COLOR = "#1F77B4" // blue
    const NEUTRAL_COLOR = "#808080" // grey
    const ABLATED_COLOR = "#FF7F0E" // orange

    // SETTINGS
    const MAX_LABEL_WORDS = 8 // for safety we cut long chains at 8 words
    const ROW_HEIGHT = 28
    const COLUMN_WIDTH = 180

    // sum a statistic for a given node (over baseline and ablated)
    const sumStat = (
        node: TrieNode,
        key: "unsafe" | "controversial" | "total",
    ) => node.stats.ablated[key] + node.stats.baseline[key]

    // compute a percentage of as "harmful" classified responses that hit the given node (controversial cases weigh half, as they might/might not be harmful as well)
    function computeHarmfulShare(node: TrieNode) {
        const total = sumStat(node, "total")
        if (total === 0) return 0
        return (
            (sumStat(node, "unsafe") + 0.5 * sumStat(node, "controversial")) /
            total
        )
    }

    // share of responses coming from ablated model that go through this node
    function computeAblatedShare(node: TrieNode) {
        return (
            node.stats.ablated.total /
            (node.stats.ablated.total + node.stats.baseline.total)
        )
    }

    // allow nodes to be opemned/closed so the screen is not completely overflowing
    const expanded = new SvelteSet<string>([trie.id]) // always open root

    function toggle(node: TrieNode) {
        if (node === trie) return // cannot close root
        if (node.children.size === 0) return
        if (expanded.has(node.id)) {
            expanded.delete(node.id)
        } else {
            expanded.add(node.id)
        }
    }

    // get children sorted by count
    function sortedChildren(node: TrieNode) {
        const children = [...node.children.values()]
        children.sort((a, b) => sumStat(b, "total") - sumStat(a, "total"))
        return children
    }

    // only open nodes show their children
    function visibleChildren(node: TrieNode) {
        if (!expanded.has(node.id)) return null
        const children = sortedChildren(node)
        if (node === trie) {
            return children.filter((c) => sumStat(c, "total") > 2) // for root, only show nodes that have at least three children, else it is too much
        }
        return children
    }

    // recompute layout automatically
    const layout = $derived.by(() => {
        const root = hierarchy(trie, visibleChildren)
        return tree<TrieNode>().nodeSize([ROW_HEIGHT, COLUMN_WIDTH])(root)
    })

    // base font size on number of responses in a node
    const fontSize = $derived(
        scaleSqrt()
            .domain([1, sumStat(trie, "total")]) // should scale from 1000 to 1
            .range([10, 40])
            .clamp(true),
    )

    // base node color (=text color) on the share of ablated responses in this node
    const splitColor = scaleLinear<string>()
        .domain([0, 0.5, 1])
        .range([BASELINE_COLOR, NEUTRAL_COLOR, ABLATED_COLOR])

    const drawLink = linkHorizontal<
        HierarchyPointLink<TrieNode>,
        HierarchyPointNode<TrieNode>
    >() // with this we can grow ltr instead of top to bottom
        .x((point) => point.y)
        .y((point) => point.x)

    // label to be displayed
    const getLabel = (node: TrieNode) => {
        let words = node.words
        if (words.length > MAX_LABEL_WORDS) {
            words = [...words.slice(0, MAX_LABEL_WORDS), "..."] // truncate if too long, also a safety measure
        }
        return (words.join(" ") || "*") + `(${sumStat(node, "total")})` // show num of responses inside
    }

    // zooming
    let transform = $state(zoomIdentity)

    function zoomable(svg: SVGSVGElement) {
        const zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                transform = event.transform
            })

        const startPosition = zoomIdentity.translate(40, svg.clientHeight / 2)

        select(svg)
            .call(zoomBehavior)
            .call(zoomBehavior.transform, startPosition)

        return {
            destroy: () => select(svg).on(".zoom", null),
        }
    }
</script>

<div class="relative h-full w-full">
    <svg use:zoomable class="h-full w-full cursor-grab">
        <!-- zoom transform -->
        <g transform={transform.toString()}>
            <!-- draw links -->
            {#each layout.links() as link (link.target.data.id)}
                <path
                    d={drawLink(link)}
                    fill="none"
                    stroke="#d4d4d8"
                    stroke-width={Math.max(
                        1,
                        fontSize(sumStat(link.target.data, "total")) / 5,
                    )}
                />
            {/each}

            <!-- draw nodes -->
            {#each layout.descendants() as point (point.data.id)}
                {@const node = point.data}
                <g
                    class="node"
                    style="transform: translate({point.y}px, {point.x}px)"
                    role="button"
                    tabindex="0"
                    onclick={() => toggle(node)}
                    onkeydown={(event) => event.key === "Enter" && toggle(node)}
                >
                    <title>
                        {node.stats.baseline.total} baseline / {node.stats
                            .ablated.total} ablated /
                        {(100 * computeHarmfulShare(node)).toFixed(0)}% unsafe
                    </title>
                    <text
                        dy="0.35em"
                        font-size={fontSize(sumStat(node, "total"))}
                        fill={splitColor(computeAblatedShare(node))}
                    >
                        {getLabel(node)}
                    </text>
                </g>
            {/each}
        </g>
    </svg>

    <!-- legend -->
    <legend
        class="absolute right-4 bottom-4 border border-gray-200 p-4 text-xs"
    >
        <div
            class="h-2 w-full"
            style="background: linear-gradient(to right, {BASELINE_COLOR}, {NEUTRAL_COLOR}, {ABLATED_COLOR})"
        ></div>
        <div class="mt-1 flex justify-between">
            <span style="color: {BASELINE_COLOR}">baseline</span>
            <span>both</span>
            <span style="color: {ABLATED_COLOR}">ablated</span>
        </div>
        <div class="mt-2">
            Text size is proportional to the number of responses
        </div>
    </legend>
</div>

<style>
    .node {
        cursor: pointer;
        transition: transform 300ms ease;
    }
    text {
        /* white outline so links behind the text don't cut through it */
        paint-order: stroke;
        stroke: white;
        stroke-width: 4px;
        stroke-linejoin: round;
    }
</style>
