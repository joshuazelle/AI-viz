<script lang="ts">
  import { completionArraySchema, type Completions, type Split } from "./data"

  let input = $state<Partial<Completions>>({})
  const { onChange }: { onChange: (completions: Completions) => void } =
    $props()

  const handleInput = (type: Split) => async (event: Event) => {
    const files = (event.target as HTMLInputElement).files

    if (!files || files.length !== 1) input[type] = undefined

    const file = files!.item(0)
    const json = JSON.parse(await file!.text())

    const result = completionArraySchema.safeParse(json["completions"])
    //console.log(json["completions"])
    //console.log(result.error)
    //console.log(result)
    if (!result.success) {
      // invalid data
      return
    }

    input[type] = result.data

    if (!(input.baseline && input.ablated)) return // did not set both

    onChange(input as Completions)
  }
</script>

{#snippet inputField(type: Split)}
  <label
    class={[
      "block cursor-pointer rounded-lg border border-dashed border-gray-400 bg-gray-50 p-8 transition select-none hover:border-gray-600 hover:bg-gray-100",
      input[type] && "border-green-500 bg-green-100",
    ]}
    for={type}
    >Completion evaluations for <span
      class={["font-bold", input[type] && "text-green-800"]}>{type}</span
    > model...</label
  >
  <input
    type="file"
    class="hidden"
    accept=".json"
    id={type}
    onchange={handleInput(type)}
  />
{/snippet}

<div class="grid h-full w-full place-items-center">
  <div class="space-y-4">
    <div class="w-full text-center">
      Please drop the two evaluation files to continue:
    </div>

    {@render inputField("baseline")}
    {@render inputField("ablated")}
  </div>
</div>
