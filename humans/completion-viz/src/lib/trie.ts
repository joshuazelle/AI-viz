import {
    splits,
    type Completion,
    type Completions,
    type Safety,
    type Split,
} from "./data"

type Stats = {
    total: number
    refused: number
    unsafe: number
    controversial: number
}

const createEmptyStats = (): Stats => ({
    total: 0,
    refused: 0,
    unsafe: 0,
    controversial: 0,
})

export type TrieNode = {
    id: string
    words: string[]
    depth: number
    stats: Record<Split, Stats>
    children: Map<string, TrieNode>
}

export const node = (id: string, words: string[], depth: number): TrieNode => ({
    id,
    words,
    depth,
    stats: { baseline: createEmptyStats(), ablated: createEmptyStats() },
    children: new Map(),
})

const update = (stats: Stats, with_: Completion) => {
    if (with_.guard.safety === "unsafe") stats.unsafe++
    if (with_.guard.safety === "controversial") stats.controversial++
    if (with_.guard.wasRefused) stats.refused++

    stats.total++
}

export const build = (completions: Completions) => {
    const root = node("", [], 0)

    splits.forEach((split) => {
        completions[split].forEach((compl) => {
            let curr = root
            update(root.stats[split], compl) // update root stats once
            splitAndNormalize(compl.response).forEach((w, i) => {
                let next = curr.children.get(w)

                if (!next) {
                    // no node with that word yet
                    next = node(curr.id + "_*.._" + w, [w], curr.depth + 1) // likely no collisions
                    curr.children.set(w, next)
                }

                curr = next
                update(curr.stats[split], compl) // update stats for "next" node
            })
        })
    })

    // we now have single word children, but we now want to merge them (if a node has just one child, then we can merge the two)
    mergeChildChains(root)

    return root
}

const mergeChildChains = (node: TrieNode) => {
    node.children.forEach((c) => mergeChildChains(c)) // first merge children, this way we merge from bottom to top

    if (node.depth === 0) return // do not merge root
    if (node.children.size !== 1) return // do not merge if we have more than 1 child (or 0, but that can not happen here)

    const [child] = node.children.values()

    // bug fix: if some responses end at a node, but some other response has same text and continues, we cannot merge either, e.g. "I cannot help." vs "I cannot help with this." in node "I cannot help" we cannot merge "I cannot help with this" back in here e;se we would "lose" the response "I cannot help." in the stats/falsely attribute
    if (
        child.stats.baseline.total + child.stats.ablated.total !==
        node.stats.baseline.total + node.stats.ablated.total
    )
        return

    node.words.push(...child.words)
    node.id = child.id
    node.children = child.children
}

// found on the internet
const EDGE = /^[\s*_~`#>\-+:.,;!?]+|[\s*_~`#>\-+:.,;!?]+$/g

const splitAndNormalize = (s: string) => {
    return s
        .split(/\s+/)
        .map((w) => w.toLowerCase().replace(EDGE, ""))
        .filter((v) => v)
}
