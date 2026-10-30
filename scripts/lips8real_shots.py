# "Cold Lips" v8 as a realistic film: every shot of the cartoon (src/lips8-sched.ts, the same clock and the same voice takes) generated with LTX-2.5 MSR Ref Distilled 22B, the people and the café held by the
# reference photos of scripts/lips8real-refs.py. Talking shots get their slice of the cartoon's voice track as the soundtrack (the mouths follow it); the other shots make their own sound.
#   node scripts/lips8-cues.mts                                   (scratch/cues.json: the voice takes on the reel's clock)
#   E:/Wan2GP/env_uv/Scripts/python.exe -I scripts/lips8real_shots.py [key[:seed] ...]     -> out/lips8-real/shots/<key>.mp4  (all missing gens without arguments)
# A gen covers one or more cartoon shots: `a0` is where its clip starts on the reel's clock; scripts/lips8real-cut.py cuts the shots out of it. MSR refs go background first (WanGP moves it last),
# so in the prompts Image 1..n are the people in the order given and the café is the last image.
import json, math, shutil, subprocess, sys, time
from pathlib import Path
import numpy as np
ROOT = Path(r"E:\getphantom-toons")
REFS = ROOT / "out" / "lips8-real" / "refs"
OUT = ROOT / "out" / "lips8-real"
FPS, SR = 24, 48000
REF = {"customer": REFS / "customer-11.png", "denise": REFS / "denise-11.png", "todd": REFS / "todd-11.png", "counter": REFS / "bg-counter-11.png", "room": REFS / "bg-room-12.png"}
LOOK = "Cinematic, realistic vertical phone-camera footage, natural skin texture, warm morning light. "
CUST = "the woman from Image 1, in her early 50s, with a sharp golden blonde bob with bangs, black sunglasses pushed up on her head, pearl earrings and a beige trench coat buttoned to the neck,"
DEN = "a tired woman in her early 40s with a messy brown bun, a grey hoodie and a bright green apron"
TODD = "a chubby, sweaty man in his mid 30s with thinning light brown hair, a white short-sleeved shirt and a red tie"
WET = "thin streaks of light brown coffee run down her face and drip from her chin, her skin wet and shiny"
CUP = "an empty white paper coffee cup sits upside down on top of her head like a hat"
QUIET = "no speech, no music."
# key, the cartoon shots it covers, a0 (clip start on the reel's clock), a1 (the end it must reach), refs (background first, or no background), voice (True: the slice of the voice track is the soundtrack), prompt
GENS = [
  # seed 7 of the first wording ("over-the-shoulder shot from right behind the woman ... her arm whips forward") put the cup in the barista's own hands and left the woman out of the frame
  ("throw", ["throw"], 0.0, 0.40, ["counter", "customer", "denise"], False,
   "Shot from behind the woman from Image 1 at the counter of the coffee shop from Image 3. The back of her head fills the left side of the foreground: a sharp golden blonde bob with black sunglasses pushed up on top, "
   f"and the shoulder of her beige trench coat. Facing her across the counter stands the barista from Image 2, {DEN}, her hands empty. The woman's right arm swings forward from the foreground holding a paper cup "
   "and throws the hot coffee across the counter: a big wave of coffee flies through the air and splashes into the barista's face. Drops spatter toward the lens and the camera shakes. "
   f"Sound: a fast whoosh and a loud wet splash, {QUIET}"),
  # seed 7 of "She is soaked: thin streaks ... She stands frozen mid-blink" left her face dry and dropped a mug with a picture on it onto her head
  ("soaked", ["soaked"], 0.40, 0.93, ["counter", "denise"], False,
   f"Close-up of the barista from Image 1, {DEN}, behind the counter of the coffee shop from Image 2, right after a cup of coffee was thrown in her face. She is drenched: her face, her hair and her hoodie "
   "are soaking wet with coffee, wet strands of hair stuck to her forehead, light brown coffee running down her cheeks and dripping off her chin and nose, her skin shiny. She stands frozen with her eyes shut, "
   "then slowly opens them, completely still. An empty plain white paper coffee cup falls from above and lands upside down on top of her head, sitting there like a little hat. "
   f"Sound: coffee dripping onto the counter and a soft plop as the cup lands, {QUIET}"),
  # seed 7 of "She screams straight at the camera" spent the first second looking down at the phone on the counter: the hook's first scream came late
  ("tooHot", ["tooHot", "hotClose", "postJab"], 0.85, 3.50, ["room", "customer"], True,
   f"Close-up of {CUST} standing at the counter of the coffee shop from Image 2, facing the camera, her phone already in her hand. From the very first frame she is screaming in fury straight at the camera, "
   "her face flushed deep red, a vein bulging on her forehead, her sunglasses knocked crooked: \"Too hot!\" Her whole head shakes. Then she thrusts the phone right at the lens, the glowing screen filling the "
   "foreground, and shrieks, \"I'm leaving a bad review!\" In the handbag on her arm a tiny tan chihuahua bares its teeth. The camera pushes in fast. Sound: her furious shrieking voice, cafe room tone."),
  ("vault", ["vault"], 3.50, 4.30, ["counter", "todd"], False,
   f"Low-angle shot from the customer side of the counter of the coffee shop from Image 2. The manager from Image 1, {TODD}, vaults over the wooden counter toward the camera in one desperate leap, arms flailing, "
   f"and lands hard on his knees in a puddle of spilled coffee on the floor, coffee splashing up around him. Sound: a whoosh, a heavy thud and a wet splash, {QUIET}"),
  ("shoe", ["shoe"], 4.30, 5.07, ["todd"], False,
   "Extreme close-up on the floor of a coffee shop: a woman's black leather flat shoe with one brown drop of coffee on the toe. The manager from Image 1, a chubby man with a red tie, kneels beside it and frantically "
   f"scrubs the drop off the shoe with the end of his red necktie, his hands shaking. Sound: fast frantic scrubbing, {QUIET}"),
  ("didAny", ["didAny"], 4.45, 6.37, ["counter", "todd"], True,
   f"High-angle close-up looking down at the manager from Image 1, {TODD}, kneeling on the wet floor in front of the counter of the coffee shop from Image 2. He looks up at the camera in total panic, sweat on his forehead, "
   "and shrieks, voice cracking, \"Ma'am!\" Then, eyes wide and hands clasped, \"Did any get on you?\" Sound: his hysterical high-pitched voice, cafe room tone."),
  ("money", ["money"], 6.30, 8.83, ["room", "customer"], True,
   f"Close-up of {CUST} standing at the counter of the coffee shop from Image 2. The red has drained from her face; she is ice-cold and perfectly still. She looks straight at the camera and says slowly, in a flat, "
   "cold voice, \"I want my money back.\" She does not blink. Sound: her calm, icy voice, quiet cafe room tone."),
  ("bill", ["bill"], 8.83, 9.20, ["customer", "todd"], False,
   "Extreme close-up over a wooden coffee shop counter: the woman from Image 1 holds out her open palm, her beige trench coat sleeve at the wrist. The chubby hand of the man from Image 2 slaps a crumpled dollar bill "
   f"into her palm. Sound: a sharp slap, {QUIET}"),
  ("myTip", ["myTip"], 9.15, 10.50, ["room", "customer"], True,
   f"Close-up of {CUST} holding a crumpled dollar bill at the counter of the coffee shop from Image 2. Without looking at the money she raises one eyebrow and says coldly, \"And my tip.\" "
   "Sound: her cold, pointed voice, quiet cafe room tone."),
  ("didntTip", ["didntTip"], 10.45, 11.97, ["counter", "denise"], True,
   f"Close-up of the barista from Image 1, {DEN}, behind the counter of the coffee shop from Image 2. Her face is still wet: {WET}. {CUP[0].upper() + CUP[1:]}. One of her eyes twitches. "
   "She says flatly, through gritted teeth, \"You didn't tip.\" Sound: her flat, restrained voice, coffee dripping, cafe room tone."),
  ("inMyHead", ["inMyHead"], 11.90, 14.47, ["room", "customer"], True,
   f"{CUST[0].upper() + CUST[1:]} leans slowly over the counter of the coffee shop from Image 2 toward the camera until her face fills the frame. The camera slowly pushes in. She whispers, smug and slow, \"I tipped...\" "
   "She pauses, holding the stare, then finishes in a whisper, \"in my head.\" Sound: her soft, smug whisper, quiet cafe room tone."),
  ("jar", ["jar"], 14.40, 15.50, ["counter", "todd", "customer"], True,
   f"Medium two-shot at the counter of the coffee shop from Image 3. The manager from Image 1, {TODD}, frantically shoves a big glass tip jar full of coins and dollar bills into the arms of the woman from Image 2, "
   "the blonde woman with the sharp bob, the sunglasses on her head and the beige trench coat. He shouts with desperate eagerness, \"Take Denise's!\" Coins jingle in the jar. Sound: his frantic, loud voice, coins rattling."),
  ("betterHome", ["betterHome"], 15.45, 17.43, ["room", "customer"], True,
   f"Close-up of {CUST} clutching a glass tip jar full of coins against her chest at the counter of the coffee shop from Image 2. She glances down at the jar, then looks back at the camera with disdain and says, "
   "condescending, \"I make better coffee at home.\" Sound: her disdainful voice, cafe room tone."),
  ("vein", ["vein"], 17.43, 17.97, ["counter", "denise"], False,
   f"Extreme close-up of the barista from Image 1, {DEN}, behind the counter of the coffee shop from Image 2. Coffee streaks her face and {CUP}. She is silently boiling with rage: a vein throbs on her forehead, "
   f"her jaw clenches, and the paper cup on her head starts to tremble and rattle. Sound: a low throbbing pulse and the rattle of the paper cup, {QUIET}"),
  ("whyHere", ["whyHere"], 17.90, 19.77, ["counter", "denise"], True,
   f"Close-up of the barista from Image 1, {DEN}, behind the counter of the coffee shop from Image 2. Coffee streaks her face and {CUP}. She explodes, screaming at the camera with all her strength, "
   "\"Then why are you here?!\" As she screams, the paper cup shoots straight up off her head like a cork. Sound: her furious shouting voice, a pop as the cup flies off."),
  ("turnPost", ["turnPost"], 19.77, 20.23, ["room", "customer"], False,
   f"Close-up of {CUST} at the counter of the coffee shop from Image 2, a tiny tan chihuahua in the handbag on her arm. Slowly, together, the woman and the chihuahua turn their heads to stare at the camera with "
   f"the same cold glare. Her thumb hovers over her phone. Sound: tense silence, a low dramatic sting, {QUIET}"),
  ("hands", ["hands"], 20.20, 22.40, ["counter", "todd", "denise"], True,
   f"Medium shot at the counter of the coffee shop from Image 3. The manager from Image 1, {TODD}, lunges across the counter and slaps both hands over the mouth of the barista from Image 2, the tired woman with the "
   "messy brown bun, the coffee-streaked face, the grey hoodie and the green apron. Holding her mouth shut, he turns his face to the camera and shrieks in a cracking falsetto, \"Ma'am!\" Then, even higher, \"Anything!\" "
   "The barista's eyes bulge above his hands. Sound: his shrill falsetto shriek, cafe room tone."),
  ("anything", ["anythingQ", "rubFeet"], 22.35, 25.10, ["room", "customer"], True,
   f"Close-up of {CUST} at the counter of the coffee shop from Image 2. A thin, satisfied smile spreads across her face. She asks slowly, \"Anything?\" She pauses for a beat, savoring it, then says with a smug smile, "
   "\"Then rub my feet.\" Sound: her slow, smug voice, cafe room tone."),
  ("foot", ["foot"], 25.10, 25.60, ["counter", "denise"], False,
   f"Close-up of the barista from Image 1, {DEN}, her face streaked with coffee, behind the counter of the coffee shop from Image 2. A woman's bare foot swings up into the frame from below and slaps down flat on the wooden "
   f"counter right in front of the barista's face, its toes wiggling an inch from her nose. The barista recoils in disgust. Sound: a loud slap of the bare foot on the wood, {QUIET}"),
  ("rub", ["rub"], 25.60, 26.50, ["counter", "todd"], False,
   f"Close-up of a woman's bare foot resting on the wooden counter of the coffee shop from Image 2. The manager from Image 1, {TODD}, rubs the sole of the foot with both hands as fast as he can, like he is trying to "
   f"start a fire, his hands a blur, sweat flying off his forehead. Thin smoke curls up from the sole. Sound: a rising squeal of friction and his hard breathing, {QUIET}"),
  ("melt", ["melt"], 26.15, 27.70, ["room", "customer"], True,
   f"Close-up of {CUST} at the counter of the coffee shop from Image 2. She melts with pleasure: her eyes roll back, her shoulders drop, her mouth falls open and she lets out a long, blissful groan, \"Ohhh.\" "
   "In the handbag on her arm the tiny tan chihuahua kicks one back leg fast. Sound: her long blissful groan, cafe room tone."),
  ("twitch", ["twitch"], 27.70, 28.20, ["counter", "denise"], False,
   f"Close-up of the barista from Image 1, {DEN}, behind the counter of the coffee shop from Image 2, staring at something in front of her in silent disbelief. Coffee drips from her chin. One of her eyes twitches. "
   f"Sound: coffee dripping, {QUIET}"),
  ("coldHands", ["coldHands"], 28.15, 29.67, ["room", "customer"], True,
   f"Close-up of {CUST} at the counter of the coffee shop from Image 2. Thin smoke curls up past her face. Her blissful face snaps back to a flat, cold, unimpressed stare. She says flatly, \"Cold hands.\" "
   "Sound: her flat, final voice, cafe room tone."),
  ("morning", ["morning"], 31.23, 32.13, ["counter", "denise", "todd"], False,
   f"Medium shot of the counter of the coffee shop from Image 3 early the next morning, cool dawn light. Behind the counter stands the barista from Image 1, {DEN}, now wearing blue swimming goggles over her eyes. "
   "Next to her the manager from Image 2, the chubby man in the white shirt and red tie, blasts his own hands with a pink hair dryer. The front door bangs open off-screen and they both stiffen. "
   f"Sound: a door banging open, a door bell jingling, the roar of the hair dryer, {QUIET}"),
  ("usual", ["usual"], 32.10, 33.37, ["room", "customer"], True,
   f"Close-up of {CUST} standing at the counter of the coffee shop from Image 2 in the early morning light, first in line again. She says flatly, as if nothing happened, \"The usual.\" "
   "Sound: her flat voice, a quiet morning cafe."),
  ("slide", ["slide"], 33.37, 33.87, ["counter", "denise"], False,
   "Close-up on the wooden counter of the coffee shop from Image 2: the hand of the barista from Image 1, in a grey hoodie sleeve, slides a steaming white paper cup of coffee across the counter toward the camera. "
   f"Sound: the cup sliding across the wood, {QUIET}"),
  ("sip", ["sip"], 33.87, 34.63, ["room", "customer"], False,
   f"Close-up of {CUST} at the counter of the coffee shop from Image 2. She takes a sip from a white paper coffee cup. Instantly her face flushes deep red with rage, her eyes go wide and a vein bulges on her forehead. "
   f"Sound: a loud slurp, then a sharp gasp, {QUIET}"),
  ("windup", ["windup"], 34.63, 35.33, ["counter", "customer", "denise"], False,
   "Shot from behind the woman from Image 1 at the counter of the coffee shop from Image 3. The back of her head fills the left side of the foreground: a golden blonde bob with black sunglasses on top, and the "
   "shoulder of her beige trench coat. Facing her across the counter stands the barista from Image 2, wearing blue swimming goggles, her hands empty. The woman's right arm, holding a paper coffee cup, pulls back "
   f"past the camera, winding up to throw. The barista flinches and squeezes her eyes shut behind the goggles. Sound: a sharp whoosh, {QUIET}"),
]
BG = {"counter", "room"}


