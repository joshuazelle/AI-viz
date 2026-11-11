<script lang="ts">
    import "./app.css"
    import type { Completions } from "./lib/data"
    import Tree from "./lib/Tree.svelte"
    import { build, type TrieNode } from "./lib/trie"
    import UploadForm from "./lib/UploadForm.svelte"

    let completions = $state<Completions>()
    let trie = $state<TrieNode>()
</script>

<main class="h-dvh w-dvw">
    {#if !completions}
        <UploadForm
            onChange={(c) => {
                completions = c
                trie = build(completions)
            }}
        />
    {/if}

    {#if trie}
        <Tree trie={trie!} />
    {/if}
</main>
