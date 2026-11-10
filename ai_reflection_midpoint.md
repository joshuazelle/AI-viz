# Phase 1 reflections on AI use

Gen AI Team Phase 1 was Joe Dorfman (k12446281) and Joshua Zelle (11922754)

Proud note: this report was written with 0% AI assistance


## How did we use AI?
We first each did some research, also assisted with AI to come up with topic ideas. Then had a meeting to discuss our ideas and chose the present one. Afterwards we studied the paper whose method we wanted to investigate.

We then went looking for datasets and found these refusal benchmarks (also through AI help) and then generated a semi synthetic dataset of 1000 prompts. Semi synthetic because the prompts are taken from existing benchmarks but just we put it in this new collection that has 100 prompts for each harm category. We also have a column of the prompts source in our spreadsheet. For obvious reasons we do not upload that dataset here, especially with the responses. On request we can share it via a safe channel with the instructors.

We then downloaded huggingface qwen3 4b model to our device to run the prompts locally. For the abliterated model we used the authors original github repo to abliterate the exact same model ourselves. For this process we used AI. 

After we obtained the responses we proceeded to do extensive manual inspection: comparing the abliterated vs. base model responses, gauged the level of harm, differences between safe completions and refusals, different level of harmfulness, from cautious discussion to actual step by step guides.

Afterwards we knew that quite an elaborate visualization might be possible with this rich dataset but were not sure which one as we dont have much vizualization experience. For this we then asked AI to give us some options. After rewiewing those we settled for the scrolly telling one. 

Then we prompted AI to code us the scrolly artifact and iterate over it by itself a few times. The prompt can be found in the ai-interactions folder. After 5 iterations we were quite impressed with what it came up with in 30 minutes (Claude Opus 5.5 extra high) and proceeded to review the artifact. 

## Our reflections

We were quite impressed with the visualization that AI could come up with. It was even a great resource for us to learn the material more deeply when we reviewed the artifact. 

We note however that the processes before were crucial to arrive at the final prompt: the 2 group meetings we had, studying the paper together in depth, inspecting the responses manually to get a feel first, thinking about degrees of harmfulness, categorizing prompts etc.

In conclusion, it was a pleasant experience to have this powerful AI assistance to do the actual visualization. We can also see how this would be a slippery slope to just skip the preliminary work and just prompt Claude cold with the whole project and go directly from assignment description to artifact without human intervention. 

Two problems we see with that: Firstly, this would defeat the whole educational purpose of this project. That is because in the preliminary work of understanding the problem, the method, the data, the responses, thinking about degrees of harmfulness, prompt categories etc. is where most of the learning happens. 

Secondly, without going through this preliminary work, reviewing the AI's work effectively would be impossible as one would not have the necessary understanding of the topic and material.





# Phase 2 reflections on AI use

TODO