def frames_for(sec):  # LTX: 8k+1 frames, at least 17
    return max(17, 8 * math.ceil((math.ceil(sec * FPS) - 1) / 8) + 1)


def voice_track():  # the 14 takes where the cartoon has them (scratch/cues.json from scripts/lips8-cues.mts), mono 48 kHz
    sys.path.insert(0, str(ROOT / "scripts"))
    from audiolib import decode
    cues = json.load(open(ROOT / "scratch" / "cues.json", encoding="utf-8"))
    mix = np.zeros(int((cues["total"] + 2) * SR), dtype=np.float32)
    for v in cues["voices"]:
        x = decode(str(ROOT / "public" / v["file"]), SR)
        i = int(round(v["at"] * SR))
        mix[i:i + len(x)] += x
    return mix


if __name__ == "__main__":
    sys.path.insert(0, r"E:\Wan2GP")
    from shared.api import init
    (OUT / "shots").mkdir(parents=True, exist_ok=True); (OUT / "audio").mkdir(parents=True, exist_ok=True)
    want = {a.partition(":")[0]: int(a.partition(":")[2] or 7) for a in sys.argv[1:]}
    todo = [g for g in GENS if g[0] in want] if want else [g for g in GENS if not (OUT / "shots" / f"{g[0]}.mp4").exists()]
    voice = voice_track()
    session = init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])
    for key, _, a0, a1, refs, talks, prompt in todo:
        n = frames_for(a1 - a0 + 0.1)
        s = session.get_default_settings("ltx2_25_22B_msr")
        s.update({"prompt": LOOK + prompt, "resolution": "704x1280", "video_length": n, "seed": want.get(key, 7), "prompt_enhancer": "",
                  "video_prompt_type": "KI" if refs[0] in BG else "I", "image_refs": [str(REF[r]) for r in refs], "remove_background_images_ref": 0})
        if talks:
            wav = OUT / "audio" / f"{key}.wav"
            i = int(round(a0 * SR)); x = voice[i:i + int(round(n / FPS * SR))]
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(wav)], input=x.tobytes(), check=True)
            s.update({"audio_guide": str(wav), "audio_prompt_type": "A"})
        t = time.time()
        r = session.submit_task(s).result()
        print(key, n, "frames", "success", r.success, f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
        for f in r.generated_files: shutil.copy(f, OUT / "shots" / f"{key}.mp4")
