# The episode's picture from the "shots" list in episodes/<episode>.jsonc, with WanGP (E:/Wan2GP), in three stages:
#   keys   keyframes, Qwen Image 2.1 Turbo with the cast pictures as references   -> scratch/shots/<ep>/key/<id>.png
#   clips  "talk": InfiniteTalk, lips driven by the speaker's own lines in the shot's window; "move": Wan 2.1 i2v 480p
#          (both with the lightx2v 4-step LoRA)                                     -> scratch/shots/<ep>/clip/<id>.mp4
#   edit   clips scaled to 1080x1920 for Remotion, stills copied, plus the edit list -> public/<ep>/shots/, public/<ep>/edit.json
#   qa     the defect check (check() below, Claude API, key ANTHROPIC_API_KEY in .env) on the clips and stills -> scratch/shots/<ep>/qa.json
# E:/Wan2GP/env_uv/Scripts/python.exe scripts/shots.py <episode> keys|clips|edit|qa [--only s01,s02] [--force] [--qa] [--seed-offset 1000]
# A shot whose output exists is skipped, so a crashed run resumes; --force redoes the --only shots. clips --qa checks each new clip
# and remakes a rejected one with another seed (the rejected takes stay as <id>-rejected<k>.mp4).
import json, re, shutil, subprocess, sys, time
from pathlib import Path
import numpy as np, soundfile as sf, librosa

ROOT = Path(__file__).resolve().parent.parent
EP_NAME, STAGE = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
FORCE = "--force" in sys.argv
SEED_OFF = int(sys.argv[sys.argv.index('--seed-offset') + 1]) if '--seed-offset' in sys.argv else 0  # new seeds for a remake
EP = json.loads(re.sub(r'(?m)^\s*//.*$', '', (ROOT / 'episodes' / f'{EP_NAME}.jsonc').read_text(encoding='utf-8')))
T = json.loads((ROOT / 'public' / EP_NAME / 'timings.json').read_text(encoding='utf-8'))
WORK = ROOT / 'scratch' / 'shots' / EP_NAME
KEY, CLIP, AUD = WORK / 'key', WORK / 'clip', WORK / 'audio'
SHOTS = EP['shots']
# an "overlay" end card is laid over the last shot (no black screen at the end: viewers left on it, Insights 10-19), so that shot runs under it
for i, s in enumerate(SHOTS): s['end'] = SHOTS[i + 1]['at'] if i + 1 < len(SHOTS) else EP['end'] + (EP['endcard']['dur'] if EP['endcard'].get('overlay') else 0)
TODO = [s for s in SHOTS if ONLY is None or s['id'] in ONLY]

STYLE = EP.get('style', "Keep each person's exact face, hair and body shape from the reference images, in the same 1990s hand-drawn animated feature film style, painted backgrounds and colors as the references. Vertical frame.")
STYLE0 = EP.get('style0', "A still from a 1990s hand-drawn animated feature film: clean ink outlines, painted backgrounds, warm colors. Vertical frame.")
MOVE_MODEL = EP.get('moveModel', 'i2v')  # "move" shots: Wan 2.1 i2v + lightx2v (episode 2), or e.g. i2v_2_2_Enhanced_Lightning_v2 (its own 4 steps)
LIGHTX2V = "https://huggingface.co/DeepBeepMeep/Wan2.1/resolve/main/loras_accelerators/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors"
FAST = {"activated_loras": [LIGHTX2V], "loras_multipliers": "1", "num_inference_steps": 4, "guidance_phases": 1, "guidance_scale": 1, "alt_guidance_scale": 1, "seed": 7}
n4 = lambda dur, fps: 4 * int(np.ceil(dur * fps / 4)) + 1  # Wan wants 4k+1 frames


def done(out: Path) -> bool:
    return out.exists() and not FORCE


def run(session, sh, settings, out: Path):
    t = time.time()
    r = session.submit_task(settings).result()
    print(sh['id'], sh['kind'], 'ok' if r.success else 'FAIL', f"{time.time() - t:.0f}s", [f"{e.stage}: {e.message}" for e in r.errors], flush=True)
    if r.success and r.generated_files: out.parent.mkdir(parents=True, exist_ok=True); shutil.copy(r.generated_files[0], out)


def voice_tracks(sr=16000):
    # each character's lines alone, at their places on the table read's clock (a talk shot hears only its speaker)
    at = {c['n']: c['at'] for c in T['tableRead']['cues']}
    tracks = {}
    for tk in T['takes']:
        y, _ = librosa.load(ROOT / 'public' / tk['file'], sr=sr, mono=True)
        tr = tracks.setdefault(tk['character'].lower(), np.zeros(int((EP['end'] + 1) * sr), np.float32))
        i = int(round(at[tk['n']] * sr)); tr[i:i + len(y)] += y[:len(tr) - i]
    return tracks, sr


def session_():
    sys.path.insert(0, r"E:\Wan2GP")
    from shared.api import init
    return init(root=Path(r"E:\Wan2GP"), cli_args=["--attention", "sage2", "--profile", "4"])


