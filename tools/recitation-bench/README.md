# Recitation bench

Feeds real qari recordings, ayah by ayah, through the same recognition setup as `src/main.ts`:
the same model, corpus, engine config, structural rules, expected-passage window, 0.48 s chunks
and the app's own checks (`checkFinishedAyah`, the ayah-order gate, and the look-alike omission filter).

Audio and word timings come from quran.com (EveryAyah recordings): Alafasy, Husary, Minshawi (murattal)
and Sudais. Each target ayah B is played as A, B, C. The variants are clean, an accepted phrase
restart, a dropped word, a word swapped for one from another ayah, a repeated word, the last two
words dropped, a skipped ayah, and ayahs in the wrong order.

```
node fetch.mjs && node dl.mjs                    # segments + 16 kHz audio (~400 MB)
node cases.mjs                                   # cases.json
node run.mjs v5 '{"slipHead":false,"app":true}' dev 7   # dev | held | all, 7 workers
node run.mjs base '{}' dev 7                     # the previous app setup
node score.mjs base v5
```

`fp.mjs NAME` lists false flags on clean takes and `det.mjs NAME` lists which rule found each mistake.
`one.mjs CASE_ID` prints the event stream for a single clip.
