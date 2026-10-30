# Test room

Five cheap readers see only the script and answer a few questions. The room shows whether a beat reads and where a viewer would leave. It does not choose the peak. In an early test room the readers ranked "Then turn off the internet." first of five options for the peak, and the owner rejected it (docs/format.md). Use the answers to fix what is unclear, and keep your own taste for what is funny.

## How to run it

- Run it on the screenplay, before any voices, pictures or code. Round 1 on the first full draft, round 2 on the fixed draft, never a third. If the fixes after round 1 are only about reading (a clock nobody could read, a plug nobody saw pulled) and none are about jokes, skip round 2. x20 did.
- Send the five prompts below as five Agent calls in one message, so they run in parallel. Each call has `model: "haiku"`. Each reader is a fresh agent that has never seen the rules, the other readers or an earlier round.
- A reader gets only the script text: sluglines, action paragraphs and dialogue, with the on-screen label as the first line of the first shot. Do not paste the bible, the format rules or the series idea. Do not say which joke is the end joke.
- Fill the `<placeholders>`. `<SCRIPT>` is the screenplay exactly as it stands in the episode doc. `<business type>` is whatever the sketch is about (café, garage door repair, tattoo studio). The fifth reader is a person from the other side of the argument in the sketch.
- The prompts ask for a few sentences in plain words and for quoted lines. Keep that, because long answers bury the one line that matters.
- Once a cut exists, even a rough one, run `$PY_IMG -I scripts/first3-strip.py out/<ep>.mp4 out/<ep>-first3.jpg` and give the strip to the readers too, with the stay-or-swipe question. A strip shows its answer at 2.0 s all at once, and a real scroller is gone by then. A dark or still first second fails whatever the readers say.

## The five prompts

### 1. The owner of the business in the sketch

```
You have owned a <business type> for <N> years. You scroll Reels at night after work. Below is the script of a 25-second cartoon sketch about your kind of business. Read it and answer in a few sentences, in plain words, and quote the lines you mean.

1. Is this your life?
2. Which moment is the most "that's me"?
3. Where did you laugh?
4. Would you send it to another <business type> owner? Why or why not?
5. Say the end joke in one sentence.

<SCRIPT>
```

### 2. The fast scroller

```
You flick through Reels fast and decide in about two seconds whether to stay. Here are the first 3 seconds, as pictures and lines:

<FIRST 3 SECONDS: each picture in one sentence with the line said over it, or the strip image>

Do you stay or swipe? Say why in one or two sentences.

Now read the rest of the script:

<SCRIPT>

Answer in a few sentences, in plain words. At which line would you have swiped? Where did you laugh? Say the end joke in one sentence.
```

### 3. The comedy skeptic

```
You have watched a lot of comedy and you hate hacky material. Read the script of this 25-second sketch and answer in a few sentences, in plain words, quoting the lines you mean.

1. What surprised you?
2. Which jokes have you heard before?
3. Which lines sound like a robot or a marketer wrote them?
4. Say the end joke in one sentence. Does it work?

<SCRIPT>
```

### 4. The literal overthinker

```
You take things literally. Read the script of this 25-second sketch and answer in a few sentences, in plain words, quoting the lines you mean.

1. Where did you think "wait, why would he..."?
2. Where does cause and effect break?
3. What did you not understand?
4. Say the end joke in one sentence.

<SCRIPT>
```

### 5. The other side of the argument

```
<One sentence about who you are, for example "You work from cafés most days with a laptop." or "You have a three-year-old.">

Below is the script of a 25-second sketch that tells a fight from the <business owner's> side. Answer in a few sentences, in plain words, quoting the lines you mean.

1. Does your side get a fair point? Which line or picture is it?
2. What comment would you post under this reel? Write it the way you would type it.
3. Say the end joke in one sentence.

<SCRIPT>
```

The fifth reader checks that the other side gets a fair point, so the comments turn into an argument between two sides. In x19 the parent named "Then you wouldn't understand." as her side's point. In x20 the remote worker named "Who?" with the empty café as his side's one fair point.

## Sum up

Write a short summary and put it in the episode doc as "Test room, round 1" (and "round 2"), the way docs/x19-screen-time.md and docs/x20-one-coffee.md do. Cover these points, using the readers' own words where they are short:

- Landed: the lines and pictures that got laughs or "that's me", and how many readers laughed.
- The end: do all five say the end joke the same way? If they do not, the ending does not read yet.
- Flat: beats with no laugh, and the line where the scroller would swipe.
- Old: jokes the skeptic has heard before. Keep one on purpose if the skeptic laughed anyway.
- Unclear: what the overthinker or the scroller could not follow. Most of these are fixes for the picture or the staging (a readable clock, a plug pulled on screen) and few are fixes for the jokes.
- The other side: the fair point and the comment they would post. Keep it.
- Next version: what changes, and what stays against the room, with the reason.

## Reading the answers

- Count and quote the answers instead of averaging them. When all five agree that something is wrong, fix it. When one reader disagrees, decide yourself.
- A reader who cannot say the end joke has found a real problem. Do not ask the readers to rank jokes or pick the peak: their ranking has not matched the owner's taste.
- Round 2 can make the script worse. In x19, version 2 fixed the logic and dropped the absurd pictures (the usher hat, the light CLICK, the stroller TV), and four of the five readers said it was worse than version 1. Version 3 took the absurd pictures back and kept version 2's logic fixes. Read round 2 for what was lost as well as what was fixed.
- After round 2 the script goes on with a short note on what changed and why. The room's taste does not outrank the owner's.