# ── the defect check: Claude looks at 8 frames of a clip (or the still) next to what the shot should show ──
QA_MODEL, TRIES, NFR = "claude-sonnet-5-5", 3, 8
QA_RULES = """You check one generated shot of an adult 2D cartoon before it goes into an episode. The shot lasts 1-3 seconds
and is watched once on a phone, so judge what a viewer would notice, not what a frame-by-frame review finds.
Blockers (a viewer notices them): a person with an extra, missing or merged hand or arm, or two hands coming out of one sleeve; a face that turns into
another person or melts; hair or clothes that change mid-shot; an object that appears, vanishes or turns into something else (a phone changing colour,
a bare hand turning into a glove, digits changing); effects the shot did not ask for (sparks, electricity, flashes); a mouth that keeps opening and closing
as if talking while nobody on screen has a line (snoring, screaming, gasping are fine when the shot describes them); a sleeping person waking up;
the main action of the shot missing or reversed.
Minor (list them, they do not reject the shot): a pose or expression a little off the description, a static background crowd, small prop details, framing.
Ignore: low resolution, small wobble of lines, the art style itself, a character's eyes being half-closed by design.
Reply with JSON only, at most 4 items per list, at most 15 words each: {"blockers": ["frame N: what is wrong", ...], "minor": [...]}"""


def heard(sh):
    # the lines heard during the shot, as "Name: text"
    at = {c['n']: c for c in T['tableRead']['cues']}
    return [f"{tk['character'].title()}: \"{tk['text']}\"" for tk in T['takes'] if at[tk['n']]['speech'][0] < sh['end'] and at[tk['n']]['speech'][1] > sh['at']]


def check(sh, path: Path) -> dict:
    import base64, urllib.request
    if path.suffix == '.mp4':
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout)
        vf = f"fps={NFR / dur:.4f},scale=240:-1,tile={NFR}x1"
        what = f"The image shows {NFR} frames of the clip in order, left to right (frame 1 to {NFR})."
    else:
        vf, what = "scale=480:-1", "The image is the still frame itself."
    jpg = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", vf, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "3", "-"], capture_output=True, check=True).stdout
    lines = heard(sh)
    talk = f"{sh['who'].title()} is the one talking on screen; their lips should move." if sh['kind'] == 'talk' else "Nobody on screen speaks unless one of the lines above is theirs."
    shot = f"Shot {sh['id']} ({sh['kind']}). It should show: {sh['key']}\nMotion: {sh.get('move', 'none, a still')}\nLines heard during the shot: {'; '.join(lines) or 'none'}. {talk}\n{what}"
    key = re.search(r'^ANTHROPIC_API_KEY=(.+)$', (ROOT / '.env').read_text(encoding='utf-8').replace('\0', ''), re.M).group(1).strip()
    body = {"model": QA_MODEL, "max_tokens": 1500, "system": QA_RULES, "messages": [{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(jpg).decode()}}, {"type": "text", "text": shot}]}]}
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", json.dumps(body).encode(), {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    try:
        txt = next(b['text'] for b in json.loads(urllib.request.urlopen(req, timeout=120).read())['content'] if b['type'] == 'text')
        v = json.loads(txt[txt.find('{'):txt.rfind('}') + 1]); v['ok'] = not v.get('blockers')
    except Exception as e:  # a failed check never blocks the run; the shot is kept and marked unchecked
        v = {"ok": True, "blockers": [], "minor": [f"unchecked: {type(e).__name__}: {str(e)[:120]} | reply: {locals().get('txt', '')[:300]!r}"]}
    print(sh['id'], 'QA', 'pass' if v['ok'] else 'REJECT', '; '.join(v.get('blockers', [])), '| minor:', '; '.join(v.get('minor', [])), flush=True)
    log = WORK / 'qa.json'
    allv = json.loads(log.read_text(encoding='utf-8')) if log.exists() else {}
    allv[sh['id']] = {**v, "file": path.name, "checked": time.strftime('%Y-%m-%d %H:%M:%S')}
    log.write_text(json.dumps(allv, indent=1, ensure_ascii=False), encoding='utf-8')
    return v


if STAGE == 'keys':
    S = session_()
    for sh in TODO:
        out = KEY / f"{sh['id']}.png"
        if done(out): continue
        refs = [str(ROOT / EP['refs'][r]) for r in sh.get('refs', [])]
        s = S.get_default_settings("qwen_image_21_turbo_7B")
        s.update({"prompt": f"{sh['key']} {STYLE if refs else STYLE0}", "resolution": "768x1344", "seed": sh.get('seed', 7)})
        if refs: s.update({"video_prompt_type": "I", "image_refs": refs})
        run(S, sh, s, out)

elif STAGE == 'clips':
    # --qa: each new clip goes through check(); a rejected one is made again with another seed, up to TRIES times in all
    tracks, sr = voice_tracks()
    S = session_()
    QA = '--qa' in sys.argv
    for sh in TODO:
        out = CLIP / f"{sh['id']}.mp4"
        if sh['kind'] == 'still' or done(out): continue
        dur = sh['end'] - sh['at']
        if sh['kind'] in ('talk', 'hold'):
            # "hold" = a face that must not talk (Phantom, whose lines are thoughts; a silent reaction): InfiniteTalk driven by silence keeps
            # the mouth shut and still blinks, glances and moves ears and tails, where Wan i2v makes silent mouths talk (tested 10-19, docs/production.md)
            AUD.mkdir(parents=True, exist_ok=True)
            wav = AUD / f"{sh['id']}.wav"
            n = int(dur * sr)
            sf.write(wav, tracks[sh['who']][int(sh['at'] * sr):int(sh['at'] * sr) + n] if sh['kind'] == 'talk' else np.zeros(n, np.float32), sr)
            s = S.get_default_settings("infinitetalk")
            s.update({**FAST, "prompt": f"2d hand-drawn cartoon, {sh['move']}, static camera", "image_prompt_type": "", "image_refs": [str(KEY / f"{sh['id']}.png")],
                      "audio_prompt_type": "A", "audio_guide": str(wav), "audio_guidance_scale": 1, "resolution": "480x832", "video_length": n4(dur, 25)})
        else:
            s = S.get_default_settings(MOVE_MODEL)
            s.update({**(FAST if MOVE_MODEL == 'i2v' else {}), "prompt": f"2d hand-drawn cartoon, {sh['move']}", "image_prompt_type": "S", "image_start": str(KEY / f"{sh['id']}.png"),
                      "resolution": "480x832", "video_length": n4(dur + 0.25, 16)})
        for k in range(TRIES if QA else 1):
            s['seed'] = sh.get('seed', 7) + SEED_OFF + 100 * k
            run(S, sh, s, out)
            if not QA or not out.exists(): break
            v = check(sh, out)
            if v['ok']: break
            if k + 1 < TRIES: shutil.copy(out, CLIP / f"{sh['id']}-rejected{k}.mp4")

elif STAGE == 'qa':
    for sh in TODO: check(sh, KEY / f"{sh['id']}.png" if sh['kind'] == 'still' else CLIP / f"{sh['id']}.mp4")

elif STAGE == 'edit':
    PUB = ROOT / 'public' / EP_NAME / 'shots'
    PUB.mkdir(parents=True, exist_ok=True)
    edit = []
    QAV = json.loads((WORK / 'qa.json').read_text(encoding='utf-8')) if (WORK / 'qa.json').exists() else {}
    for sh in SHOTS:
        if sh['kind'] in ('move', 'hold') and QAV.get(sh['id'], {}).get('ok') is False and QAV[sh['id']].get('file', '').endswith('.mp4'):
            print(sh['id'], 'rejected by the check, used as a still:', '; '.join(QAV[sh['id']].get('blockers', [])))
            sh = {**sh, 'kind': 'still'}
        if sh['kind'] == 'still':
            src = f"{EP_NAME}/shots/{sh['id']}.png"; shutil.copy(KEY / f"{sh['id']}.png", ROOT / 'public' / src)
        else:
            src = f"{EP_NAME}/shots/{sh['id']}.mp4"
            dst, raw = ROOT / 'public' / src, CLIP / f"{sh['id']}.mp4"
            if FORCE or not dst.exists() or dst.stat().st_mtime < raw.stat().st_mtime:  # a remade clip replaces its old copy
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(CLIP / f"{sh['id']}.mp4"), "-an", "-vf",
                                "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=5:5:0.5",
                                "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", str(ROOT / 'public' / src)], check=True)
        edit.append({"id": sh['id'], "kind": sh['kind'], "at": sh['at'], "end": sh['end'], "src": src, **({"fx": sh['fx']} if 'fx' in sh else {})})  # fx "buzz": the still shakes
    (ROOT / 'public' / EP_NAME / 'edit.json').write_text(json.dumps({"shots": edit, "stamps": EP['stamps'], "endcard": EP['endcard'], "end": EP['end']}, indent=1), encoding='utf-8')
    # the sound for scripts/mix.py: the lines and the table read's sounds where the table read has them, each at its own level
    at = {c['n']: c['at'] for c in T['tableRead']['cues']}
    placed = T['tableRead']['sfx']
    assert [s['sfx'] for s in EP['tableSfx']] == [p['sfx'] for p in placed]
    cues = {"total": EP['end'] + EP['endcard']['dur'], "endcard": EP['end'], "voices": [{"file": tk['file'], "at": at[tk['n']], "who": tk['character'].lower(), "first": tk['words'][0]['t'], "end": tk['end'],
                       "text": ' '.join(w['d'] for w in tk['words'] if not w.get('bleep'))} for tk in T['takes']],  # text without the bleeped words, for stt-lines.py
            "cues": [{"name": s['sfx'], "at": p['at'], "db": s.get('gain', 0.0)} for s, p in zip(EP['tableSfx'], placed)]}
    (ROOT / 'scratch' / f'cues-{EP_NAME}.json').write_text(json.dumps(cues, indent=1), encoding='utf-8')
    print('edit', len(edit), 'shots; cues', len(cues['cues']))
